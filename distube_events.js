const { DisTube } = require('distube');

function createEvent(client, event, eventText){
    client.distube.on(event, (queue, song) => {
        replyMessage = eventText + String(song.name);
        //queue.textChannel.send(replyMessage);
        if(client.debugMode)
          console.log(replyMessage);
        song.metadata.i.reply(replyMessage);
    });
}

exports.load = (client, disConfig) => {
    client.distube = new DisTube(client, disConfig);
    client.enabledModules.push("distube");

    createEvent(client, "playSong", "NOW PLAYING: ");
    createEvent(client, "addSong", "ADDED SONG TO QUEUE: ");
    createEvent(client, "searchNoResult", "COULD NOT FIND SONG: ");
}