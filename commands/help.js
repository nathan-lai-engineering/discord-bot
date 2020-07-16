module.exports = {
  name: "help",
  description:
    "Gives list for all commands or gives syntax for specific commands",
  syntax: "help <empty, or specific command>",
  example: "help spoof",
  execute(msg, args) {
    const Discord = require("discord.js");
    const fs = require("fs");
    const prefix = msg.content.slice(0, msg.content.indexOf("help"));
    const commandFiles = fs
      .readdirSync("./commands")
      .filter((file) => file.endsWith(".js"));
    if (args.isEmpty()) {
      const helpList = new Discord.MessageEmbed()
        .setTitle("List of Commands")
        .addFields(commandFiles);
      msg.channel.send(helpList);
    }
  },
};
