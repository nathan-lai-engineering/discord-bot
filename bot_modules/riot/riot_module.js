const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const firebase = require("firebase-admin");
const {roundToString, secondsToTime, topTraits, position, tftGametypes, leagueGametypes, leagueRoles} = require('./riotUtils.js');

/**
 * Load the Riot Games match history tracker into the bot
 * @param {*} client 
 * @param {*} apiKey 
 */
exports.load = (client, apiKey) => {
    logDebug(client, 'Loading Riot Games module');
    client.enabledModules.push("riot");

    let interval = 10 * 60 * 1000; // interval to check match history in second

    /**
     * get PUUIDs from Firestore
     * get match history of every PUUID from Riot Web API
     * get notification channels from Firestore
     * for match data of every match from Riot Web API
     * for every match, record all tracked players participating
     * created embeds then send
     */
    let checkRiotData = () => {
        let lastChecked = Math.floor((Date.now() - interval) / 1000);
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Performing check on Riot Web API');

        // acquire PUUIDS mapped to discord ids
        getPUUIDs(client).then(async puuids => {
            let matches = {league: {}, tft: {}};
            let memberNames = {};

            // get match history of each tracked player
            logDebug(client, 'Acquiring list of matches from every member');
            for(let gameType in matches){

                // construct Riot Web API path based on gametype
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

                // Make API call to acquire list of match ids
                for(let discordId in puuids){
                    let riotId = puuids[discordId];
                    let res = await axios({
                        method: 'get',
                        url: `https://americas.api.riotgames.com${apiStringPartial}${riotId}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`
                    });
                    await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit

                    // record which tracked players are in each match
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
            // use designated notification channels from Firestore and fetch Discord channels if there are matches
            let guildChannels = null;
            if(Object.keys(matches['tft']).length + Object.keys(matches['league']).length > 0) {
                logDebug(client, 'Acquiring channel data');
                guildChannels = await getGuildChannels(client); // api call
                for(let guildId in guildChannels){
                    guildChannels[guildId]['channel'] = await client.channels.fetch(guildChannels[guildId]['channelId']); // fetch from Discord
                }
                logDebug(client, 'Acquiring match data from every match');
            }
            else{
                logDebug(client, 'No matches recently');
            }

            // acquire data for each match               
            for(let gameType in matches){

                // construct Riot Web API path based on gametype
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
                            let matchMemberDiscord = Object.keys(puuids).find(key => puuids[key] === matchMember);
                            if(guildChannels[guildId]['members'].includes(matchMemberDiscord)){
                                memberNames[matchMember] = null; // cache member data for embed
                                presentMembers = true;
                            }
                        }

                        // send embed message based on gametype 
                        if(presentMembers){
                            let embed = 'This is supposed to be an embed message';
                            if(gameType == 'league'){
                                embed = {embeds:[createLeagueEmbed(client, matches[gameType][match])]};
                            }
                            else if(gameType == 'tft'){
                                // tft web api doesnt provide names of players so make additional api calls to acquire names per PUUID
                                for(let memberId in memberNames){
                                    if(memberNames[memberId] == null){
                                        let summonerResponse = await axios({
                                            method: 'get',
                                            url: `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${memberId}?api_key=${apiKey}`
                                        });
                                        memberNames[memberId] = summonerResponse.data.name;
                                        await sleep(50);
                                    }
                                }
                                embed = {embeds:[createTftEmbed(client, matches[gameType][match], memberNames)]};
                            }

                            // send the bad boy
                            guildChannels[guildId]['channel'].send(embed);
                        }
                    }
                }
            }
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
        let puuids = {};
        snapshot.forEach(docSnapshot => {
            if('puuid' in docSnapshot.data()){
                puuids[docSnapshot.id] = docSnapshot.data().puuid;
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
    embed.setTitle(`Teamfight Tactics - ${tftGametypes(matchData['info']['tft_game_type'])}`);
    embed.setDescription(`<t:${Math.floor(matchData['info']['game_datetime']/1000)}>`);
    embed.setThumbnail('https://raw.githubusercontent.com/github/explore/13aab762268b5ca2d073fa16ec071e727a81ee66/topics/teamfight-tactics/teamfight-tactics.png');
    for(let i in participants){
        let participant = participants[i];
        embed.addFields(
            {name: ' ', value: '⸻⸻'},
            {name: `**${position(participant['placement'])}** • ${memberNames[participant['puuid']]}`, value: `Eliminated at **${secondsToTime(participant['time_eliminated'])}** on round **${roundToString(participant['last_round'])}**`},
            {name: ' ', value: `Played **${topTraits(participant['traits'])}**`},
            {name: ' ', value: `Level: ${participant['level']} • Gold left: ${participant['gold_left']} • Damage dealt: ${participant['total_damage_to_players']}`},

        )
    }
    embed.setFooter({text: `Match ID: ${matchData['metadata']['match_id']}`});

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
function createLeagueEmbed(client, leagueMatch){
    logDebug(client, 'Creating embed for LoL match');
    
    // create a list of all tracked players in match
    let members = leagueMatch['members'];
    let matchData = leagueMatch['matchData'];
    let participants = [];
    for(let i in matchData['info']['participants']){
        let participant = matchData['info']['participants'][i];
        if(members.includes(participant['puuid'])){
            participants.push(participant);
        } 
    }

    // organize data for teams
    let result = 'Defeat';
    if(participants[0]['gameEndedInEarlySurrender'] || participants[0]['gameEndedInSurrender']){
        result = 'Surrender';
    }
    else if(participants[0]['win']){
        result = 'Victory';
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
    for(let i in participants){
        let participant = participants[i];
        embed.addFields(
            {name: ' ', value: '⸻⸻'}, //seperator 
            {name: `${participant['summonerName']} • ${leagueRoles(participant['teamPosition'])} ${participant['championName']}`, value: `KDA: ${participant['kills']}/${participant['deaths']}/${participant['assists']}`},
            {name: ` `, value: `Gold: ${participant['goldEarned']} • Vision: ${participant['visionScore']} • CS: ${participant['totalMinionsKilled'] + participant['neutralMinionsKilled']}`},
            {name: ` `, value: `Damage: ${participant['totalDamageDealtToChampions']} • Heal: ${participant['totalHealsOnTeammates']} • Shield: ${participant['totalDamageShieldedOnTeammates']}`},

        )
    }

    embed.setFooter({text: `Match ID: ${matchData['metadata']['matchId']}`});

    return embed;
}


