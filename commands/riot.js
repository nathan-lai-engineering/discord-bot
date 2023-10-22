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
                .setDescription('registers your Riot username to your discord')
                .addStringOption(option =>
                    option
                        .setName('summoner_name')
                        .setDescription('summoner name')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('toggles whether or not to track your match history')),
	async execute(interaction) {
            switch(interaction.options.getSubcommand()){
                case 'set':
                    await riotSet(interaction);
                    break;
                case 'register':
                    await riotRegister(interaction);
                    break;
                case 'toggle':
                    await riotToggle(interaction);
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
async function riotSet(interaction){

    logDebug(interaction.client, 'Updating Riot notification channel on database');
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
        logDebug(interaction.client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
    
}

async function riotRegister(interaction){
    logDebug(interaction.client, 'Looking up riot account of user');
    let apiKey = interaction.client.apiKeys['league'];
    let summonerName = interaction.options.getSubcommand();
    try{
        let res = await axios({
            method: 'get',
            url: `https://na1.api.riotgames.com/tft/summoner/v1/summoners/by-name/${summonerName}?api_key=${apiKey}`
        });
        console.log(res);
    }
    catch(error){
        logDebug(interaction.client, error);
    }

    console.log(interaction.client.apiKeys)
}

/**
 * Registers the user's input username as their riot account
 * @param {*} client 
 * @param {*} interaction 
 */
async function riotToggle(interaction){
    logDebug(interaction.client, 'Toggling Riot match history tracker');

    const oracleLogin = require('../oracledb.json');
    let connection = await oracledb.getConnection(oracleLogin);
    try{
        await connection.execute(
            `INSERT INTO discord_accounts (discord_id, admin)
            SELECT :discord_id, 0
            FROM dual
            WHERE NOT EXISTS(
                SELECT * FROM discord_accounts
                WHERE (discord_id = :discord_id)
            )`,
            {discord_id: interaction.member.id},
            {}
        );
        let result = await connection.execute(
            `SELECT toggle
            FROM notification_members
            WHERE guild_id=:guild_id AND notification_type='riot' AND discord_id=:discord_id`,
            {guild_id: interaction.guild.id,
            discord_id: interaction.member.id},
            {}
        );

        let toggle = 0;
        if(result != null && result.rows.length > 0){
            if(result.rows[0][0] == 0)
                toggle = 1;
            else
                toggle = 0;
        }

        await connection.execute(
            `MERGE INTO notification_members USING dual ON (guild_id=:guild_id AND notification_type='riot' AND discord_id=:discord_id)
            WHEN MATCHED THEN UPDATE SET toggle=:toggle
            WHEN NOT MATCHED THEN INSERT
            VALUES(:guild_id, 'riot', :discord_id, :toggle)`,
        {guild_id: interaction.guild.id,
        discord_id: interaction.member.id,
        toggle: toggle},
        {autoCommit:true});

        if(toggle == 1)
            interaction.reply({content: 'You are now subscribed to the Riot match history tracker', ephemeral: true});
        else
            interaction.reply({content: 'You are now unsubscribed to the Riot match history tracker', ephemeral: true});
    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
}