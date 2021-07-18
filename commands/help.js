module.exports = {
  name: "help",
  description:
    "Gives list for all commands or gives syntax for specific commands",
  syntax: "help [command name]",
  example: "help spoof",
  database: false,
  execute(msg, args) {
    const Discord = require("discord.js");
    const fs = require("fs");
    const prefix = msg.content.slice(0, msg.content.indexOf("help"));
    const commandFiles = fs
      .readdirSync("./commands")
      .filter((file) => file.endsWith(".js"));

    msg.react("👍");
    if (args.length < 1) {
      const helpList = new Discord.MessageEmbed()
        .setTitle("❓List of Commands❓");
      for (var i = 0; i < commandFiles.length; i++) {
        var commandSplit = commandFiles[i].split('.');
        var commandName = commandSplit[0];

        var fileDir = `./${commandName}.js`;
        var fileData = require(fileDir);

        helpList.addField(fileData.syntax, fileData.description);

      }
      msg.channel.send(helpList);
    }
    else {
      var fileDir = `./${args[0]}.js`;
      var fileData = require(fileDir);
      const helpCommand = new Discord.MessageEmbed()
        .setTitle(fileData.name)
        .setDescription(fileData.description)
        .addField(`Syntax: ${fileData.syntax}`, `Usage: ${fileData.example}`);
      msg.channel.send(helpCommand);
    }
  },
};
