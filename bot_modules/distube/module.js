const { DisTube } = require('distube');
const Discord = require("discord.js");
const {playOutro} = require('./commands/outro.js');
const {logDebug} = require('../../utils/log.js');
const pathToFfmpeg = require('ffmpeg-static');


exports.load = (client, disConfig) => {
    logDebug(client, 'Loading Distube module');
    client.distube = new DisTube(client, {
        "emitAddSongWhenCreatingQueue": false,
        "emitNewSongOnly": true,
        "leaveOnStop": false,
        "nsfw": true,
        "ffmpeg": {path: pathToFfmpeg}
        });
    client.distube.eventFunctionsQueue = {};
    client.distube.lastJoined = Date.now();

    createEvent(client, "addSong", "ADDED SONG TO QUEUE: ");
    createEvent(client, "playSong", "NOW PLAYING: ");
    createEvent(client, "searchNoResult", "COULD NOT FIND SONG: ");

    client.distube.on("error", (error) => console.log(error));
    client.distube.on("debug", (error) => console.log(error));
    client.distube.on("ffmpegDebug", (error) => console.log(error));

    client.on(Discord.Events.VoiceStateUpdate, (oldState, newState) => {
        if(!oldState.member.user.bot && oldState.channelId != newState.channelId){
            leaveOnEmpty(oldState);
            joinOnUnjoined(newState);
    
            const member = oldState.member;
            const guild = oldState.guild;
    
            if(oldState.channel != undefined && oldState.channel.members.has(client.user.id) && !channelEmpty(oldState.channel) && 
            (client.distube.getQueue(oldState.guild) == undefined || client.distube.getQueue(oldState.guild).songs.length <= 0)){
                logDebug(client, 'Playing disconnect outro for ' + member.user.username);
                playOutro(client, member, guild, oldState.channel);
            }
        }
    });
}

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

/**
 * Leaves the channel if the bot is the last one inside
 * @param {*} oldState 
 */
function leaveOnEmpty(oldState){
    let client = oldState.client;

    if(oldState.channel != null) {
        oldState.channel.fetch(true)
        client.channels.fetch(oldState.channelId).then(channel => {
            if(channel != null && channelEmpty(channel)){
                logDebug(client, "Left on empty " + channel.id);
                let voice = client.distube.voices.get(oldState.guild.id)
                if(voice != undefined)
                    voice.leave();
            }
        });
    }
}

/**
 * Boolean true or false if a channel is empty with the bot
 * @param {*} channel 
 * @returns 
 */
function channelEmpty(channel){
    let empty = true;
    if(channel.members.find(m => !m.user.bot) != undefined){
        empty = false;
    }

    let botPresent = false;
    if(channel.members.find(m => m.user.bot) != undefined){
        botPresent = true;
    }

    return (botPresent && empty);
}

/**
 * Joins if the bot is not involved in any voice channels
 * @param {*} newState 
 */
function joinOnUnjoined(newState){
    let client = newState.client;
    if(Date.now() - client.distube.lastJoined > 100){
        if(newState.channel != null){
            let voice = client.distube.voices.get(newState.guild.id)
            if(voice == undefined || voice == null){
                logDebug(client, "Join followed " + newState.channel.id);
                client.distube.voices.join(newState.channel);
            }
        }
    }
    client.distube.lastJoined = Date.now();
}