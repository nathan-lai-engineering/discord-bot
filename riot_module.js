const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const firebase = require("firebase-admin");

exports.load = (client, apiKey) => {
    logDebug(client, 'Loading riot module');
    client.enabledModules.push("riot");

    let interval = 10 * 60 * 1000;



    let checkRiotData = () => {
        let lastChecked = Math.floor((Date.now() - interval));
        console.log(lastChecked)
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Performing check on Riot Web API');

        getPUUIDs(client).then(async puuids => {
            let matches = {league: {}, tft: {}};

            for(index in puuids){
                let discordId = puuids[index].discord;
                let riotId = puuids[index].riot;

                let apiString1 = `https://americas.api.riotgames.com`
                let apiString2 = `${riotId}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`

                

                axios({
                    method: 'get',
                    url: `${apiString1}/lol/match/v5/matches/by-puuid/${apiString2}`
                })
                .then(res => {
                    for(index in res.data){
                        if(!(res.data[index] in matches['league'])){
                            matches['league'][res.data[index]] = [];
                        }
                        matches['league'][res.data[index]].push(riotId);
                    }
                })
                .catch(error => {
                    logDebug(client, error);
                });
                
                axios({
                    method: 'get',
                    url: `${apiString1}/tft/match/v1/matches/by-puuid/${apiString2}`
                })
                .then(res => {
                    for(index in res.data){
                        if(!(res.data[index] in matches['tft'])){
                            matches['tft'][res.data[index]] = [];
                        }
                        matches['tft'][res.data[index]].push(riotId);
                    }
                })
                .catch(error => {
                    logDebug(client, error);
                });
                await sleep(150); // artificial slow down to avoid api cap (2 api calls per iteration every 110ms < 20 api calls every 1000ms)
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
