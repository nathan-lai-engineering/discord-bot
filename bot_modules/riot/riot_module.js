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
        let lastChecked = Math.floor((Date.now() - interval) / 1000);
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
                let res;
                try{
                    
                    let apiString = `${apiPath}${riotAccount['puuids'][gametype]}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`;
                    res = await axios({method: 'get', url: apiString});
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
        if(Object.keys(matches).length > 0) {
            guildChannels = await getGuildChannels(client); // api call
            for(let guildId in guildChannels){
                guildChannels[guildId] = await client.channels.fetch(guildChannels[guildId]); // fetch from Discord
            }
        }
        else{
            logDebug(client, '[RIOT] No matches recently');
        }

        // gets all members who want to be tracked
        var subscribedMembers = await getSubscribedMembers(client);

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

                // send embed message based on gametype 
                let embed = 'This is supposed to be an embed message';

                if(gametype == 'league'){

                }
                else if(gametype == 'tft'){
                    embed = {embeds:[await createTftEmbed(client, matches[matchId], matchRiotAccounts)]};
                }
                // send the bad boy
                guildChannels[guildId].send(embed);
            }

        }
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
        `SELECT discord_id, summoner_id, summoner_name, puuid, gametype
        FROM riot_accounts INNER JOIN puuids
        USING(summoner_id)`, [], {});
    if(resRiotAccounts != null && resRiotAccounts.rows.length > 0){
        for(let rowRiotAccount of resRiotAccounts.rows){
            if(!(rowRiotAccount[0] in riotAccounts)){
                riotAccounts[rowRiotAccount[0]] = {
                    summonerId: rowRiotAccount[1],
                    summonerName: rowRiotAccount[2],
                    puuids: {}

                };
            }
            riotAccounts[rowRiotAccount[0]]['puuids'][rowRiotAccount[4]] = rowRiotAccount[3];
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
            guildChannels[resGuildChannel[0]] = resGuildChannel[1];
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
            let puuid = riotAccounts[discordId]['puuids'][gametype];
            matchRiotAccounts[puuid] = {
                summonerName: riotAccounts[discordId]['summonerName'],
                summonerId: riotAccounts[discordId]['summonerId'],
            }
        }
    }
    logDebug(client, '[RIOT] Reformatted match riot accounts');
    return matchRiotAccounts;
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
async function createTftEmbed(client, tftMatch, matchRiotAccounts){
    logDebug(client, '[RIOT] Creating embed for TFT match');
    
    // create a list of all tracked players in match and sort by placement
    let memberPuuids = Object.keys(matchRiotAccounts);
    let matchData = tftMatch['matchData'];
    let participants = [];
    matchData['info']['participants'].forEach(participant => {
        if(memberPuuids.includes(participant['puuid'])){
            participants.push(participant);
        } 
    });

    participants.sort((a, b) => {
        return a.placement - b.placement;
    });

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

        )
    }
    embed.setFooter({text: `Match ID: ${matchData['metadata']['match_id']}`});

    return embed;

}