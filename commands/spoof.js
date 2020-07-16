module.exports = {
  name: "spoof",
  description: "Spoofs text as the bot",
  execute(msg, args) {
    const channel = msg.channel;
    msg.delete();
    channel.send(args.join(" "));
  },
};
