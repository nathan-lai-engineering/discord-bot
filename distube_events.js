function createEvent(client, event, eventText){
    client.distube.on(event, (queue, song) => {
        replyMessage = eventText + String(song.name);
        queue.textChannel.send(replyMessage);
        if(client.debugMode)
          console.log(replyMessage);
    });
}

exports.load = (client) => {
    createEvent(client, "playSong", "NOW PLAYING: ");
    createEvent(client, "addSong", "ADDED SONG TO QUEUE: ");
    createEvent(client, "searchNoResult", "COULD NOT FIND SONG: ");
}