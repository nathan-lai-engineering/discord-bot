const { SlashCommandBuilder } = require('discord.js');
const {log, logDebug} = require('../../../utils/log.js');
const oracledb = require('oracledb');
const { oracleQuery } = require('../../../utils/oracle.js');


module.exports = {
	data: new SlashCommandBuilder()
		.setName('birthday')
		.setDescription('all birthday related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('set the channel for birthday notifications'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('registers your birthdate to the bot')
                .addNumberOption(option => 
                    option
                        .setName('month')
                        .setDescription('integer, the month')
                        .setRequired(true))
                .addNumberOption(option => 
                    option
                        .setName('day')
                        .setDescription('integer, the day')
                        .setRequired(true))),
	async execute(interaction) {
        switch(interaction.options.getSubcommand()){
            case 'set':
                await birthdaySet(interaction);
                break;
            case 'register':
                await birthdayRegister(interaction);
                break;
            default:
                interaction.reply({content:'What subcommand did you even try?', ephemeral: true});
        }
	},
};

/**
 * Sets the channel to post the birthday notification to
 * @param {*} interaction 
 * @returns 
 */
async function birthdaySet(interaction){
    logDebug(interaction.client, 'Updating Birthday notification channel on database');
    let connection = await oracledb.getConnection(interaction.client.dbLogin);
    try{
        // check if user is admin
        let result = await connection.execute(
            `SELECT admin
            FROM discord_accounts
            WHERE discord_id=:0`,
            [interaction.member.id],
            {}
        );

        // only allow admins to perform command
        if(result.rows.length > 0){
            if(result.rows[0][0] == true){

                // insert guild info if doesnt exist
                await connection.execute(
                    `INSERT INTO guilds (guild_id)
                    SELECT :guild_id
                    FROM dual
                    WHERE NOT EXISTS(
                        SELECT * FROM guilds
                        WHERE (guild_id = :guild_id)
                    )`,
                    {guild_id: interaction.guild.id},
                    {}
                );
            
                // upsert notification channel
                await connection.execute(
                    `MERGE INTO notification_channels USING dual ON (guild_id=:guild_id AND notification_type='birthday')
                    WHEN MATCHED THEN UPDATE SET channel_id=:channel_id
                    WHEN NOT MATCHED THEN INSERT
                    VALUES(:guild_id, 'birthday', :channel_id)`,
                {guild_id: interaction.guild.id,
                channel_id: interaction.channel.id},
                {autoCommit:true});
                return interaction.reply({content: 'Channel successfully set!', ephemeral: true});
            }
        }
        interaction.reply({content: 'You are no admin!', ephemeral: true});
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
 * Sets the birthday month and day in the database
 * @param {*} interaction 
 * @returns 
 */
async function birthdayRegister(interaction){
    logDebug(interaction.client, 'Updating Discord Birthday on database');
    let month = interaction.options.getNumber('month') - 1;
    let day = interaction.options.getNumber('day');
    if(month >= 0 && month <= 11){
        if(day >= 1 && day <= 31){
            await oracleQuery(
                `MERGE INTO discord_accounts USING dual ON (discord_id=:discord_id)
                WHEN MATCHED THEN UPDATE SET birth_month=:month, birth_day=:day
                WHEN NOT MATCHED THEN INSERT
                VALUES(:discord_id, 0, null, :month, :day)`,
                {discord_id: interaction.member.id,
                month: month,
                day: day},
                {autoCommit:true});
                logDebug(interaction.client, "Birthday registered and updated to database");
                return interaction.reply({content:'Birthday Registered!', ephemeral:true});
        }
    }

    interaction.reply({content:'You did not put a real date', content: ephemeral});
    logDebug(interaction.client, "Failure to input birthday date");
}