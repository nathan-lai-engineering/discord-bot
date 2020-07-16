module.exports = {
  name: "test",
  description: "Sends test message to channel",
  execute(msg, args) {
    msg.channel.send("**test** test");
  },
};
