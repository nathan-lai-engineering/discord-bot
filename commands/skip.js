module.exports = {
    name: "skip",
    description: "Skips current song",
    syntax: "skip",
    example: "skip",
    memory: true,
    execute(msg, args, client) {
        if (client.dispatcher) client.dispatcher.end();
        msg.channel.send(`Skipping current song: ${client.queue.data[client.queue.current]["title"]}`);
    },
};
