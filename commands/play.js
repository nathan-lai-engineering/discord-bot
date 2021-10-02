const queue = require("./queue");

module.exports = {
    name: "play",
    description: "Bot joins channel and plays music",
    syntax: "play",
    example: "play",
    database: false,
    memory: true,
    execute(msg, args, client) {
        const ytdl = require("ytdl-core");
        const ytsr = require("ytsr");
        const ytpl = require("ytpl");


        function isURL(url) {
            try {
                checkURL = new URL(url);
            }
            catch (error) {
                return false;

            }
            return true;
        }

        function refreshQueue() {
            console.log("Reseting queue...");
            client.queue.current = "";
            client.queue.order = [];
            client.queue.data = {};
            client.queue.loop = false;
            delete client.dispatcher;
        }

        function addData(url) {
            client.queue.order.push(url);
            if (!(url in client.queue.data)) {
                console.log("")
                ytdl.getBasicInfo(url).then((info) => {
                    client.queue.data[url] = {
                        title: info["videoDetails"]["title"],
                        thumbnail: info["videoDetails"]["thumbnails"][info["videoDetails"]["thumbnails"].length - 1]["url"]
                    };
                    console.log(url);
                });
            }
        }

        function nextVideo(connection) {
            if (client.queue.order[0]) {
                play(connection);
            } else {
                refreshQueue();
            }
        }

        function shiftVideo() {
            console.log("shifting");
            if (client.queue.order.length <= 0) {
                refreshQueue();
            }
            let back = client.queue.order.shift();
            if (client.queue.loop) {
                console.log(back);
                addData(back);
            }
        }

        function play(connection) {
            console.log("playing");
            console.log(client.queue.order);
            if (ytdl.validateURL(client.queue.order[0])) {
                try {
                    console.log(client.queue.order[0]);
                    client.dispatcher = connection.play(ytdl(client.queue.order[0], { filter: "audioonly" }));
                    console.log("connection made");
                    client.queue.current = client.queue.order[0];
                    shiftVideo();
                    console.log(client.queue.order);
                    client.dispatcher.on("close", () => {
                        console.log("Voice connection closed");
                        //refreshQueue();
                    });
                    client.dispatcher.on("finish", () => {
                        nextVideo(connection)
                    });
                }
                catch (error) {
                    console.log(error);
                    shiftVideo();
                    nextVideo(connection);
                }
            }
            else {
                console.log("Invalid video: " + client.queue.order[0])
                shiftVideo();
                nextVideo(connection);
            }
        }

        function startPlay(msg, client) {
            if (!msg.guild.me.voice.channel || msg.guild.me.voice.channel.id != msg.member.voice.channel.id || !client.dispatcher)
                msg.member.voice.channel.join().then((connection) => {
                    if (!client.dispatcher) {
                        play(connection);
                    }
                });
        }

        if (!args[0]) {
            msg.channel.send("Video needed");
            return;
        }

        if (!msg.member.voice.channel) {
            msg.channel.send("Be in a vc idiot");
            return;
        }

        if (client.voice.connections.size <= 0) {
            refreshQueue();
        }

        if (!isURL(args[0])) {
            searchResults = ytsr(args[0]);
        }

        if (ytdl.validateURL(args[0])) {
            console.log("works");
            addData(args[0]);
            startPlay(msg, client)
        }
        else {
            console.log("no works");
            ytpl.getPlaylistID(args[0])
                .then((playlistID) => {
                    ytpl(playlistID)
                        .then((playlistData) => {
                            let playlist = playlistData["items"];
                            for (video of playlist) {
                                addData(video["url"]);
                                //console.log(video["url"]);
                            }
                            startPlay(msg, client)
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                })
                .catch((error) => {
                    ytsr(args.join(" "), { limit: 1, pages: 1 })
                        .then((results) => {
                            if (results["items"].length > 0) {
                                console.log(results["items"][0]["url"]);
                                addData(results["items"][0]["url"]);
                            }
                            startPlay(msg, client);
                        })
                        .catch((error) => {
                            console.log(error);
                        });
                });
        }
        msg.react("👍");
    },
};