const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const firebase = require("firebase-admin");
const {roundToString, secondsToTime, topTraits, timeToDate, position} = require('./utils/riotUtils.js');

exports.load = (client, apiKey) => {
    logDebug(client, 'Loading Riot Games module');
    client.enabledModules.push("riot");

    let interval = 10 * 60 * 1000;



    /**
     * get PUUIDs from Firestore
     * get match history of every PUUID from Riot Web API
     * get notification channels from Firestore
     * for match data of every match from Riot Web API
     * for every match, record all tracked players participating
     * created embeds then send
     */
    let checkRiotData = () => {
        let lastChecked = Math.floor((Date.now() - interval) / 1000) - 60 * 60 * 12;
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Performing check on Riot Web API');

        getPUUIDs(client).then(async puuids => {
            let matches = {league: {}, tft: {}};
            let memberNames = {};

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

                // get match history of each tracked player
                for(index in puuids){
                    let riotId = puuids[index].riot;
                    let res = await axios({
                        method: 'get',
                        url: `https://americas.api.riotgames.com${apiStringPartial}${riotId}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`
                    });
                    await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit
                    // map match history to player
                    let matchList = res.data;
                    for(i in matchList){
                        let match = matchList[i];
                        if(!(match in matches[gameType])){
                            matches[gameType][match] = {members:[]};
                        }
                        matches[gameType][match]['members'].push(riotId);
                    }
                }
            }
            
            // get channel data for each notification channel
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
                    
                    // get match data
                    let matchData = await axios({
                        method: 'get',
                        url: `https://americas.api.riotgames.com${apiStringPartial}${match}?api_key=${apiKey}`
                    });
                    await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit
                    matches[gameType][match]['matchData'] = matchData.data;

                    // check if a member of the match is in the channel
                    for(let guildId in guildChannels){
                        let presentMembers = false;
                        for(let i in matches[gameType][match]['members']){
                            let matchMember = matches[gameType][match]['members'][i];
                            console.log(matchMember);
                            console.log(guildChannels[guildId]['members'])
                            if(matchMember in guildChannels[guildId]['members']){
                                memberNames[matchMember] = null; // cache member data for embed
                                presentMembers = true;
                            }
                        }

                        // send embed message based on gametype
                        if(presentMembers){
                            for(let memberId in memberNames){
                                if(memberNames['memberId'] == null){
                                    let summonerResponse = await axios({
                                        method: 'get',
                                        url: `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${memberId}?api_key=${apiKey}`
                                    });
                                    memberNames['memberId'] = summonerResponse.data.name;
                                    await sleep(50);
                                }
                                
                            }
                            

                            let embed = 'This is supposed to be an embed message';
                            if(gameType == 'league'){
                                
                            }
                            else if(gameType == 'tft'){
                                embed = {embeds:[createTftEmbed(client, matches[gameType][match], memberNames)]}
                            }

                            guildChannels[guildId]['channel'].send(embed);
                        }
                    }

                    
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
function createTftEmbed(client, tftMatch, memberNames){
    logDebug(client, 'Creating embed for TFT match');
    
    // create a list of all tracked players in match and sort by placement
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

    // create embed
    let embed = new Discord.EmbedBuilder();
    embed.setTitle('Teamfight Tactics');
    embed.setDescription(timeToDate(matchData['info']['game_datetime']));
    embed.setThumbnail('https://raw.githubusercontent.com/github/explore/13aab762268b5ca2d073fa16ec071e727a81ee66/topics/teamfight-tactics/teamfight-tactics.png');
    for(let i in participants){
        let participant = participants[i];
        embed.addFields(
            {name: ' ', value: '-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-~-'},
            {name: `**${position(participant['placement'])}** ~ ${memberNames[participant['puuid']]}`, value: `Eliminated at **${secondsToTime(participant['time_eliminated'])}** on round **${roundToString(participant['last_round'])}**`},
            {name: ' ', value: `Played **${topTraits(participant['traits'])}**`},
            {name: ' ', value: `Level: ${participant['level']} --- Gold left: ${participant['gold_left']} --- Damage dealt: ${participant['total_damage_to_players']}`},

        )
    }
    embed.setFooter({text: `Match ID: ${matchData['metadata']['match_id']}`});

    return embed;

}


