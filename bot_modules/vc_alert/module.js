const {log, logDebug} = require('../../utils/log.js');
const {oracleQuery} = require('../../utils/oracle.js');
const Discord = require("discord.js");

exports.load = (client) => {
    logDebug(client, 'Loading voice chat alert module');

    client.on(Discord.Events.VoiceStateUpdate, async (oldState, newState) => {
        if(!client.lastFiveManAlerts){
            client.lastFiveManAlerts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0};
        }

        let result = await oracleQuery(
            `SELECT channel_id FROM notification_channels WHERE guild_id=:guildId AND notification_type = 'vc'`, 
            {guildId: newState.guild.id}, 
            {},
            client=client);
        if(result && result.rows.length == 1){
            if(oldState.channelId != newState.channelId){
                var loadingText, alertText = undefined;
                var username = newState.member.nickname ? newState.member.nickname : newState.member.user.username;
                
                if (newState.channelId == undefined){
                    loadingText = `${username} just left voice channel <#${oldState.channelId}>`;
                    alertText = `<@${oldState.member.id}> just left voice channel <#${oldState.channelId}>`;
                }
                else {
                    var count = 0;
                    if(newState.guild.id == '753526981399805982'){
                        var role = await newState.guild.roles.fetch('1237190887231193108', {force:true})
                        if(role){
                            var channel = await client.channels.fetch(newState.channelId, {force:true});
                            var roleMembers = role.members;
                            var roleMemberIds = roleMembers.map(member => member.id);
                            if(roleMemberIds.includes(newState.member.id)){
                                channel.members.forEach((channelMember, channelMemberId) => {
                                    if(roleMemberIds.includes(channelMemberId)){
                                        count++;
                                    }
                                });
                            }
                        }
                    }
                    if(count == 5) {
                        if(new Date() - client.lastFiveManAlerts[count] > 1000 * 60 * 30){
                            loadingText = alertText = "<@here> 🚨🚨🚨🚨🚨 THE FIVE MAN HAS BEEN ASSEMBLED! 🚨🚨🚨🚨🚨";
                            client.lastFiveManAlerts[count] = new Date();
                        }
                    }

                    else if(count > 0 && count < 5){
                        if(new Date() - client.lastFiveManAlerts[count] > 1000 * 60 * 30){
                            loadingText = alertText = `<@&1237190887231193108> ${count} of the 5-man has been assembled ❗❗❗`;
                            client.lastFiveManAlerts[count] = new Date();
                        }
                    }
                    else if(oldState.channelId == undefined){
                        loadingText = `${username} just joined voice channel <#${newState.channelId}>`;
                        alertText = `<@${newState.member.id}> just joined voice channel <#${newState.channelId}>`;
                    }
    
                    else if (newState.channelId != oldState.channelId){
                        loadingText = `${username} just moved voice channels from <#${oldState.channelId}> to <#${newState.channelId}>`;
                        alertText = `<@${newState.member.id}> just moved voice channels from <#${oldState.channelId}> to <#${newState.channelId}>`;
                    }
                }
                if(alertText){
                    var alertChannelId = result.rows[0][0];
                    client.channels.fetch(alertChannelId)
                    .then(alertChannel => {
                        alertChannel.send(loadingText)
                        .then(
                            message => {
                                if(alertText != loadingText){
                                    message.edit(alertText);
                                }
                            }
                        );
                    })
                    .catch(e => logDebug(client, e));
                }
            }
        }
    });
}

function isFiveMan(voiceState){
    if(voiceState.guildId != '753526981399805982')
        return false;

    return voiceState.guild.roles.fetch('1237190887231193108').then(role => {
        client.channels.fetch(voiceState.channelId).then(channel => {
            if(role && channel){
                var roleMembers = role.members;
                if(roleMembers.has(voiceState.member.id)){
                    var count = 0;
                    for(let channelMember in channel.members){
                        if(roleMembers.has(channelMember)){
                            console.log(count);
                            count++;
                        }
                    }
                    if(count == 5){
                        return true;
                    }
                }
            }
            return false;
        });
    });
}