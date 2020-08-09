module.exports = {
  name: "examine",
  description: "Gives info on server",
  syntax: "$examine",
  example: "$examine",
  execute(msg, args) {
    switch (args[0].toLowerCase()) {
      case "channels":
        console.log(msg.guild.channels);
        break;
      default:
        console.log(msg.guild);
        break;
    }
  },
};
