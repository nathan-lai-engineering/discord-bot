module.exports = {
    name: "loop",
    description: "Toggles loop",
    syntax: "loop",
    example: "loop",
    memory: true,
    execute(msg, args, client) {
        msg.react("👍");
        if (client.queue.loop) {
            client.queue.loop = false;
            msg.channel.send("The queue will stop looping");
        }
        else {
            client.queue.loop = true;
            msg.channel.send("The queue will now loop");
        }
    },
};
