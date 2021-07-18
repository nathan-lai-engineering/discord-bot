module.exports = {
  name: "spam",
  description: "Spams a message a set number of times",
  syntax: "spam <integer> <message>",
  example: "spam 100 @blazeris",
  database: false,
  execute(msg, args) {
    var count = args[0];
    var toSend = "";
    for (var i = 1; i < args.length; i++) {
      toSend += args[i];
    }

    if (toSend.length > 0) {
      for (var i = 0; i < count; i++) {
        msg.channel.send(toSend)
      }
    }
  },
};