const { SlashCommandBuilder } = require('discord.js');
const {log, logDebug} = require('../../../utils/log.js');
const oracledb = require('oracledb');
const axios = require('axios');
const apiPaths = require('../riotApiPaths.json');

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
                        .setName('riot_id')
                        .setDescription('your riot_id')
                        .setRequired(true))
                .addStringOption(option =>
                    option
                        .setName('riot_tag')
                        .setDescription('your riot tag (after the hashtag)')
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
    const oracleLogin = require('../../../oracledb.json');
    let connection = await oracledb.getConnection(oracleLogin);
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

/**
 * Registers a discord user to a riot account. Repeated usage only updates summoner name.
 * @param {*} interaction 
 */
async function riotRegister(interaction){
    logDebug(interaction.client, 'Looking up riot account of user');
    let riotIdInput = interaction.options.getString('riot_id');
    const riotTagInput = interaction.options.getString('riot_tag');
    let discordId = interaction.member.id;

    // secret method for registering someone else by including discord id
    if(riotIdInput.includes(":")){
        discordId = riotIdInput.split(":")[0];
        riotIdInput = riotIdInput.split(":")[1];
    }

    // acquire account data for both league and tft from Riot Web API
    var accountData = {
        riotId: riotIdInput,
        riotTag: riotTagInput,
        puuids: {},
        summonerIds: {}
    };

    // read riot web api for id, tag, and puuid
    for(let gametype in apiPaths){
        let apiKey = interaction.client.apiKeys[gametype];
        let apiPath = apiPaths[gametype]['account'];
        let apiString = `${apiPath}${riotIdInput}/${riotTagInput}?api_key=${apiKey}`
        try{
            let res = await axios({
                method: 'get',
                url: apiString
            });
            let resData = res.data;
            accountData['riotId'] = resData['gameName'];
            accountData['riotTag'] = resData['tagLine'];
            accountData['puuids'][gametype] = resData['puuid'];
        }
        catch(error){
            logDebug(interaction.client, error);
        }
    }

    // read riot web api for summoner id
    for(let gametype in apiPaths){
        let apiKey = interaction.client.apiKeys[gametype];
        let apiPath = apiPaths[gametype]['summonerPuuid'];
        let apiString = `${apiPath}${accountData['puuids'][gametype]}?api_key=${apiKey}`
        try{
            let res = await axios({
                method: 'get',
                url: apiString
            });
            let summonerId = res.data['id'];
            accountData['summonerIds'][gametype] = summonerId;
        }
        catch(error){
            logDebug(interaction.client, error);
        }
    }

    // update database with new account data
    if(Object.keys(accountData).length > 0){
        let connection = await oracledb.getConnection(interaction.client.dbLogin);


        try{
            // upsert discord account
            await upsertUser(connection, discordId);
    
            // upsert riot account
            await connection.execute(
                `MERGE INTO riot_accounts USING dual ON (discord_id=:discord_id)
                WHEN MATCHED THEN UPDATE SET riot_id=:riot_id, riot_tag=:riot_tag
                WHEN NOT MATCHED THEN INSERT
                VALUES(:discord_id, :riot_id, :riot_tag)`,
            {discord_id: discordId,
            riot_id: accountData['riotId'],
            riot_tag: accountData['riotTag']
            },
            {});

            // upsert puuids information
            for(let gametype in apiPaths){
                await connection.execute(
                    `INSERT INTO puuids (puuid, gametype, discord_id, summoner_id)
                    SELECT :puuid, :gametype, :discord_id, :summoner_id
                    FROM dual
                    WHERE NOT EXISTS(
                        SELECT * FROM puuids
                        WHERE (puuid=:puuid and gametype=:gametype)
                    )`,
                {puuid: accountData['puuids'][gametype],
                gametype: gametype,
                discord_id: discordId,
                summoner_id: accountData['summonerIds'][gametype]
                },
                {});
                let apiKey = interaction.client.apiKeys[gametype];
                await updateRank(connection, accountData['summonerIds'][gametype], gametype, apiKey, accountData['puuids'][gametype]);
            }

            // upsert notification member to true
            await connection.execute(
                `MERGE INTO notification_members USING dual ON (guild_id=:guild_id AND notification_type='riot' AND discord_id=:discord_id)
                WHEN MATCHED THEN UPDATE SET toggle=1
                WHEN NOT MATCHED THEN INSERT
                VALUES(:guild_id, 'riot', :discord_id, 1)`,
            {guild_id: interaction.guild.id,
            discord_id: discordId},
            {autoCommit:true});
            try{
                interaction.reply({content: `You have registered to the Riot account of: ${accountData['riotId']}#${accountData['riotTag']}`, ephemeral:false});
            }
            catch(error){
                try{
                    interaction.reply({content: `You have registered to the Riot account of: ${accountData['riotId']}#${accountData['riotTag']}`, ephemeral:false});
                }
                catch(error){
                    logDebug(client, "[Riot] Riot register reply error");
                }
            }

        }
        catch(error){
            logDebug(interaction.client, error);
            interaction.reply({content:'Database error.', ephemeral:true});
        }
        finally{
            if(connection)
                connection.close();
        }
    }
    else
        interaction.reply({content: `That account could not be found.`, ephemeral:true});
}

/**
 * Toggles the Riot match tracking
 * @param {*} client 
 * @param {*} interaction 
 */
async function riotToggle(interaction){
    logDebug(interaction.client, 'Toggling Riot match history tracker');

    let connection = await oracledb.getConnection(interaction.client.dbLogin);

    try{
        // upsert discord account
        await upsertUser(connection, interaction.member.id);

        // select toggle from notification member
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

        // upsert notification member with toggle data (false if it didnt exist before)
        await connection.execute(
            `MERGE INTO notification_members USING dual ON (guild_id=:guild_id AND notification_type='riot' AND discord_id=:discord_id)
            WHEN MATCHED THEN UPDATE SET toggle=:toggle
            WHEN NOT MATCHED THEN INSERT
            VALUES(:guild_id, 'riot', :discord_id, :toggle)`,
        {guild_id: interaction.guild.id,
        discord_id: interaction.member.id,
        toggle: toggle},
        {autoCommit:true});

        // inform user of result
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

/**
 * common sql query for upserting to discord_accounts
 * @param {*} connection 
 * @param {*} discordId 
 * @returns 
 */
async function upsertUser(connection, discordId){
    return await connection.execute(
        `INSERT INTO discord_accounts (discord_id, admin)
        SELECT :discord_id, 0
        FROM dual
        WHERE NOT EXISTS(
            SELECT * FROM discord_accounts
            WHERE (discord_id = :discord_id)
        )`,
        {discord_id: discordId},
        {}
    );
}

/**
 * Using a connection, updates the rank information for a given gametype using summonerId
 * @param {*} connection 
 * @param {*} summonerId 
 * @param {*} gametype 
 * @param {*} apiKey 
 * @param {*} puuid 
 */
async function updateRank(connection, summonerId, gametype, apiKey, puuid){
    let apiPath = apiPaths[gametype]['rank'];
    let apiString = `${apiPath}${summonerId}?api_key=${apiKey}`;
    try{
        let res = await axios({
            method: 'get',
            url: apiString
        });
        var resData = res.data;
    }
    catch(error){
        logDebug(interaction.client, error);
    }
    if(resData && resData.length > 0){
        for(let queueData of resData){
            await connection.execute(
                `MERGE INTO ranks USING dual ON (queue=:queue and puuid=:puuid)
                WHEN MATCHED THEN UPDATE SET tier=:tier, tier_rank=:tier_rank, league_points=:league_points
                WHEN NOT MATCHED THEN INSERT
                VALUES(:queue, :puuid, :gametype, :tier, :tier_rank, :league_points)`,
            {queue: queueData['queueType'],
                puuid: puuid,
                gametype: gametype,
                tier: queueData['tier'],
                tier_rank: queueData['rank'],
                league_points: queueData['leaguePoints']
            },
            {});
        }

    }
}