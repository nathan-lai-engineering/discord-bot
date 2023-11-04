const {log, logDebug} = require('../../utils/log.js');

exports.load = (client) => {
    logDebug(client, 'Loading Birthday tracker module');
    const checkBirthday = async () => {
        let now = new Date();
        let nextHour = new Date(now);
        let hour = nextHour.getUTCHours() + 1;
        if(hour < 23){
            nextHour = nextHour.setUTCHours(hour, 0, 0, 0);
        }
        else {
            nextHour.setUTCDate(nextHour.getUTCDate());
            nextHour.setUTCHours(0);
        }
        setTimeout(checkBirthday, nextHour - now);
    }

    checkBirthday();
}