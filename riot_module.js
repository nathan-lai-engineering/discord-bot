const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')

exports.load = (client, apiKey) => {
    logDebug(client, 'Loading riot module');
    client.enabledModules.push("riot");

    let interval = 5 * 60 * 1000;
}

