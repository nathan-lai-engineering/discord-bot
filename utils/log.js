const {humanTimeNow} = require('./time.js');

module.exports = {
    logDebug(client, message){
        if(client.debugMode)
            return console.log('[%s] %s', humanTimeNow(), message);
        return;
    },
    log(message){
        return console.log('[%s] %s', humanTimeNow(), message);
    }
}