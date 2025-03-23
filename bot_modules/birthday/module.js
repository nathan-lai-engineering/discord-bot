const {log, logDebug} = require('../../utils/log.js');
const {oracleQuery} = require('../../utils/oracle.js');
const oracledb = require('oracledb');

exports.load = (client) => {
    logDebug(client, 'Loading Birthday tracker module');
    const checkBirthday = async () => {

        // check every hour 
        let now = new Date();
        now.setTime(now.getTime() - (8*60*60*1000))

        let nextHour = new Date(now);
        nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
        let timeUntilNextHour = nextHour - now;
        
        setTimeout(checkBirthday, timeUntilNextHour);

        // this means the next interval is the next day
        if(now.getDate() != nextHour.getDate()){
            const sendBirthdayMessage = async () => {
                let guildChannels = await getGuildChannels(client);
                for(let guildId in guildChannels){
                    let guildChannel = guildChannels[guildId];
                    let result = await oracleQuery(
                    `SELECT discord_id FROM discord_accounts WHERE birth_month=:month AND birth_day=:day`, 
                    {month: nextHour.getMonth(),
                    day: nextHour.getDate()}, 
                    {},
                    client);
                    if(result && result.rows.length > 0){
                        for(let row of result.rows){
                            guildChannel.send(`:partying_face: @everyone Today is <@${row[0]}>'s birthday! :partying_face:`);
                        }
                    }
                }
            }
            setTimeout(sendBirthdayMessage, timeUntilNextHour);
            //setTimeout(sendBirthdayMessage, 1);
        }
    }
    checkBirthday();
}



async function getGuildChannels(client){
    let guildChannels = {};
    let resGuildChannels = await oracleQuery(
        `SELECT guild_id, channel_id FROM notification_channels WHERE notification_type='birthday'`, {}, {});
    if(resGuildChannels != null && resGuildChannels.rows.length > 0){
        for(let resGuildChannel of resGuildChannels.rows){
            guildChannels[resGuildChannel[0]] = await client.channels.fetch(resGuildChannel[1]);
        }
    }
    logDebug(client, '[BIRTHDAY] Notification channel IDs acquired');
    return guildChannels;
}