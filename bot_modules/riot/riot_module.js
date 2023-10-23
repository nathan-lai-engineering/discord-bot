const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const axios = require('axios');
const {roundToString, secondsToTime, topTraits, position, tftGametypes, leagueGametypes, leagueRoles, calculateLpChange, sleep} = require('./riotUtils.js');
const oracledb = require('oracledb');

/**
 * Load the Riot Games match history tracker into the bot
 * @param {*} client 
 * @param {*} apiKey 
 */
exports.load = (client) => {
    logDebug(client, 'Loading Riot Games module');
    client.enabledModules.push("riot");

    let interval = 10 * 60 * 1000; // interval to check match history in second

    let checkRiotData = () => {
        let lastChecked = Math.floor((Date.now() - interval) / 1000);
        setTimeout(checkRiotData, interval);
        logDebug(client, 'Performing check on Riot Web API');
    };

    setTimeout(checkRiotData, 10000);
}       