module.exports = {
  name: "examine",
  description: "Gives info on server",
  syntax: "$examine",
  example: "$examine",
  database: false,
  execute(msg, args) {
    if (args.length > 0) {
      switch (args[0].toLowerCase()) {
        case "channels":
          console.log(msg.guild.channels);
          break;
        default:
          console.log(msg.guild);
      }
    }
    else {
      console.log(msg.guild);
      break;
    }
  },
};
