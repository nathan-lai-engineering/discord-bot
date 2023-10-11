const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");

exports.load = (client) => {
    logDebug(client, 'Loading TikTok Embed module');
    client.enabledModules.push("tiktok_embed");

}
