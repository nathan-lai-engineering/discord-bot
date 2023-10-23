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
        let lastChecked = Math.floor((Date.now() - interval) / 1000) - 60 * 60;
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Beginning interval check on Riot Web API');

        var riotAccounts = await getRiotAccounts(client);
        console.log(riotAccounts)
        var matches = {};
    
        // get match history of each tracked player
        logDebug(client, 'Acquiring list of matches from every member');
        for(let gametype in API_PATHS){
            let apiPath = API_PATHS[gametype]['matchHistory'];
            let apiKey = client.apiKeys[gametype];

            for(let discordId in riotAccounts){
                let riotAccount = riotAccounts[discordId];
                let res;
                try{
                    let apiString = `${apiPath}${riotAccount['puuids'][gametype]}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`;
                    res = await axios({
                        method: 'get',
                        url: apiString
                    });
                    await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit

                    // record which tracked players are in each match
                    for(let match of res.data){
                        if(!(match in matches)){
                            matches[match] = {
                                gametype: gametype,
                                members: []
                            };
                        }
                        matches[match]['members'].push(riotAccount['puuids'][gametype]);
                    }
                }
                catch(error){
                    logDebug(client, error);
                }

                console.log(matches)
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
    logDebug(client, 'Riot accounts acquired');
    return riotAccounts;
}