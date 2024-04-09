const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {log, logDebug} = require('../../../utils/log.js');
const oracledb = require('oracledb');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('flowercredit')
		.setDescription('all flower social credit related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('adds social credit score, admin-only')
                .addNumberOption(option => 
                    option
                        .setName('social_credit')
                        .setDescription('the amount you want to increase by')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('person_name')
                        .setDescription('name to edit their score'))
                        .setRequired(true)
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, shown by default')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('sets social credit score, admin-only')
                .addNumberOption(option => 
                    option
                        .setName('social_credit')
                        .setDescription('the amount you want to')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('person_name')
                        .setDescription('name to edit their score'))
                        .setRequired(true)
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, shown by default')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('remove social credit score, admin-only')
                .addNumberOption(option => 
                    option
                        .setName('social_credit')
                        .setDescription('the amount you want to decrease by')
                        .setRequired(true))
                .addStringOption(option => 
                    option
                        .setName('person_name')
                        .setDescription('name to edit their score'))
                        .setRequired(true)
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, shown by default')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('get')
                .setDescription('gets your or someone elses social credit score')
                .addStringOption(option => 
                    option
                        .setName('person_name')
                        .setDescription('name to get their score, will show self if blank'))
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, hidden by default')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('ranking')
                .setDescription('shows the ranking for social credit')
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, hidden by default')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('fullreset')
                .setDescription('resets everyones social credit to 0, admin only')),
	async execute(interaction) {
            switch(interaction.options.getSubcommand()){
                case 'add':
                    //addCreditScore(interaction, true);
                    break;
                case 'remove':
                    //addCreditScore(interaction, false);
                    break;
                case 'set':
                    flowercreditSet(interaction);
                    break;
                case 'get':
                    flowercreditGet(interaction);
                    break;
                case 'ranking': //TODO
                    break;
                case 'fullreset': //TODO
                    break;
                default:
                    interaction.reply({content:'What subcommand did you even try?', ephemeral: true});
            }
	},
};

/**
 * Async boolean check against database for admin perm
 * @param {*} interaction 
 * @param {*} connection 
 * @returns 
 */
async function isAdmin(interaction, connection){
    try{
        // check if user is admin
        let adminFlag = await connection.execute(
            `SELECT admin
            FROM discord_accounts
            WHERE discord_id=:0`,
            [interaction.member.id],
            {}
        );
        if(!adminFlag.rows || !adminFlag.rows.length > 0 || !adminFlag.rows[0][0]){
            interaction.reply({content: `You aren't an admin, you can't do that FlowerFool`, ephemeral: true});
            return false;
        }
        return true;
    }
    catch(error){
        logDebug(interaction.client, error);
    }
}

/**
 * Returns a credit score corresponding to an id from database
 * @param {*} dbLogin 
 * @param {*} targetId 
 * @returns 
 */
async function getCreditScore(dbLogin, targetId, connection){
    let newConnection = false;
    if(!connection){
        connection = await oracledb.getConnection(dbLogin);
        newConnection = true;
    }
        
    if(targetId)
        targetId = targetId.replace(/[^0-9]/g, '');

    try{
        logDebug(interaction.client, `[Flowercredit] Getting credit score for ${targetId}`);

        let result = await connection.execute(
            `SELECT social_credit
            FROM flowerfall_social_credit
            WHERE discord_id=:0`,
            [targetId],
            {}
        );
        if(result && result.rows.length > 0)
            return result.rows[0][0];
        return null;
    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        if(newConnection)
            connection.close();
    }
}

/**
 * Responds to an interaction from getting credit score
 * @param {*} interaction 
 * @returns 
 */
async function flowercreditGet(interaction){
    const creditScore = await getCreditScore(interaction.client.dblogin, interaction.options.getString('person_name'));

    let respondText = "";
    if (creditScore) {
        respondText = `<@${targetId}> has a credit score of ${creditScore}`
    }
    else {
        respondText = `<@${targetId}> has a credit score of 0`
        
    }
    return interaction.reply({ content: respondText, ephemeral: interaction.options.getBoolean('hide') ?? true });
}

/**
 * sets a credit score
 * @param {*} dbLogin 
 * @param {*} targetId 
 * @param {*} socialCredit 
 * @param {*} connection 
 * @returns 
 */
async function setCreditScore(interaction, targetId, socialCredit, connection){
    const dbLogin = interaction.client.dblogin;

    let newConnection = false;
    if(!connection){
        connection = await oracledb.getConnection(dbLogin);
        newConnection = true;
    }

    if(targetId)
        targetId = targetId.replace(/[^0-9]/g, '');

    try{
        // check if user is admin
        if(newConnection){
            let adminFlag = await isAdmin(interaction, connection);
            if(!adminFlag)
                return null;
        }

        let targetMember = await interaction.guild.members.fetch({user: targetId, force: true});
        if(!targetMember)
            return interaction.reply({content: `Can't find that FlowerFool`, ephemeral: true});

        logDebug(interaction.client, `[Flowercredit] Updating credit score for ${interaction.user.username} to ${setNumber}`);   

        return connection.execute(
            `MERGE INTO flowerfall_social_credit USING dual ON (discord_id =: discord_id)
            WHEN MATCHED THEN UPDATE SET social_credit=:social_credit
            WHEN NOT MATCHED THEN INSERT
            VALUES(:discord_id, :social_credit)`, 
            {discord_id: targetId,
            social_credit: socialCredit}, {autoCommit: true});
        

    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        if(newConnection)
            connection.close();
    }
}

/**
 * Responds to an interaction from getting credit score
 * @param {*} interaction 
 * @returns 
 */
async function flowercreditSet(interaction){
    await setCreditScore(interaction, interaction.options.getString('person_name'), interaction.options.getNumber('credit_score'))

    let respondText = `${interaction.options.getString('person_name')}'s social credit set to ${interaction.options.getNumber('credit_score')}`;

    return interaction.reply({ content: respondText, ephemeral: interaction.options.getBoolean('hide') ?? true });
}


/**
 * adds or removes credit score from someone
 * @param {*} interaction 
 * @param {*} isAdding 
 * @returns 
 */
async function addCreditScore(interaction, isAdding){
    let connection = await oracledb.getConnection(interaction.client.dbLogin);

    let targetId = interaction.member.id;
    if(interaction.options.getString('person_name'))
        targetId = interaction.options.getString('person_name').replace(/[^0-9]/g, '');

    logDebug(interaction.client, `[Flowercredit] ${interaction.user.username} getting credit score for ${targetId}`);

    try{
        // check if user is admin
        let adminFlag = await isAdmin(interaction, connection);
        if(!adminFlag)
            return;

        let targetMember = await interaction.guild.members.fetch({user: targetId, force: true});
        if(!targetMember)
            return interaction.reply({content: `Can't find that FlowerFool`, ephemeral: true});

        let result = await connection.execute(
            `SELECT social_credit
            FROM flowerfall_social_credit
            WHERE discord_id=:0`,
            [targetId],
            {}
        );
        let socialCredit = 0;

        // responds with the credit score amount
        if(result.rows.length > 0){
            if(result.rows[0][0]){
                socialCredit = result.rows[0][0];
            }
        }

        if(isAdding){
            socialCredit += interaction.options.getNumber('social_credit');
        }
        else{
            socialCredit -= interaction.options.getNumber('social_credit');
        }

        setCreditScore(interaction, connection, socialCredit);

        logDebug(interaction.client, `[Flowercredit] Updating credit score for ${interaction.user.username}`);
        let changeText = 'increased';
        if(!isAdding){
            changeText = 'decreased'; 
        }
        return interaction.reply({content: `<@${targetId}>'s social credit score ${changeText} by ${interaction.options.getNumber('social_credit')} to ${socialCredit}`, ephemeral: interaction.options.getBoolean('hide') ?? false});
    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
}

async function getRanking(interaction){
    let connection = await oracledb.getConnection(interaction.client.dbLogin);
    try{
        let result = await connection.execute(
            `SELECT *
            FROM flowerfall_social_credit
            ORDER BY social_credit DESC`,
            {},
            {}
        );
    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
}