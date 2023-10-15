module.exports = {roundToString, secondsToTime, topTraits, timeToDate, position, tftGametypes, leagueGametypes, leagueRoles};

/**
 * converts a number to stage string
 * 6-3 = 35
 * 6-1 = 33
 * 5-1 = 26
 * 3-1 = 12
 * 2-1 = 5
 * 1-(1-3) = 2-4
 * 0-1 (region portal) = 1
 * @param {*} roundNumber 
 * @returns 
 */
function roundToString(roundNumber){
    let round = 0;
    let subRound = 1;

    if(roundNumber > 1 && roundNumber < 5){
        round = 1;
        subRound = roundNumber - 1;
    }
    else if (roundNumber >= 5){
        round = Math.floor((roundNumber - 5) / 7) + 2;
        subRound = (roundNumber - 5) % 7 + 1;
    }

    let roundString = `${round}-${subRound}`;
    return roundString
}

/**
 * converts seconds elapsed to minutes and seconds
 * @param {} seconds 
 * @returns 
 */
function secondsToTime(seconds){
    let secondsInt = Math.floor(seconds);
    return `${Math.floor(secondsInt / 60)}:${secondsInt % 60}`;
}

/**
 * Gets the top 2 traits as a string if they exist
 * @param {*} traitsList 
 * @returns 
 */
function topTraits(traitsList){
    traitsList.sort((a, b) => {
        if(b.tier_current == a.tier_current){
            return b.num_units - a.num_units;
        }
        return b.tier_current - a.tier_current;
    });
    let traitString = 'Built Different';
    if(traitsList[0].tier_current >= 2){
        traitString = traitsName(traitsList[0].name);
    }
    if(traitsList[1].tier_current >= 2){
        traitString += " " + traitsName(traitsList[1].name);
    }
    return traitString;
}

/**
 * Converts strings to their actual in game name
 * @param {} trait 
 */
function traitsName(trait){
    let traitName = trait.split("_")[1];
    let traitsDictionary = {
        "Armorclad": "Juggernaut",
        "Preserver": "Invoker",
        "Marksman": "Gunner"
    }
    if(traitName in traitsDictionary){
        traitName = traitsDictionary[traitName];
    }
    return traitName;
}

/**
 * Takes unix time and converts it to human readable time
 * @param {*} unixTime 
 * @returns 
 */
function timeToDate(unixTime){
    let yourDate = new Date(unixTime);
    const offset = yourDate.getTimezoneOffset(); 
    yourDate = new Date(yourDate.getTime() + (offset*60*1000)); 
    let datatimeData = yourDate.toISOString().split('T');
    let dateData = datatimeData[0].split('-');
    let dateString = `${dateData[1]}/${dateData[2]}/${dateData[0]}`
    let timeData = datatimeData[1].split('.')[0];
    return `${timeData} . ${dateString}`;
}

/**
 * stylizes position numbers
 * @param {*} positionNumber 
 * @returns 
 */
function position(positionNumber){
    switch(positionNumber){
        case 1:
            return '1st';
        case 2:
            return '2nd';
        case 3:
            return '3rd'
        default:
            return `${positionNumber}th`;

    }
}

/**
 * Converts web api game type to proper name
 * @param {*} gametype 
 * @returns 
 */
function tftGametypes(gametype){
    const TFT_GAMETYPES = {
        'pairs': 'Double up',
        'standard': 'Ranked'
    }
    if(!(gametype in TFT_GAMETYPES))
        return gametype;
    return TFT_GAMETYPES[gametype];
}

/**
 * Converts web api game type to proper name
 * @param {*} gametype 
 * @returns 
 */
function leagueGametypes(queueId){
    switch(queueId){
        case 0:
            return 'Custom';
        case 76:
        case 83:
        case 1900:
            return 'URF';
        case 78:
        case 1020:
            return 'One for All';
        case 100:
        case 450:
            return 'ARAM';
        case 325:
            return 'All random';
        case 400:
            return 'Draft';
        case 420:
            return 'Ranked Solo/Duo';
        case 430:
            return 'Blind';
        case 440:
            return 'Ranked Flex';
        case 700:
            return 'Clash';
        case 720:
            return 'ARAM Clash'
        case 820:
        case 830:
        case 840:
        case 850:
            return 'Co-op vs. AI';
        case 900:
            return 'ARURF';
        case 1300:
            return 'Nexus Blitz';
        case 1400:
            return 'Ultimate Spellbook';
        default:
            return 'Tutorial';
    }
}

/**
 * Returns proper role names
 * @param {*} role 
 * @returns 
 */
function leagueRoles(role){
    const LEAGUE_ROLES = {
        'BOTTOM': 'Bottom',
        'TOP': 'Top',
        'MIDDLE': 'Middle',
        'SUPPORT': 'Support',
        'JUNGLE': 'Jungle'
    }
    if(role in LEAGUE_ROLES){
        return LEAGUE_ROLES[role];
    }
    return role;
}