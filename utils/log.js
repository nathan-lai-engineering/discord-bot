const {humanTimeNow} = require('./time.js');

/**
 * Formats console logs with time stamps
 */
module.exports = {
    /**
     * Console logs if in debug mode
     * @param {*} client 
     * @param {*} message 
     * @returns 
     */
    logDebug(client, message){
        if(client.debugMode)
            return console.log('[%s] %s', humanTimeNow(), message);
        return;
    },

    /**
     * Console log 
     * @param {} message 
     * @returns 
     */
    log(message){
        return console.log('[%s] %s', humanTimeNow(), message);
    }
}