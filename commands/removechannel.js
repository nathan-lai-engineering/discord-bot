module.exports = {
  name: "removechannel",
  description: "Removes a target channel",
  syntax: "$removechannel <channel id>",
  example: "$removechannel 12345667",
  execute(msg, args) {
    const targetChannel = args[0];
    const foundChannel = msg.guild.channels.cache.get(targetChannel);

    const code = Math.random().toString(36).substr(2, 10);
    console.log(code);
    msg.channel.send(
      `User not admin, confirmation code sent in console, reply with code to delete channel ${foundChannel}`
    );
    const filter = (m) => m.content == code;
    const collector = msg.channel.createMessageCollector(filter, {
      time: 15000,
    });

    collector.on("collect", (m) => {
      console.log("Code confirmed, deleting channel " + foundChannel);
      msg.channel.send(`Code confirmed, channel ${foundChannel} deleted`);

      try {
        foundChannel.delete();
      } catch (error) {
        console.log(error);
      }

      collector.stop();
    });
  },
};
