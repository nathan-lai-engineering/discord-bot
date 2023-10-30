const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const axios = require('axios');
const {roundToString, secondsToTime, topTraits, position, tftGametypes, leagueGametypes, leagueRoles, calculateLpChange, sleep, getRankedType, gamemodeImage} = require('./riotUtils.js');
const oracledb = require('oracledb');
const {oracleQuery} = require('../../utils/oracle.js');
const API_PATHS = require('./riotApiPaths.json');

const INTERVAL = 10 * 60 * 1000; // interval to check match history in second

/**
 * Load the Riot Games match history tracker into the bot
 * @param {*} client 
 * @param {*} apiKey 
 */
exports.load = (client) => {
    logDebug(client, 'Loading Riot Games module');

    let checkRiotDataWrapper = async () => checkRiotData(client);
 
    setTimeout(checkRiotDataWrapper, 10000);
}       

/**
 * Performs all the actions to check Riot WEB API for match history and lp tracking
 * @param {*} client 
 */
async function checkRiotData(client){
        //let lastChecked = Math.floor((Date.now() - INTERVAL) / 1000); // preserved for debugging
        let lastChecked = await getLastTimeChecked(client, INTERVAL);
        setTimeout(checkRiotData, INTERVAL);
        logDebug(client, '[RIOT] Beginning interval check on Riot Web API');

        // get all registered riot accounts
        var riotAccounts = await getRiotAccounts(client);
        var matches = {};
    
        // get match history of each tracked player
        for(let gametype in API_PATHS){
            let apiPath = API_PATHS[gametype]['matchHistory'];
            let apiKey = client.apiKeys[gametype];

            for(let discordId in riotAccounts){
                let riotAccount = riotAccounts[discordId];
                try{
                    let apiString = `${apiPath}${riotAccount[gametype]['puuid']}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`;
                    let res = await axios({method: 'get', url: apiString});
                    await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit

                    // record which tracked players are in each match
                    for(let matchId of res.data){
                        if(!(matchId in matches)){
                            matches[matchId] = {
                                gametype: gametype,
                                members: []
                            };
                        }
                        matches[matchId]['members'].push(discordId);
                    }
                }
                catch(error){
                    logDebug(client, error);
                }
            }
            logDebug(client, `[RIOT] Match history acquired for ${gametype}`);
        }

        let guildChannels;
        var subscribedMembers;
        if(Object.keys(matches).length > 0) {
            // get channel objects
            guildChannels = await getGuildChannels(client);

            // gets all members who want to be tracked
            subscribedMembers = await getSubscribedMembers(client);
        }
        else{
            logDebug(client, '[RIOT] No matches recently');
        }

        let sortedMatchIds = Object.keys(matches);
        sortedMatchIds.sort();
        for(let matchId of sortedMatchIds){
            let match = matches[matchId];
            let gametype = match['gametype'];
            let members = match['members'];
            
            let apiKey = client.apiKeys[gametype];
            let apiPath = API_PATHS[gametype]['matchInfo'];
            let apiString = `${apiPath}${matchId}?api_key=${apiKey}`

            try{
                let matchData = await axios({method: 'get', url: apiString});
                match['matchData'] = matchData.data;
            }
            catch(error){
                logDebug(client, error);
            }
            await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit
            
            for(let guildId in guildChannels){
                // get an object of all registered riot accounts in the match AND have tracking on for this guild mapped by PUUID
                let matchRiotAccounts = formatMatchMembers(riotAccounts, members, subscribedMembers[guildId], gametype);

                // builds lp string and manages all ranked info
                let lpStrings = await manageLpStrings(client, match, matchRiotAccounts);

                // send embed message based on gametype 
                let embed = createEmbed(client, match, matchRiotAccounts, gametype, lpStrings);
                // send the bad boy
                guildChannels[guildId].send(embed);
            }
        }
        logDebug(client, "[RIOT] All matches historied");
}

/**
 * Acquires Riot accounts from database and formats into object
 * {
 * discordId: {
 *      summonerName, 
 *      [gametype]: {puuid, summonerId}
 * }}
 * @param {*} client 
 */
async function getRiotAccounts(client){
    let riotAccounts = {};
    let resRiotAccounts = await oracleQuery(
        `SELECT discord_id, summoner_name, gametype, puuid, summoner_id
        FROM riot_accounts INNER JOIN summoners
        USING(discord_id)`, [], {});
    if(resRiotAccounts != null && resRiotAccounts.rows.length > 0){
        for(let rowRiotAccount of resRiotAccounts.rows){
            let discordId = rowRiotAccount[0];
            if(!(discordId in riotAccounts)){
                riotAccounts[discordId] = {
                    summonerName: rowRiotAccount[1]
                };
            }
            riotAccounts[discordId][rowRiotAccount[2]] = {
                puuid: rowRiotAccount[3],
                summonerId: rowRiotAccount[4]};
        }
    }
    logDebug(client, '[RIOT] Riot accounts acquired');
    return riotAccounts;
}

/**
 * Gets guild channels with channel ids mapped by guild id
 * @param {*} client 
 * @returns 
 */
async function getGuildChannels(client){
    let guildChannels = {};
    let resGuildChannels = await oracleQuery(
        `SELECT guild_id, channel_id FROM notification_channels WHERE notification_type='riot'`, {}, {});
    if(resGuildChannels != null && resGuildChannels.rows.length > 0){
        for(let resGuildChannel of resGuildChannels.rows){
            guildChannels[resGuildChannel[0]] = await client.channels.fetch(resGuildChannel[1]);
            
        }
    }
    logDebug(client, '[RIOT] Notification channel IDs acquired');
    return guildChannels;
}

/**
 * Gets an object with lists of subscribed members mapped to guild id
 * @param {*} client 
 * @returns 
 */
async function getSubscribedMembers(client){
    let subscribedMembers = {};
    let resSubscribedMembers = await oracleQuery(
        `SELECT guild_id, discord_id 
        FROM NOTIFICATION_MEMBERS 
        WHERE toggle=1 AND notification_type='riot'`
        ,{},{});
    if(resSubscribedMembers != null && resSubscribedMembers.rows.length > 0){
        for(let resSubscribedMember of resSubscribedMembers.rows){
            if(!(resSubscribedMember[0] in subscribedMembers)){
                subscribedMembers[resSubscribedMember[0]] = [];
            }
            subscribedMembers[resSubscribedMember[0]].push(resSubscribedMember[1]);
        }
    }
    logDebug(client, '[RIOT] Subscribed discord members acquired');
    return subscribedMembers;
}

/**
 * Gets the subscribed riot accounts in a match in the following format
 * {puuid: {summonerName, summonerId}}
 * @param {*} client 
 * @param {*} riotAccounts 
 * @param {*} matchMembers 
 * @param {*} subscribedMembers 
 * @param {*} gametype 
 */
function formatMatchMembers(riotAccounts, matchMembers, subscribedMembers, gametype){
    let matchRiotAccounts = {};
    for(let discordId in riotAccounts){
        if(matchMembers.includes(discordId) && subscribedMembers.includes(discordId)){
            let puuid = riotAccounts[discordId][gametype]['puuid'];
            matchRiotAccounts[puuid] = {
                summonerName: riotAccounts[discordId]['summonerName'],
                summonerId: riotAccounts[discordId][gametype]['summonerId'],
            }
        }
    }
    return matchRiotAccounts;
}

/**
 * Creates embed based on gametype
 * @param {*} client 
 * @param {*} match 
 * @param {*} matchRiotAccounts 
 * @param {*} gametype 
 * @returns 
 */
function createEmbed(client, match, matchRiotAccounts, gametype, lpString){
    // send embed message based on gametype 
    let embed = 'This is supposed to be an embed message';
    if(gametype == 'league'){
        embed = {embeds:[createLeagueEmbed(client, match, matchRiotAccounts, lpString)]};
    }
    else if(gametype == 'tft'){
        embed = {embeds:[createTftEmbed(client, match, matchRiotAccounts, lpString)]};
    }
    return embed;
}

/**
 * Creates embed with the following style
 * 
 * League of Legends - Blind
 * 10/13/2023 - 5:22 PM
 * 
 * Victory (Defeat, Surrender) in 23:23
 * 15 - 34
 * 
 * Top Soraka ~ Galusha
 * KDA: 15/20/53
 * Gold: 2345345 - Vision: 45 - CS: 342
 * Damage: 23423 - Heal: 2342 - Shield: 2342
 * 
 * @param {*} client 
 * @param {*} leagueMatch 
 * @param {*} memberNames 
 */
function createLeagueEmbed(client, leagueMatch, matchRiotAccounts, lpStrings){
    logDebug(client, '[RIOT] Creating embed for LoL match');
    
    // create a list of all tracked players in match
    let matchData = leagueMatch['matchData'];
    let participants = [];
    matchData['info']['participants'].forEach(participant => {
        if(participant['puuid'] in matchRiotAccounts){
            participants.push(participant);
        } 
    })

    // organize data for teams
    let result = 'Defeat';
    if(participants[0]['win']){
        result = 'Victory';
    }
    else if(participants[0]['gameEndedInEarlySurrender'] || participants[0]['gameEndedInSurrender']){
        result = 'Surrender';
    }

    // sort teams, [0] is participant's team, [1] is enemy team
    let teams = matchData['info']['teams'].sort((a,b) => {
        if(a['win'] == participants[0]['win'])
            return -1
        return 1;
    })

    // create embed
    let embed = new Discord.EmbedBuilder();
    embed.setTitle(`League of Legends - ${leagueGametypes(matchData['info']['queueId'])}`);
    embed.setThumbnail(gamemodeImage(matchData['info']['queueId'], leagueMatch['gametype']));

    embed.setDescription(`<t:${Math.floor(matchData['info']['gameStartTimestamp']/1000)}>`);

    embed.addFields({
        name: `${result} in ${secondsToTime(matchData['info']['gameDuration'])}`,
        value: `${teams[0]['objectives']['champion']['kills']} - ${teams[1]['objectives']['champion']['kills']}`
    });

    // create chunks for each player 
    participants.forEach(participant => {
        embed.addFields(
            {name: ' ', value: '⸻⸻'}, //seperator 
            {name: `${participant['summonerName']} • ${leagueRoles(participant['teamPosition'])} ${participant['championName']}${lpStrings[participant['puuid']]}`, value: `KDA: ${participant['kills']}/${participant['deaths']}/${participant['assists']}`},
            {name: ` `, value: `Gold: ${participant['goldEarned']} • Vision: ${participant['visionScore']} • CS: ${participant['totalMinionsKilled'] + participant['neutralMinionsKilled']}`},
            {name: ` `, value: `Damage: ${participant['totalDamageDealtToChampions']} • Heal: ${participant['totalHealsOnTeammates']} • Shield: ${participant['totalDamageShieldedOnTeammates']}`},

        );
    });
    embed.setFooter({text: `Match ID: ${matchData['metadata']['matchId']}`});

    return embed;
}

/**
 * Creates embed with the following style
 * 
 *   Teamfight Tactics
 *   10/13/2023 5:22 PM
 *
 *   4th • Blazeris • +43 LP PLATINUM IV
 *      Eliminated at 23:36 on round 4-3
 *      Comp: Ionia Invoker    
 *      Level: 6    Gold Left: 34   Damage dealt: 23  
 *   
 * @param {*} client 
 * @param {*} tftMatch 
 * @returns 
 */
function createTftEmbed(client, tftMatch, matchRiotAccounts, lpStrings){
    logDebug(client, '[RIOT] Creating embed for TFT match');
    
    // create a list of all tracked players in match and sort by placement
    let matchData = tftMatch['matchData'];
    let participants = [];
    matchData['info']['participants'].forEach(participant => {
        if(participant['puuid'] in matchRiotAccounts){
            participants.push(participant);
        } 
    });
    participants.sort((a, b) => a.placement - b.placement);

    // create embed
    let embed = new Discord.EmbedBuilder();
    embed.setTitle(`Teamfight Tactics - ${tftGametypes(matchData['info']['tft_game_type'])}`);
    embed.setDescription(`<t:${Math.floor(matchData['info']['game_datetime']/1000)}>`);
    embed.setThumbnail(gamemodeImage(matchData['info']['queue_id'], tftMatch['gametype']));
    for(let participant of participants){
        let summonerName = matchRiotAccounts[participant['puuid']]['summonerName'];
        embed.addFields(
            {name: ' ', value: '⸻⸻'},
            {name: `**${position(participant['placement'])}** • ${summonerName}${lpStrings[participant['puuid']]}`, value: `Eliminated at **${secondsToTime(participant['time_eliminated'])}** on round **${roundToString(participant['last_round'])}**`},
            {name: ' ', value: `Played **${topTraits(participant['traits'])}**`},
            {name: ' ', value: `Level: ${participant['level']} • Gold left: ${participant['gold_left']} • Damage dealt: ${participant['total_damage_to_players']}`},
        );
    }
    embed.setFooter({text: `Match ID: ${matchData['metadata']['match_id']}`});
    return embed;
}

/**
 * Updates the rank info in the database
 * @param {*} client 
 * @param {*} queue 
 * @param {*} puuid 
 * @param {*} gametype 
 * @param {*} tier 
 * @param {*} rank 
 * @param {*} leaguePoints 
 */
async function updateRank(client, queue, puuid, gametype, tier, rank, leaguePoints){
    let connection = await oracledb.getConnection(client.dbLogin);
    try{
        await connection.execute(
            `MERGE INTO ranks USING dual ON (puuid=:puuid AND queue=:queue)
            WHEN MATCHED THEN UPDATE SET tier=:tier, tier_rank=:tier_rank, league_points=:league_points
            WHEN NOT MATCHED THEN INSERT
            VALUES(:queue, :puuid, :gametype, :tier, :tier_rank, :league_points)`,
            {queue: queue,
            puuid: puuid,
            gametype: gametype,
            tier: tier,
            tier_rank: rank,
            league_points:leaguePoints},
            {autoCommit:true});
    }
    catch(error){
        logDebug(client, error);
    }
    finally {
        if(connection)
            connection.close();
    }
}

/**
 * Returns the LeagueEntryDTO from Riot Web API
 * @param {*} client 
 * @param {*} summonerId 
 * @param {*} gametype 
 * @param {*} queueId 
 * @returns 
 */
async function getCurrentRank(client, summonerId, gametype, queueId){
    logDebug(client, '[RIOT] Acquiring current rank from Riot WEB API');
    try{
        let apiString = `${API_PATHS[gametype]['rank']}${summonerId}?api_key=${client.apiKeys[gametype]}`
        let res = await axios({method:'get', url: apiString});
        sleep(50);
        let rankQueue = res.data.find((queue) => getRankedType(queue['queueType']) == queueId);
        if(rankQueue != undefined){
            return rankQueue;
        }
    }
    catch(error){
        logDebug(client, error);
    }
    return null;
}

/**
 * Returns the ranked row from database
 * @param {*} client 
 * @param {*} puuid 
 * @param {*} gametype 
 * @param {*} queue 
 */
async function getLastRank(client, puuid, queue){
    logDebug(client, '[RIOT] Acquiring last rank from database');
    let res = await oracleQuery(
        `SELECT * 
        FROM ranks 
        WHERE queue=:queue AND puuid=:puuid`, 
        {queue: queue,
        puuid: puuid}, 
        {}
    );
    if(res.rows.length > 0){
        return res.rows[0];
    }
    return null;
}

/**
 * Acquires all ranked info, updates ranked info to database then returns an lp string for the embed
 * @param {*} client 
 * @param {*} match 
 * @param {*} gametype 
 * @param {*} riotAccount 
 * @returns 
 */
async function manageLpStrings(client, match, matchRiotAccounts){
    logDebug(client, '[RIOT] Managing Ranked information');
    let lpStrings = {};
    let matchData = match['matchData'];
    let gametype = match['gametype']
    let queueId = 0;
    if(gametype == 'league'){
        queueId = matchData['info']['queueId'];
    }
    else if(gametype == 'tft'){
        queueId = matchData['info']['queue_id'];
    }
    for(let puuid in matchRiotAccounts){
        lpStrings[puuid] = "";
        if([420, 440, 1100].includes(queueId)){
            let summonerId = matchRiotAccounts[puuid]['summonerId'];
            // gets LeagueEntryDTO
            let currentRank = await getCurrentRank(client, summonerId, gametype, queueId);
            if(currentRank != null){
                let lastRank = await getLastRank(client, puuid, queueId);
                await updateRank(client, queueId, puuid, gametype, currentRank['tier'], currentRank['rank'], currentRank['leaguePoints']);
                let rankString = `${currentRank['tier'].slice(0,1).toUpperCase() + currentRank['tier'].slice(1).toLowerCase()} ${currentRank['rank']} ${currentRank['leaguePoints']} LP`
                if(lastRank != null){
                    let lpChange = calculateLpChange(lastRank[3], lastRank[4], lastRank[5], currentRank['tier'], currentRank['rank'], currentRank['leaguePoints']);
                    
                    lpStrings[puuid] = ` • ${lpChange} ${rankString}`;
                }
                else {
                    lpStrings[puuid] = ` • ${rankString}`;
                }
            }
        }
    }
    return lpStrings;
}

/**
 * Gets the last unix time the web api was checked from database and update that with current time
 * Leaves a "gap" between the current time updated and the actual web api check which leaves room for overlap (< 1 second)
 * @param {*} client 
 * @param {*} interval 
 * @returns 
 */
async function getLastTimeChecked(client){
    logDebug(client, '[RIOT] Acquiring time of last API check');

    // default value of around last time interval was checked
    let lastTimeChecked = Math.floor((Date.now() - INTERVAL) / 1000);

    let connection = await oracledb.getConnection(client.dbLogin);
    try{
        // get last time checked from database
        let result = await connection.execute(`SELECT unix_time FROM timestamps WHERE name='riot'`, {}, {});

        // setting to database value if it exists
        if(result && result.rows.length > 0){
            lastTimeChecked = result.rows[0][0];
        }

        // update the database with current time
        await connection.execute(
        `MERGE INTO timestamps USING dual ON (name=:name)
        WHEN MATCHED THEN UPDATE SET unix_time=:unix_time
        WHEN NOT MATCHED THEN INSERT
        VALUES(:name, :unix_time)`,
        {name:"riot",
        unix_time: Math.floor(Date.now()/1000)}, 
        {autoCommit:true});

    }
    catch(error){
        logDebug(client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
    return lastTimeChecked;
}