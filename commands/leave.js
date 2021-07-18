module.exports = {
  name: "amadeusleave",
  description: "Admin command that allows the bot to leave without needing guild permissions",
  syntax: "leave",
  example: "leave",
  database: false,
  execute(msg, args) {
    const code = Math.random().toString(36).substr(2, 10);
    console.log(code);
    msg.channel.send(
      "Confirmation code sent in console, reply with code to force bot to leave"
    );
    const filter = (m) => m.content == code;
    const collector = msg.channel.createMessageCollector(filter, {
      time: 15000,
    });
    collector.on("collect", (m) => {
      console.log(
        "Code confirmed, bot leaving server " +
        msg.guild.name +
        "  " +
        msg.guild.id
      );
      msg.channel.send("Code confirmed, bot leaving");
      msg.guild.leave();
      collector.stop();
    });
  },
};
