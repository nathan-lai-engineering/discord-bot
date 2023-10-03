const { DisTube } = require('distube');
const Discord = require("discord.js");
const {playOutro} = require('./commands/outro.js');
const {logDebug} = require('./utils/log.js');

/**
 * Creates a debug logger for an event and sets up a queue for functions to trigger on event
 * @param {*} client 
 * @param {*} event 
 * @param {*} eventText 
 */
function createEvent(client, event, eventText){
    client.distube.eventFunctionsQueue[event] = [];

    client.distube.on(event, (queue, song) => {
        // logging
        replyMessage = eventText + String(song.name);
        if(queue.textChannel != undefined)
            queue.textChannel.send(replyMessage);
        logDebug(client, replyMessage);


        // event queue handler
        continueFunction = true;
        while(client.distube.eventFunctionsQueue[event].length > 0 && continueFunction){
            logDebug(client, event + ' queue length: ' + client.distube.eventFunctionsQueue[event].length);
            continueFunction = client.distube.eventFunctionsQueue[event].shift()();
            if(!continueFunction)
                logDebug(client, event + ' queue actions end');
        };
    });
}

exports.load = (client, disConfig) => {
    logDebug(client, 'Loading Distube module');
    client.distube = new DisTube(client, disConfig);
    client.enabledModules.push("distube");
    client.distube.eventFunctionsQueue = {};

    createEvent(client, "addSong", "ADDED SONG TO QUEUE: ");
    createEvent(client, "playSong", "NOW PLAYING: ");
    createEvent(client, "searchNoResult", "COULD NOT FIND SONG: ");

    client.on(Discord.Events.VoiceStateUpdate, (oldState, newState) => {
        if(oldState.channel != undefined){
            leaveOnEmpty(client, oldState);
            joinOnUnjoined(client, oldState);
    
            const member = oldState.member;
            const guild = oldState.guild;

            if(oldState.channel.members.has(client.user.id) && oldState.channelId != newState.channelId && !channelEmpty(oldState.channel)){
                logDebug(client, 'Playing disconnect outro for ' + member.user.username);
                playOutro(client, member, guild, oldState.channel);
            }
        }
    });
}

function leaveOnEmpty(client, oldState){
    if(channelEmpty(oldState.channel)){
        let voice = client.distube.voices.get(oldState.guild.id)
        if(voice != undefined)
            voice.leave();
    }
}

function channelEmpty(channel){
    let empty = true;
    for(let member in channel.members){
        if(!member.bot)
            empty = false;
    }
    return empty;
}

function joinOnUnjoined(oldState){

}