const { PermissionFlagsBits, SlashCommandBuilder } = require("discord.js");
const {log, logDebug} = require('../../../utils/log.js');
const oracledb = require('oracledb');
const Discord = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('flowercredit')
		.setDescription('all flower social credit related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('adds social credit score, admin-only')
                .addStringOption(option => 
                    option
                        .setName('person_name')
                        .setDescription('name to edit their score')
                        .setRequired(true))
                .addNumberOption(option => 
                    option
                        .setName('social_credit')
                        .setDescription('the amount you want to increase by')
                        .setRequired(true))
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, shown by default')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('sets social credit score, admin-only')
                .addStringOption(option => 
                    option
                        .setName('person_name')
                        .setDescription('name to edit their score')
                        .setRequired(true))
                .addNumberOption(option => 
                    option
                        .setName('social_credit')
                        .setDescription('the amount you want to')
                        .setRequired(true))
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, shown by default')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('remove social credit score, admin-only')
                .addStringOption(option => 
                    option
                        .setName('person_name')
                        .setDescription('name to edit their score')
                        .setRequired(true))
                .addNumberOption(option => 
                    option
                        .setName('social_credit')
                        .setDescription('the amount you want to decrease by')
                        .setRequired(true))
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
                .setName('massreset')
                .setDescription('resets everyones social credit to 0, admin only')
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, hidden by default'))),
	async execute(interaction) {
            switch(interaction.options.getSubcommand()){
                case 'add':
                    flowerfallcreditAdd(interaction);
                    break;
                case 'remove':
                    flowerfallcreditRemove(interaction);
                    break;
                case 'set':
                    flowercreditSet(interaction);
                    break;
                case 'get':
                    flowercreditGet(interaction);
                    break;
                case 'ranking':
                    flowerfallRanking(interaction);
                    break;
                case 'massreset':
                    flowerfallMassReset(interaction);
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
async function getCreditScore(interaction, targetId, connection){
    const dbLogin = interaction.client.dbLogin;

    let newConnection = false;
    if(!connection){
        connection = await oracledb.getConnection(dbLogin);
        newConnection = true;
    }

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
        return 0;
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
    let targetId = interaction.options.getString('person_name') ?? interaction.member.id;
    targetId = targetId.replace(/[^0-9]/g, '');

    const creditScore = await getCreditScore(interaction, targetId);

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
    const dbLogin = interaction.client.dbLogin;

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
                return;
        }

        let targetMember = await interaction.guild.members.fetch({user: targetId, force: true});
        if(!targetMember)
            return interaction.reply({content: `Can't find that FlowerFool`, ephemeral: true});

        logDebug(interaction.client, `[Flowercredit] Updating credit score for ${targetMember.user.username} to ${socialCredit} social credit`);   

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
 * Responds to an interaction from setting credit score
 * @param {*} interaction 
 * @returns 
 */
async function flowercreditSet(interaction){
    await setCreditScore(interaction, interaction.options.getString('person_name'), interaction.options.getNumber('social_credit'))

    let respondText = `${interaction.options.getString('person_name')}'s social credit set to ${interaction.options.getNumber('social_credit')}`;

    return interaction.reply({ content: respondText, ephemeral: interaction.options.getBoolean('hide') ?? true });
}

/**
 * Adds social credit to a person through db
 * @param {*} interaction 
 * @param {*} targetId 
 * @param {*} toAdd 
 * @returns 
 */
async function addCreditScore(interaction, targetId, toAdd){
    let connection = await oracledb.getConnection(interaction.client.dbLogin);
    try{
        let creditScore = await getCreditScore(interaction, targetId, connection);
        creditScore += toAdd;
        await setCreditScore(interaction, targetId, creditScore);
        return creditScore;
    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        connection.close();
    }
}

/**
 * Responds to an interaction from adding credit score 
 * @param {*} interaction 
 * @returns 
 */
async function flowerfallcreditAdd(interaction){
    let targetId = interaction.options.getString('person_name');
    targetId = targetId.replace(/[^0-9]/g, '');

    const toAdd = interaction.options.getNumber('social_credit');

    const socialCredit = await addCreditScore(interaction, targetId, toAdd);

    let respondText = `<@${targetId}> has successfully received ${toAdd} social credit for a total of ${socialCredit} social credit!`;
    return interaction.reply({ content: respondText, ephemeral: interaction.options.getBoolean('hide') ?? false });
}

/**
 * Responds to an interaction from removing credit score 
 * @param {*} interaction 
 * @returns 
 */
async function flowerfallcreditRemove(interaction){
    let targetId = interaction.options.getString('person_name');
    targetId = targetId.replace(/[^0-9]/g, '');

    const toAdd = interaction.options.getNumber('social_credit');

    const socialCredit = await addCreditScore(interaction, targetId, -(toAdd));

    let respondText = `<@${targetId}> has unfortunately lost ${toAdd} social credit for a total of ${socialCredit} social credit!`;
    return interaction.reply({ content: respondText, ephemeral: interaction.options.getBoolean('hide') ?? false });
}

/**
 * Queries the top social credit owners
 * @param {*} interaction 
 * @returns 
 */
async function getTopSocialCredit(interaction){
    let connection = await oracledb.getConnection(interaction.client.dbLogin);
    try{
        logDebug(interaction.client, `[Flowercredit] Getting ordered list of all social credit`);

        let result = await connection.execute(
            `SELECT *
            FROM flowerfall_social_credit
            ORDER BY social_credit DESC`,
            {},
            {}
        );
        if(result){
            return result.rows;
        }
    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
}

/**
 * Creates and sends an embed to show the top social creditors
 * @param {*} interaction 
 */
async function flowerfallRanking(interaction){
    let creditors = await getTopSocialCredit(interaction);

    // create embed
    let embed = new Discord.EmbedBuilder();
    embed.setTitle(`Flowerfall Best Citizens`);
    embed.setThumbnail('https://media.discordapp.net/attachments/1215912927970721854/1227103402719318029/BURNEVERYTHING.png?ex=66273019&is=6614bb19&hm=b9a3411dfdb5a5dcbf80e2c537297aa5b3f10ad5a86f500812e7553af34cf6e8&=&format=webp&quality=lossless');
    embed.setDescription(`Ranking of the top Flowerfall members!`);

    for(let i = 0; i < Math.min(creditors.length, 20); i++){
        let creditorMember =  await interaction.guild.members.fetch({user: creditors[i][0], force: true});
        if(creditorMember){
            embed.addFields({name: `${i+1}. ${creditorMember.user.username}`, value: `${creditors[i][1]} social credit`});
        }
    }
    embed.setFooter({text:"This is an evaluation of your self-worth as a human being. -Blazeris"});

    return interaction.reply({embeds: [embed]});
}

async function flowerfallMassReset(interaction){
    const confirmationText = 'i am a stupid idiot';

    let connection = await oracledb.getConnection(interaction.client.dbLogin);

    try{
        // check for admin flag
        let adminFlag = await isAdmin(interaction, connection);
        if(!adminFlag)
            return;

        // prompt for confirmation message
        let respondText = `Are you sure you want to reset everyone's value as a human being? Type 'i am a stupid idiot' to confirm mass reset`;
        interaction.reply({ content: respondText, ephemeral: interaction.options.getBoolean('hide') ?? false });
        logDebug(interaction.client, `[Flowercredit] ${interaction.user.username} prompted for a mass reset of social credit`);

        // filter messages to only interaction author and waiting for confirmation
        const textFilter = (m) => interaction.user.id === m.author.id;
        const collector = interaction.channel.createMessageCollector(textFilter, {time: 60000});

        let wrongConfirmations = 0;

        // listen for a confirmation message
        collector.on('collect', async (msg) => {
            if(msg.content.trim().toLowerCase() == confirmationText){
                logDebug(interaction.client, `[Flowercredit] Confirmation received. Resetting all social credit`);
                return await connection.execute(
                    "UPDATE flowerfall_social_credit SET social_credit=0",
                    {}, {autoCommit: true});
            }
            else {
                wrongConfirmations++;
                let responseText = "";
                switch(wrongConfirmations){
                    case 1:
                        responseText = `You really have to type '${confirmationText}'`;
                        break;
                    case 2:
                        responseText = `Again, type '${confirmationText}', there's really no way around it`;
                        break;
                    case 3:
                        responseText = `Look, you really have to be a stupid idiot to mess this up this many times, just type '${confirmationText}'`;
                        break;
                    default:
                        collector.stop();
                }
                return msg.reply(responseText);
            }
        });

        // when the collector expires
        collector.on('end', async (collected, reason) => interaction.reply({ content: "Alright, you probably didn't want to reset all that social credit anyways", ephemeral: interaction.options.getBoolean('hide') ?? false }));


    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
}