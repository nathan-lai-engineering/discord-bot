const {humanTimeNow} = require('./time.js');

module.exports = {
    logDebug(debugMode, message){
        if(debugMode)
            return console.log('[%s] %s', humanTimeNow(), message);
        return;
    }
}