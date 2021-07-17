module.exports = {
  name: "test",
  description: "Sends test message to channel",
  syntax: "test",
  example: "test",
  database: false,
  execute(msg, args) {
    msg.channel.send("**test** test");
  },
};
