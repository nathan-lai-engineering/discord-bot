

module.exports = {
  name: "setcount",
  description: "sets the count value",
  syntax: "setcount <integer>",
  example: "setcount 500",
  database: false,
  execute(msg, args) {
    var fs = require("fs")
    if (msg.channel.name.toLowerCase().includes("counting") && msg.member.hasPermission("ADMINISTRATOR")) {
      var integer = args[0];
      integer = parseInt(integer);
      if (Number.isInteger(integer)) {
        fs.writeFile("./data/count.txt", integer, (err) => {
          if (err) console.log(err);
          msg.react("👍");
        });
      }
    }
    else {
      msg.reply("you're too big n0b to use this command");
    }

  },
};