const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const firebase = require("firebase-admin");

exports.load = (client, apiKey) => {
    logDebug(client, 'Loading riot module');
    client.enabledModules.push("riot");

    let interval = 10 * 60 * 1000;



    let checkRiotData = () => {
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Performing check on Riot Web API');

        getPUUIDs(client).then(puuids => {
            console.log(puuids);
            for(index in puuids){
                let discordId = puuids[index].id;
                let riotId = puuids[index].puuid;

                
            }
        })


    };
    checkRiotData();
    setTimeout(checkRiotData, interval);
}

function getPUUIDs(client){
    logDebug(client, 'Getting PUUID data from firestore');
    
    return client.db.collection('users').get().then(snapshot => {
        let puuids = [];
        snapshot.forEach(docSnapshot => {
            if('puuid' in docSnapshot.data()){
                puuids.push({
                    id: docSnapshot.id,
                    puuid: docSnapshot.data().puuid
                });
            }
        });
        return puuids;

    })
    /*
    return client.db.collection('users').doc(member.id).get().then(snapshot => {
        if('puuid' in snapshot.data()){
            console.log(snapshot.data().puuid);
        }
    });
    */
}
