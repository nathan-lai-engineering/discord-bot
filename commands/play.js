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

        function refreshQueue() {
            client.queue.current = "";
            client.queue.order = []
            client.queue.data = {};
            client.queue.loop = false;
            delete client.dispatcher;
        }

        function addData() {
            if (!(client.queue.order[0] in client.queue.data)) {
                let temp = client.queue.order[0];
                ytdl.getBasicInfo(temp).then((info) => {
                    console.log(info["videoDetails"]["title"]);
                    client.queue.data[temp] = info["videoDetails"]["title"];
                });
            }
        }

        function nextVideo(connection, msg) {
            if (client.queue.order[0]) {
                play(connection, msg);
            } else {
                refreshQueue();
            }
        }

        function shiftVideo() {
            let back = client.queue.order.shift();
            if (client.queue.loop) {
                console.log(back);
                client.queue.order.push(back);
                addData();
            }
        }

        function play(connection, msg) {
            if (ytdl.validateURL(client.queue.order[0])) {
                try {
                    client.dispatcher = connection.play(ytdl(client.queue.order[0], { filter: "audioonly" }));
                    client.queue.current = client.queue.order[0];
                    shiftVideo();
                    client.dispatcher.on("close", () => {
                        refreshQueue();
                    });
                    client.dispatcher.on("finish", () => {
                        nextVideo(connection, msg)
                    });
                }
                catch (error) {
                    console.log(error);
                    shiftVideo();
                    nextVideo(connection, msg)
                }
            }
            else {
                console.log("Invalid video: " + client.queue.order[0])
                shiftVideo();
                nextVideo(connection, msg)
            }
        }

        if (!args[0]) {
            msg.channel.send("Link needed");
            return;
        }
        if (!msg.member.voice.channel) {
            msg.channel.send("Be in a vc idiot");
            return;
        }

        client.queue.order.push(args[0]);
        addData();

        console.log(client.queue);
        if (client.dispatcher) console.log("dispatcher exists");

        if (!msg.guild.me.voice.channel || msg.guild.me.voice.channel.id != msg.member.voice.channel.id || !client.dispatcher)
            msg.member.voice.channel.join().then((connection) => {
                if (!client.dispatcher) {
                    play(connection, msg);
                }
            }
            );

    },
};