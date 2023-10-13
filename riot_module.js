const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const firebase = require("firebase-admin");

exports.load = (client, apiKey) => {
    logDebug(client, 'Loading Riot Games module');
    client.enabledModules.push("riot");

    let interval = 10 * 60 * 1000;



    let checkRiotData = () => {
        let lastChecked = Math.floor((Date.now() - interval) / 1000) - 60 * 60 * 24 * 2;
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Performing check on Riot Web API');

        getPUUIDs(client).then(async puuids => {
            let matches = {league: {}, tft: {}};

            for(index in puuids){
                let riotId = puuids[index].riot;

                let apiString1 = `https://americas.api.riotgames.com`
                let apiString2 = `${riotId}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`

                

                let leagueRes = await axios({
                    method: 'get',
                    url: `${apiString1}/lol/match/v5/matches/by-puuid/${apiString2}`
                })
                let leagueData = leagueRes.data;
                for(i in leagueData){
                    let match = leagueData[i];
                    if(!(match in matches['league'])){
                        matches['league'][match] = {members:[]};
                    }
                    matches['league'][match]['members'].push(riotId);
                }


                
                let tftRes = await axios({
                    method: 'get',
                    url: `${apiString1}/tft/match/v1/matches/by-puuid/${apiString2}`
                })

                let tftData = tftRes.data;
                for(i in tftData){
                    let match = tftData[i];
                    if(!(match in matches['tft'])){
                        matches['tft'][match] = {members:[]};
                    }
                    matches['tft'][match]['members'].push(riotId);
                }

                await sleep(100); // artificial slow down to avoid api cap (2 api calls per iteration every 110ms < 20 api calls every 1000ms)
            }

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
                    await sleep(50);
                }
            }

            console.log(matches);
        });
        

    };
    setTimeout(checkRiotData, 10000);
}

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
