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
            
            logDebug(client, 'Acquiring channel data');
            let guildChannels = await getGuildChannels(client);
            for(let guildId in guildChannels){
                guildChannels[guildId]['channel'] = await client.channels.fetch(guildChannels[guildId]['channelId']);
            }

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
                    
                    let matchData = await axios({
                        method: 'get',
                        url: `https://americas.api.riotgames.com${apiStringPartial}${match}?api_key=${apiKey}`
                    });
                    matches[gameType][match]['matchData'] = matchData.data;
                    // check if a member of the match is in the channel
                    for(let guildId in guildChannels){
                        let memberPresent = false;
                        for(let matchMember in matches[gameType][match]['members']){
                            if(matchMember in guildChannels[guildId]['members']){
                                memberPresent = true;
                            }
                        }
                        if(memberPresent){
                            let embed = 'This is supposed to be an embed message';
                            if(gameType == 'league'){
                                
                            }
                            else if(gameType == 'tft'){
                                embed = {embeds:[createTftEmbed(client, matches[gameType][match])]}
                            }

                            guildChannels[guildId]['channel'].send(embed);
                        }
                    }

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
            if('channels' in docSnapshot.data() && 'riot' in docSnapshot.data()['channels'] && 'riotNotifs' in docSnapshot.data()){
                guildChannels[docSnapshot.id] = {
                    channelId: docSnapshot.data()['channels']['riot'],
                    members: docSnapshot.data()['riotNotifs']
                };
            }
        })
        return guildChannels;
    })
}

/**
 * Creates embed with the following style
 * 
 *   Teamfight Tactics
 *   10/13/2023 5:22 PM
 *
 *   4th - Blazeris
 *      Eliminated at 23:36 on round 4-3
 *      Comp: Ionia Invoker    
 *      Level: 6    Gold Left: 34   Damage dealt: 23  
 *   
 * @param {*} client 
 * @param {*} tftMatch 
 * @returns 
 */
function createTftEmbed(client, tftMatch){
    logDebug(client, 'Creating embed for TFT match');
    
    let members = tftMatch['members'];
    let matchData = tftMatch['matchData'];
    let participants = [];
    for(let i in matchData['info']['participants']){
        let participant = matchData['info']['participants'][i];
        if(members.includes(participant['puuid'])){
            participants.push(participant);
        } 
    }
    participants.sort((a, b) => {
        return a.placement - b.placement;
    });


    let embed = new Discord.EmbedBuilder();

    embed.setTitle('Teamfight Tactics');
    for(let i in participants){
        let participant = participants[i];
        embed.addFields(
            {name: `${participant['placement']} ~ username placeholder`, value: `Eliminated at ${participant['time_eliminated']} on round ${participant['last_round']}`},
            {name: ' ', value: `Played trait place holder`},
            {name: ' ', value: `Level: ${participant['level']} ~ Gold left: ${participant['gold_left']} ~ Damage dealt: ${participant['total_damage_to_players']}`},
        )
    }
    embed.setFooter({text: `Match ID: ${matchData['metadata']['match_id']}`});

    return embed;

}