const { DisTube } = require('distube');
const Discord = require("discord.js");
const {playOutro} = require('./commands/outro.js');
const {logDebug} = require('./utils/log.js');

function createEvent(client, event, eventText){
    client.distube.on(event, (queue, song) => {
        replyMessage = eventText + String(song.name);
        if(queue.textChannel != undefined)
            queue.textChannel.send(replyMessage);
        logDebug(client, replyMessage);
    });
}

function createPlaySongEvent(client){
    client.distube.on("playSong", (queue, song) => {
        replyMessage = "NOW PLAYING: " + String(song.name);
        if(queue.textChannel != undefined)
            queue.textChannel.send(replyMessage);
        logDebug(client, replyMessage);
        if(client.distube.addSongFunctions.length > 0){
            client.distube.addSongFunctions.pop()();
        };
    });
}

exports.load = (client, disConfig) => {
    logDebug(client, 'Loading Distube module');
    client.distube = new DisTube(client, disConfig);
    client.enabledModules.push("distube");
    client.distube.addSongFunctions = [];

    createPlaySongEvent(client);
    createEvent(client, "addSong", "ADDED SONG TO QUEUE: ");
    //createEvent(client, "playSong", "NOW PLAYING: ");
    createEvent(client, "searchNoResult", "COULD NOT FIND SONG: ");

    client.on(Discord.Events.VoiceStateUpdate, (oldState, newState) => {
        const member = oldState.member;
        const guild = oldState.guild;
       
        if(oldState.channel != undefined
            && oldState.channel.members.has(client.user.id)
            && oldState.channelId != newState.channelId){
            logDebug(client, 'Playing disconnect outro for ' + member.user.username);
            playOutro(client, member, guild);
        }
        
    });
}