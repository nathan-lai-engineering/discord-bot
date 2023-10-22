const { SlashCommandBuilder } = require('discord.js');
const {log, logDebug} = require('../utils/log.js');
const oracledb = require('oracledb');
const axios = require('axios');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('riot')
		.setDescription('all riot games related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('set the channel for riot games notifications'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('registers your Riot username to your discord'))
                .addStringOption(option =>
                    option
                        .setName('summoner_name')
                        .setDescription('caps sensitive summoner name')
                        .setRequired(true)),
	async execute(interaction) {
            switch(interaction.options.getSubcommand()){
                case 'set':
                    await riotSet(interaction.client, interaction);
                    break;
                case 'register':
                    await riotRegister(interaction.client, interaction);
                    break;
                default:
                    interaction.reply({content:'What subcommand did you even try?', ephemeral: true});
            }

        
	},
};

/**
 * Sets the channel the user performed the command in as the notifcation channel for the riot tracker
 * @param {*} client 
 * @param {*} interaction 
 */
async function riotSet(client, interaction){
    logDebug(client, 'Updating Riot notification channel on database');
    const oracleLogin = require('../oracledb.json');
    let connection = await oracledb.getConnection(oracleLogin);
    try{
        let result = await connection.execute(
            `SELECT admin
            FROM discord_accounts
            WHERE discord_id=:0`,
            [interaction.member.id],
            {}
        );

        if(result.rows.length > 0){
            if(result.rows[0][0] == true){
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
            
                await connection.execute(
                    `MERGE INTO notification_channels USING dual ON (guild_id=:guild_id AND notification_type='riot')
                    WHEN MATCHED THEN UPDATE SET channel_id=:channel_id
                    WHEN NOT MATCHED THEN INSERT
                    VALUES(:guild_id, 'riot', :channel_id)`,
                {guild_id: interaction.guild.id,
                channel_id: interaction.channel.id},
                {autoCommit:true});
                return interaction.reply({content: 'Channel successfully set!', ephemeral: true});
            }
        }
        interaction.reply({content: 'You are no admin!', ephemeral: true});
    }
    catch(error){
        logDebug(client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
    
}

/**
 * Registers the user's input username as their riot account
 * @param {*} client 
 * @param {*} interaction 
 */
async function riotRegister(client, interaction){
    logDebug(client, 'Looking up riot account of user');


    const oracleLogin = require('../oracledb.json');
    let connection = await oracledb.getConnection(oracleLogin);
    try{
        await connection.execute(
            `INSERT INTO discord_accounts (discord_id, admin)
            SELECT :guild_id, false
            FROM dual
            WHERE NOT EXISTS(
                SELECT * FROM guilds
                WHERE (discord_id = :discord_id)
            )`,
            {discord_id: interaction.member.id},
            {}
        );
    
        await connection.execute(
            `MERGE INTO notification_channels USING dual ON (guild_id=:guild_id AND notification_type='riot')
            WHEN MATCHED THEN UPDATE SET channel_id=:channel_id
            WHEN NOT MATCHED THEN INSERT
            VALUES(:guild_id, 'riot', :channel_id)`,
        {guild_id: interaction.guild.id,
        channel_id: interaction.channel.id},
        {autoCommit:true});
    }
    catch(error){
        logDebug(client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
}