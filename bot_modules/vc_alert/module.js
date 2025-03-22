const {log, logDebug} = require('../../utils/log.js');
const {oracleQuery} = require('../../utils/oracle.js');
const Discord = require("discord.js");

exports.load = (client) => {
    logDebug(client, 'Loading voice chat alert module');

    client.on(Discord.Events.VoiceStateUpdate, async (oldState, newState) => {
        let result = await oracleQuery(
            `SELECT channel_id FROM notification_channels WHERE guild_id=:guildId AND notification_type = 'vc'`, 
            {guildId: newState.guild.id}, 
            {});
        if(result && result.rows.length == 1){
            if(oldState.channelId != newState.channelId){
                var alertText = undefined;
                if(oldState.channelId == undefined){
                    alertText = `<@${newState.member.id}> just joined voice channel <#${newState.channelId}>`;
                }
                else if (newState.channelId == undefined){
                    alertText = `<@${oldState.member.id}> just left voice channel <#${oldState.channelId}>`;
                }
                if(alertText){
                    var alertChannelId = result.rows[0][0];
                    client.channels.fetch(alertChannelId)
                    .then(alertChannel => {
                        alertChannel.send({
                            content: alertText,
                            flags: [Discord.MessageFlags.SuppressNotifications]
                          });
                    })
                    .catch(e => logDebug(client, e));
                }
            }
        }
    });
}