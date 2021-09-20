const { DiscordAPIError, MessageEmbed, Message } = require("discord.js");

module.exports = {
    name: "queue",
    description: "Sends the queue",
    syntax: "queue",
    example: "queue",
    database: false,
    memory: true,
    execute(msg, args, client) {
        const Discord = require("discord.js");
        let queueEmbed = new Discord.MessageEmbed()
            .setTitle(`Current queue: ${client.queue.order.length}`);
        if (client.queue.current.length > 0) {
            queueEmbed.addField("Now playing", `[${client.queue.data[client.queue.current]}](${client.queue.current})`);
        }
        else {
            queueEmbed.addField("Now playing", "Nothing");
        }
        let count = 1;
        for (let video of client.queue.order) {
            if (count <= 24) {
                queueEmbed.addField(`${count}.`, `[${client.queue.data[video]}](${video})`);
            }
            count++;
        }
        queueEmbed.setFooter(`Looping: ${client.queue.loop}`);
        msg.channel.send(queueEmbed);
    },
};
