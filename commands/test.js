module.exports = {
  name: "test",
  description: "Sends test message to channel",
  syntax: "test",
  example: "test",
  execute(msg, args) {
    msg.channel.send("**test** test");
  },
};
