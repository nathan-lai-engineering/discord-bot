function createEvent(client, event, replyMessage){
    client.distube.on(event, (queue, song) => {
        replyMessage += String(song.name);
        queue.textChannel.send(replyMessage);
        if(client.debugMode)
          console.log(replyMessage);
    });
}

exports.loadDistubeEventHandlers = (client) => {
    createEvent(client, "playSong", "NOW PLAYING: ");
    createEvent(client, "addSong", "ADDED SONG TO QUEUE: ");
    createEvent(client, "searchNoResult", "COULD NOT FIND SONG: ");
}