module.exports = {
    name: "shuffle",
    description: "Shuffles the queue",
    syntax: "shuffle",
    example: "shuffle",
    memory: true,
    execute(msg, args, client) {
        let currentIndex = msg.client.queue.order.length, randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [msg.client.queue.order[currentIndex], msg.client.queue.order[randomIndex]] =
                [msg.client.queue.order[randomIndex], msg.client.queue.order[currentIndex]];
        }
        msg.channel.send(`${msg.client.queue.order.length} songs have been randomly shuffled!`);
    },
};
