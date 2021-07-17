module.exports = {
  name: "spoof",
  description: "Spoofs text as the bot",
  syntax: "spoof <message>",
  example: "spoof Hi! This is the bot talking!",
  database: false,
  execute(msg, args) {
    const channel = msg.channel;
    msg.delete();
    channel.send(args.join(" "));
  },
};
