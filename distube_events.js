const { DisTube } = require('distube');
const Discord = require("discord.js");
const {playOutro} = require('./commands/outro.js');

function createEvent(client, event, eventText){
    client.distube.on(event, (queue, song) => {
        replyMessage = eventText + String(song.name);
        queue.textChannel.send(replyMessage);
        if(client.debugMode)
          console.log(replyMessage);
    });
}

function createPlaySongEvent(client){
    client.distube.on("playSong", (queue, song) => {
        replyMessage = "NOW PLAYING: " + String(song.name);
        queue.textChannel.send(replyMessage);
        if(client.debugMode)
          console.log(replyMessage);
        if(client.distube.addSongFunctions.length > 0){
            console.log('next add song function');
            client.distube.addSongFunctions.pop()();
        };
    });
}

exports.load = (client, disConfig) => {
    client.distube = new DisTube(client, disConfig);
    client.enabledModules.push("distube");
    client.distube.addSongFunctions = [];

    createPlaySongEvent(client);
    createEvent(client, "addSong", "ADDED SONG TO QUEUE: ");
    //createEvent(client, "playSong", "NOW PLAYING: ");
    createEvent(client, "searchNoResult", "COULD NOT FIND SONG: ");

    client.on(Discord.Events.VoiceStateUpdate, (oldState, newState) => {
        let guildid = oldState.guild.id;
        if(client.voice.adapters.guildid.channelId == oldState.channelId && oldState.channelId != newState.channelId){
            playOutro();
        }
    });
}