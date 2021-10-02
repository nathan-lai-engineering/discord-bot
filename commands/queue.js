const { DiscordAPIError, MessageEmbed, Message } = require("discord.js");

module.exports = {
    name: "queue",
    description: "Sends the queue",
    syntax: "queue",
    example: "queue",
    memory: true,
    execute(msg, args, client) {
        const Discord = require("discord.js");

        if (client.voice.connections.size <= 0) {
            console.log("Reseting queue...");
            client.queue.current = "";
            client.queue.order = [];
            client.queue.data = {};
            client.queue.loop = false;
            delete client.dispatcher;
        }

        let queueEmbed = new Discord.MessageEmbed()
            .setAuthor(`Current queue: ${client.queue.order.length}`);
        queueEmbed.setTitle("Now playing");
        if (client.queue.current.length > 0 || client.queue.current.length > 0) {
            queueEmbed.setDescription(`[${client.queue.data[client.queue.current]["title"]}](${client.queue.current})`);
            queueEmbed.setThumbnail(client.queue.data[client.queue.current]["thumbnail"]);
        }
        else {
            queueEmbed.setDescription("Nothing");
        }
        let count = 1;
        for (let video of client.queue.order) {
            if (count <= 24) {
                queueEmbed.addField(`${count}.`, `[${client.queue.data[video]["title"]}](${video})`);
            }
            count++;
        }
        queueEmbed.setFooter(`Looping: ${client.queue.loop}`);

        msg.channel.send(queueEmbed);
    },
};
