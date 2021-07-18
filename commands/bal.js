module.exports = {
  name: "bal",
  description: "acquires balance of user",
  syntax: "$$balance",
  example: "$$balance",
  database: true,
  execute(msg, args, database) {
    var utils = require("../utils.js")
    msg.react("👍");

    var target = msg.author.id;
    if (args.length >= 1) {
      target = args[0].replace("<", "").replace("!", "").replace("@", "").replace(">", "");
      console.log(target);
    }
    utils.getMoney(database, msg.guild.id, target)
      .then(money => {
        let bal = money;
        if (bal == null || bal == NaN) {
          bal = 0;
        }
        msg.channel.send(`You have ${bal} <:damasiodollar:865942969089785876> damasio dollars!`);
      })
      .catch(() => {
        console.log("Error in bal");
      });
  },
};