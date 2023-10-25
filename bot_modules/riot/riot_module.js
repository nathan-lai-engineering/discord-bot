const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const axios = require('axios');
const {roundToString, secondsToTime, topTraits, position, tftGametypes, leagueGametypes, leagueRoles, calculateLpChange, sleep} = require('./riotUtils.js');
const oracledb = require('oracledb');
const {oracleQuery} = require('../../utils/oracle');
const API_PATHS = require('./riotApiPaths.json');
const riot = require('../../commands/riot.js');


/**
 * Load the Riot Games match history tracker into the bot
 * @param {*} client 
 * @param {*} apiKey 
 */
exports.load = (client) => {
    logDebug(client, 'Loading Riot Games module');
    client.enabledModules.push("riot");

    let interval = 10 * 60 * 1000; // interval to check match history in second

    let checkRiotData = async () => {
        let lastChecked = Math.floor((Date.now() - interval) / 1000) - 60 * 60 * 24;
        setTimeout(checkRiotData, interval);
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
                matches[matchId]['matchData'] = matchData.data;
            }
            catch(error){
                logDebug(client, error);
            }
            await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit
            
            for(let guildId in guildChannels){
                // get an object of all registered riot accounts in the match AND have tracking on for this guild mapped by PUUID
                let matchRiotAccounts = formatMatchMembers(client, riotAccounts, members, subscribedMembers[guildId], gametype);
                let lpString = " ";
                // send embed message based on gametype 
                let embed = createEmbed(client, match, matchRiotAccounts, gametype, lpString);
                // send the bad boy
                guildChannels[guildId].send(embed);
            }
        }
        logDebug(client, "[RIOT] All matches historied");
    };
    setTimeout(checkRiotData, 10000);
}       

/**
 * Acquires Riot accounts from database and formats into object
 * {
 * discordId: {
 *      summonerId, 
 *      summonerName, 
 *      puuids: { gametype: puuid}
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
 * 
 * @param {*} client 
 * @param {*} riotAccounts 
 * @param {*} matchMembers 
 * @param {*} subscribedMembers 
 * @param {*} gametype 
 */
function formatMatchMembers(client, riotAccounts, matchMembers, subscribedMembers, gametype){
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
    logDebug(client, '[RIOT] Reformatted match riot accounts');
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
function createLeagueEmbed(client, leagueMatch, matchRiotAccounts, lpString){
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
    embed.setThumbnail('https://raw.githubusercontent.com/github/explore/b088bf18ff2af3f2216294ffb10f5a07eb55aa31/topics/league-of-legends/league-of-legends.png');

    embed.setDescription(`<t:${Math.floor(matchData['info']['gameStartTimestamp']/1000)}>`);

    embed.addFields({
        name: `${result} in ${secondsToTime(matchData['info']['gameDuration'])}`,
        value: `${teams[0]['objectives']['champion']['kills']} - ${teams[1]['objectives']['champion']['kills']}`
    });

    // create chunks for each player 
    participants.forEach(participant => {
        embed.addFields(
            {name: ' ', value: '⸻⸻'}, //seperator 
            {name: `${participant['summonerName']} • ${leagueRoles(participant['teamPosition'])} ${participant['championName']} • ${lpString}`, value: `KDA: ${participant['kills']}/${participant['deaths']}/${participant['assists']}`},
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
function createTftEmbed(client, tftMatch, matchRiotAccounts, lpString){
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
    embed.setThumbnail('https://raw.githubusercontent.com/github/explore/13aab762268b5ca2d073fa16ec071e727a81ee66/topics/teamfight-tactics/teamfight-tactics.png');
    for(let participant of participants){
        let summonerName = matchRiotAccounts[participant['puuid']]['summonerName'];
        let summonerId = matchRiotAccounts[participant['puuid']]['summonerId'];
        let lpString = "LP HERE";
        embed.addFields(
            {name: ' ', value: '⸻⸻'},
            {name: `**${position(participant['placement'])}** • ${summonerName} • ${lpString}`, value: `Eliminated at **${secondsToTime(participant['time_eliminated'])}** on round **${roundToString(participant['last_round'])}**`},
            {name: ' ', value: `Played **${topTraits(participant['traits'])}**`},
            {name: ' ', value: `Level: ${participant['level']} • Gold left: ${participant['gold_left']} • Damage dealt: ${participant['total_damage_to_players']}`},
        );
    }
    embed.setFooter({text: `Match ID: ${matchData['metadata']['match_id']}`});
    return embed;
}

/**
 * Updates the rank info in the database
 * @param {} client 
 * @param {*} puuid 
 * @param {*} queue 
 * @param {*} tier 
 * @param {*} rank 
 * @param {*} leaguePoints 
 */
async function updateRank(client, puuid, queue, tier, rank, leaguePoints){
    let connection = await oracledb.getConnection(client.oracleLogin);

    try{
        await connection.execute(
            `MERGE INTO ranks USING dual ON (puuid=:puuid, queue=:queue)
            WHEN MATCHED THEN UPDATE SET tier=:tier, tier_rank=:tier_rank, league_points=:league_points
            WHEN NOT MATCHED THEN INSERT
            VALUES(puuid=:puuid, queue=:queue, tier=:tier, tier_rank=:tier_rank, league_points=:league_points)`,
            {puuid: puuid,
            queue: queue,
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

