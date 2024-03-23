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
                        .setDescription('name to get their score, will show self if blank'))
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, hidden by default')))
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
                        .setDescription('name to get their score, will show self if blank'))
                .addBooleanOption(option => 
                    option
                        .setName('hide')
                        .setDescription('whether to hide the response message, hidden by default')))
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
                        .setDescription('whether to hide the response message, hidden by default'))),
	async execute(interaction) {
            switch(interaction.options.getSubcommand()){
                case 'add':
                    addCreditScore(interaction, true);
                    break;
                case 'remove':
                    addCreditScore(interaction, false);
                    break;
                case 'get':
                    getCreditScore(interaction);
                    break;
                default:
                    interaction.reply({content:'What subcommand did you even try?', ephemeral: true});
            }
	},
};

/**
 * 
 * @param {*} interaction 
 * @returns 
 */
async function getCreditScore(interaction){
    let connection = await oracledb.getConnection(interaction.client.dbLogin);

    try{
        let targetId = interaction.member.id;
        if(interaction.options.getString('person_name'))
            targetId = interaction.options.getString('person_name').replace(/[^0-9]/g, '');

        logDebug(interaction.client, `[Flowercredit] ${interaction.user.username} getting credit score for ${interaction.member.id}`);

        let result = await connection.execute(
            `SELECT social_credit
            FROM flowerfall_social_credit
            WHERE discord_id=:0`,
            [targetId],
            {}
        );

        // responds with the credit score amount
        if(result.rows.length > 0){
            if(result.rows[0][0]){
                return interaction.reply({content: `<@${targetId}> has a credit score of ${result.rows[0][0]}`, ephemeral: interaction.options.getBoolean('hide') ?? true});
            }
        }
        else {
            return interaction.reply({content: `<@${targetId}> has a credit score of 0`, ephemeral: interaction.options.getBoolean('hide') ?? true});
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
        let adminFlag = await connection.execute(
            `SELECT admin
            FROM discord_accounts
            WHERE discord_id=:0`,
            [interaction.member.id],
            {}
        );
        if(adminFlag.rows && adminFlag.rows.length >0 && !adminFlag.rows[0][0]){
            return interaction.reply({content: `You aren't an admin, you can't do that FlowerFool`, ephemeral: true});
        }

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
            socialCredit -= interaction.options.getNumber('social_credits');
        }

        result = await connection.execute(
            `MERGE INTO flowerfall_social_credit USING dual ON (discord_id =: discord_id)
            WHEN MATCHED THEN UPDATE SET social_credit=:social_credit
            WHEN NOT MATCHED THEN INSERT
            VALUES(:discord_id, :social_credit)`, 
            {discord_id: targetId,
            social_credit: socialCredit}, {autoCommit: true});
        logDebug(interaction.client, `[Flowercredit] Updating credit score for ${interaction.user.username}`);
        if(isAdding){
            return interaction.reply({content: `<@${targetId}>'s FlowerFall social credit score increased by ${interaction.options.getNumber('social_credit')} to ${socialCredit}`, ephemeral: interaction.options.getBoolean('hide') ?? true});
        }
        else{
            return interaction.reply({content: `<@${targetId}>'s FlowerFall social credit score decreased by ${interaction.options.getNumber('social_credit')} to ${socialCredit}`, ephemeral: interaction.options.getBoolean('hide') ?? true});
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
