module.exports = {
    name: "clear",
    description: "Clears the queue",
    syntax: "clear",
    example: "clear",
    memory: true,
    execute(msg, args, client) {
        client.queue.current = "";
        client.queue.order = [];
        client.queue.data = {};
        client.queue.loop = false;
        client.dispatcher.end();
        delete client.dispatcher;
        msg.react("👍");
        msg.channel.send("💥💥💥 Queue cleared! 💥💥💥");
    },
};
