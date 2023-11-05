const {log, logDebug} = require('../../utils/log.js');
const {oracleQuery} = require('../../../utils/oracle.js');
const oracledb = require('oracledb');

exports.load = (client) => {
    logDebug(client, 'Loading Birthday tracker module');
    const checkBirthday = async () => {

        // check every hour 
        let now = new Date();

        let nextHour = new Date(now);
        nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
        let timeUntilNextHour = nextHour - now;
        
        setTimeout(checkBirthday, timeUntilNextHour);

        // this means the next interval is the next day
        if(now.getDate() != nextHour.getDate()){
            console.log('NEXT DAY IN THE NEXT HOUR');
            const sendBirthdayMessage = async () => {
                let guildChannels = await getGuildChannels(client);
                for(let guildChannel of guildChannels){
                    guildChannel.send("today is a new day");
                }
            }

            setInterval(sendBirthdayMessage, timeUntilNextHour);
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