function createEvent(client, event, eventText){
    client.distube.on(event, (queue, song) => {
        replyMessage = eventText + String(song.name);
        queue.textChannel.send(replyMessage);
        if(client.debugMode)
          console.log(replyMessage);
    });
}

exports.loadDistube = (client) => {
    createEvent(client, "playSong", "NOW PLAYING: ");
    createEvent(client, "addSong", "ADDED SONG TO QUEUE: ");
    createEvent(client, "searchNoResult", "COULD NOT FIND SONG: ");

    client.distube.on('error', (channel, e) => {
        if (channel) channel.send(`${client.emotes.error} | An error encountered: ${e.toString().slice(0, 1974)}`)
        else console.error(e)
    });
    
    client.distube.on('empty', channel => 
        channel.send('Voice channel is empty! Leaving the channel...'
    ));
}