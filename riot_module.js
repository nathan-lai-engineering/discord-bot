const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const firebase = require("firebase-admin");

exports.load = (client, apiKey) => {
    logDebug(client, 'Loading Riot Games module');
    client.enabledModules.push("riot");

    let interval = 10 * 60 * 1000;



    let checkRiotData = () => {
        let lastChecked = Math.floor((Date.now() - interval) / 1000) - 60 * 60 * 12;
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Performing check on Riot Web API');

        getPUUIDs(client).then(async puuids => {
            let matches = {league: {}, tft: {}};

            // acquire list of matches from every player
            logDebug(client, 'Acquiring list of matches from every member');
            for(let gameType in matches){
                let apiStringPartial = null;
                if(gameType == 'league'){
                    apiStringPartial = '/lol/match/v5/matches/by-puuid/'
                }
                else if(gameType == 'tft'){
                    apiStringPartial = '/tft/match/v1/matches/by-puuid/'
                }
                else{
                    continue;
                }

                for(index in puuids){
                    let riotId = puuids[index].riot;
                    let res = await axios({
                        method: 'get',
                        url: `https://americas.api.riotgames.com${apiStringPartial}${riotId}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`
                    });

                    let matchList = res.data;
                    for(i in matchList){
                        let match = matchList[i];
                        if(!(match in matches[gameType])){
                            matches[gameType][match] = {members:[]};
                        }
                        matches[gameType][match]['members'].push(riotId);
                    }
                    await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit
                }
            }

            let guildChannels = await getGuildChannels(client, matches);

            // acquire data for each match
            logDebug(client, 'Acquiring match data from every match');
            for(let gameType in matches){
                let apiStringPartial = null;
                if(gameType == 'league'){
                    apiStringPartial = '/lol/match/v5/matches/'
                }
                else if(gameType == 'tft'){
                    apiStringPartial = '/tft/match/v1/matches/'
                }
                else{
                    continue;
                }
                for(let match in matches[gameType]){
                    matches[gameType][match]['matchData'] = await axios({
                        method: 'get',
                        url: `https://americas.api.riotgames.com${apiStringPartial}${match}?api_key=${apiKey}`
                    });
                    await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit
                }
            }
            
            console.log(matches);
        });
        

    };
    setTimeout(checkRiotData, 10000);
}

/**
 * Utility function
 * @param {*} ms 
 * @returns 
 */
function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Gets all the puuid data of all members
 * @param {} client 
 * @returns 
 */
function getPUUIDs(client){
    logDebug(client, 'Getting Riot Id from Firestore');
    
    return client.db.collection('users').get().then(snapshot => {
        let puuids = [];
        snapshot.forEach(docSnapshot => {
            if('puuid' in docSnapshot.data()){
                puuids.push({
                    discord: docSnapshot.id,
                    riot: docSnapshot.data().puuid
                });
            }
        });
        return puuids;

    })
}

/**
 * Gets an object of guild ids and their riot notification channels
 * @param {*} client 
 * @returns 
 */
function getGuildChannels(client){
    logDebug(client, 'Getting guild Riot channels from Firestore');
    return client.db.collection('guilds').get().then(snapshot => {
        let guildChannels = {};
        snapshot.forEach(docSnapshot => {
            if('channels' in docSnapshot.data() && 'riot' in docSnapshot.data()['channels']){
                guildChannels[docSnapshot.id] = {channelId: docSnapshot.data()['channels']['riot']};
            }
        })
        return guildChannels;
    })
}

function createTftEmbed(client, tftMatch){
    let members = tftMatch['members'];
    let matchData = tftMatch['matchData'];

}