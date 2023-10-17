const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const {roundToString, secondsToTime, topTraits, position, tftGametypes, leagueGametypes, leagueRoles, calculateLpChange, getGuildChannels, getPUUIDs, sleep} = require('./riotUtils.js');

/**
 * Load the Riot Games match history tracker into the bot
 * @param {*} client 
 * @param {*} apiKey 
 */
exports.load = (client) => {
    logDebug(client, 'Loading Riot Games module');
    client.enabledModules.push("riot");
    let apiKey = client.externalApiKeys['riot'];

    let interval = 10 * 60 * 1000; // interval to check match history in second

    /**
     * get PUUIDs from Firestore
     * get match history of every PUUID from Riot Web API
     * get notification channels from Firestore
     * for match data of every match from Riot Web API
     * for every match, record all tracked players participating
     * created embeds then send
     * uses two major data objects
     * 
     * puuids = {
     *      puuid: {
     *          discordId: discordId,
     *          summonerName: summonerName (optional)
     * }}
     * 
     * matches = {
     *          matchId: {
     *              gametype: gametype
     *              members: [],
     *              matchData: {matchDTO}
     * }}}
     */
    let checkRiotData = () => {
        if(apiKey == null)
            return;
        let lastChecked = Math.floor((Date.now() - interval) / 1000) - 60 * 60 * 6;
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Performing check on Riot Web API');

        // acquire PUUIDS mapped to discord ids
        getPUUIDs(client).then(async puuids => {
            const API_PATHS = {
                'league': {
                    matchHistory: '/lol/match/v5/matches/by-puuid/',
                    matchInfo: '/lol/match/v5/matches/'
            }, 
                'tft':{
                    matchHistory: '/tft/match/v1/matches/by-puuid/',
                    matchInfo: '/tft/match/v1/matches/'

            }}
            let matches = {};
            //let memberNames = {};

            // get match history of each tracked player
            logDebug(client, 'Acquiring list of matches from every member');
            for(let gametype in API_PATHS){

                // construct Riot Web API path based on gametype
                let apiPath = API_PATHS[gametype]['matchHistory'];

                // Make API call to acquire list of match ids
                for(let puuid in puuids){
                    let res = null;

                    try{
                        res = await axios({
                            method: 'get',
                            url: `https://americas.api.riotgames.com${apiPath}${puuid}/ids?startTime=${lastChecked}&start=0&count=20&api_key=${apiKey}`
                        });
                    }
                    catch(error){
                        logDebug(client, 'API call failed, disabling Riot module');
                        apiKey = null;
                        return;
                    }
                    await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit

                    // record which tracked players are in each match
                    let matchList = res.data;
                    matchList.forEach(match => {
                        if(!(match in matches)){
                            matches[match] = {
                                gametype: gametype,
                                members: []
                            };
                        }
                        matches[match]['members'].push(puuid);
                    });
                }
            }
            // use designated notification channels from Firestore and fetch Discord channels if there are matches
            let guildChannels = null;
            if(Object.keys(matches).length > 0) {
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

            // construct Riot Web API path based on gametype
            for(let matchId in matches){
                // get match data
                let matchData = null;
                let gametype = matches[matchId]['gametype'];
                let apiPath = API_PATHS[gametype]['matchInfo'];

                try{
                    matchData = await axios({
                        method: 'get',
                        url: `https://americas.api.riotgames.com${apiPath}${matchId}?api_key=${apiKey}`
                    });
                }
                catch(error){
                    logDebug(client, 'API call failed, disabling Riot module');
                    apiKey = null;
                    return;
                }
                await sleep(50); // 1 api call every 50 ms to stay under 20 api calls every 1000 ms limit
                matches[matchId]['matchData'] = matchData.data;

                // check if a member of the match is in the channel
                for(let guildId in guildChannels){
                    // send embed message based on gametype 
                    let embed = 'This is supposed to be an embed message';

                    if(gametype == 'league'){
                        embed = {embeds:[createLeagueEmbed(client, matches[matchId], puuids)]};
                    }
                    else if(gametype == 'tft'){
                        // tft web api doesnt provide names of players so make additional api calls to acquire names per PUUID
                        for(let i in matches[matchId]['members']){
                            let puuid = matches[matchId]['members'][i];
                            if(!('summonerName' in puuids[puuid])){
                                let summonerResponse = null;
                                try{
                                    summonerResponse = await axios({
                                        method: 'get',
                                        url: `https://na1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${puuid}?api_key=${apiKey}`
                                    });
                                }
                                catch(error){
                                    logDebug(client, 'API call failed, disabling Riot module');
                                    apiKey = null;
                                    return;
                                }
                                puuids[puuid]['summonerName'] = summonerResponse.data.name;
                                puuids[puuid]['summonerId'] = summonerResponse.data.id;
                                await sleep(50);
                            }
                        }
                        embed = {embeds:[await createTftEmbed(client, matches[matchId], puuids)]};
                    }
                    // send the bad boy
                    guildChannels[guildId]['channel'].send(embed);
                }
            }
        });
    };
    setTimeout(checkRiotData, 10000);
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
function createLeagueEmbed(client, leagueMatch, puuids){
    logDebug(client, 'Creating embed for LoL match');
    
    // create a list of all tracked players in match
    let members = leagueMatch['members'];
    let matchData = leagueMatch['matchData'];
    let participants = [];
    matchData['info']['participants'].forEach(participant => {
        let puuid = participant['puuid'];
        if(members.includes(puuid)){
            participants.push(participant);
            puuids[puuid]['summonerName'] = participant['summonerName'];
            puuids[puuid]['summonerId'] = participant['summonerId'];
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
            {name: `${participant['summonerName']} • ${leagueRoles(participant['teamPosition'])} ${participant['championName']}`, value: `KDA: ${participant['kills']}/${participant['deaths']}/${participant['assists']}`},
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
 *   4th - Blazeris
 *      Eliminated at 23:36 on round 4-3
 *      Comp: Ionia Invoker    
 *      Level: 6    Gold Left: 34   Damage dealt: 23  
 *   
 * @param {*} client 
 * @param {*} tftMatch 
 * @returns 
 */
async function createTftEmbed(client, tftMatch, puuids){
    logDebug(client, 'Creating embed for TFT match');
    
    // create a list of all tracked players in match and sort by placement
    let members = tftMatch['members'];
    let matchData = tftMatch['matchData'];
    let participants = [];
    matchData['info']['participants'].forEach(participant => {
        if(members.includes(participant['puuid'])){
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
    for(let i in participants){
        let participant = participants[i];
        let puuidData = puuids[participant['puuid']];
        let lpString = await getSummonerLp(client, puuidData, 'tft');
        embed.addFields(
            {name: ' ', value: '⸻⸻'},
            {name: `**${position(participant['placement'])}** • ${puuidData['summonerName']} • ${lpString}`, value: `Eliminated at **${secondsToTime(participant['time_eliminated'])}** on round **${roundToString(participant['last_round'])}**`},
            {name: ' ', value: `Played **${topTraits(participant['traits'])}**`},
            {name: ' ', value: `Level: ${participant['level']} • Gold left: ${participant['gold_left']} • Damage dealt: ${participant['total_damage_to_players']}`},

        )
    }
    embed.setFooter({text: `Match ID: ${matchData['metadata']['match_id']}`});

    return embed;

}



/**
 * Acquires cached rank and lp, compares that against current rank and lp, then returns the difference as a string
 * @param {*} client 
 * @param {*} discordId 
 * @param {*} summonerId 
 * @param {*} gametype 
 * @param {*} apiKey 
 * @returns 
 */
async function getSummonerLp(client, puuidData, gametype){
    let discordId = puuidData['discordId'];
    let summonerId = puuidData['summonerId'];
    let apiKey = client.externalApiKeys['riot'];

    logDebug(client, `Acquiring ${gametype} lp from Riot Web Api and comparing against database`);
    let apiPath = '';
    if(gametype == 'tft'){
        apiPath = `/tft/league/v1/entries/by-summoner/`;
    }
    else if(gametype == 'league'){
        apiPath = `/lol/league/v4/entries/by-summoner/`;
    }
    let apiString = `https://na1.api.riotgames.com${apiPath}${summonerId}?api_key=${apiKey}`

    // acquire old rank and lp information from firestore
    let userSnapshot = await client.db.collection('users').doc(discordId).get();
    let userData = userSnapshot.data();
    if(!('riot' in userData) || !('rank' in userData['riot']) || !(gametype in userData['riot']['rank'])){
        userData = null;
    }

    // acquire data from Riot Web API and organize it
    let riotRes = await axios({
        method: 'get',
        url: apiString
    });
    await sleep(50);
    let riotData = riotRes.data;
    let rank = null;
    let tier = null;
    let lp = null;
    if(riotData.length > 0){
        rank = riotData[0]['rank'];
        tier = riotData[0]['tier'];
        lp = riotData[0]['leaguePoints'];
    }

    // Write to database new rank and lp, while returning the change
    if(rank != null && lp != null){
        client.db.collection('users').doc(discordId).set({
            'riot': {
                [gametype]: {
                    'rank': rank,
                    'tier': tier,
                    'lp': lp
                }
            }
        }, {merge:true});

        if(userData != null) {
            // data from database
            let oldRank = userData['riot']['rank'][gametype]['rank'];
            let oldTier = userData['riot']['rank'][gametype]['tier'];
            let oldLp = userData['riot']['rank'][gametype]['lp'];
            return `${calculateLpChange(client, oldRank, oldTier, oldLp, rank, tier, lp)} ${tier} ${rank}`;
        }
        return `${tier} ${rank}`;
    }
    return null;
}