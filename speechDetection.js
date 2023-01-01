const { addSpeechEvent } = require("discord-speech-recognition");

exports.load = (client) => {
    addSpeechEvent(client);
    client.speechDetect = false;
    client.enabledModules.push("speech");
    client.on("speech", msg => {
        if(client.debugMode){
            console.log(msg);
        }
        if (!msg.content || !client.speechDetect) return;
        if(client.debugMode){
            console.log(msg.content);
        }
    });
}