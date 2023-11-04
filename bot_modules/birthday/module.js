const {log, logDebug} = require('../../utils/log.js');

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
                
            }

            setInterval(sendBirthdayMessage, timeUntilNextHour);
        }
    }

    checkBirthday();
}