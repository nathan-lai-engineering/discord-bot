// =============================================================
// EXTERNAL FILES
// =============================================================
const fs = require("fs");
const Discord = require("discord.js");
const auth = require("./auth.json");
const config = JSON.parse(fs.readFileSync("./config.json"));

// =============================================================
// CONFIG VARIABLES
// =============================================================

// =============================================================
// MISC GLOBAL VARIABLES
// =============================================================
const client = new Discord.Client();

// =============================================================
// CLIENT INTIALIZING
// =============================================================
client.on("ready", () => {
  console.log("Connected!");
  client.user.setActivity("nathan", { type: "ACTIVE AND WATCHING" });
  console.log(config);
});

// =============================================================
// COMMAND AND MESSAGE CONTROL
// =============================================================
client.on("message", (msg) => {
  const prefix = config.main.prefix;

  // Messages by bots or without a prefix are ignored
  if (msg.author.bot || !msg.content.startsWith(prefix)) return;

  // Logs any commands with information in the console
  console.log({
    username: msg.author.username,
    userid: msg.author.id,
    server: msg.guild.name,
    serverid: msg.guild.id,
    channel: msg.channel.name,
    channelid: msg.channel.id,
    message: msg.content,
  });

  // COMMAND HANDLER
  // Handles all message commands and arguments

  // Removes prefix and splits message into command and arguments
  const args = msg.content.slice(prefix.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  if (command != null) {
    switch (command) {
      // TEST
      // Simple test command
      case "test":
        msg.channel.send("**test** test");
        break;

      // PUPPET
      // User can send a message through the bot as if the bot is the one talking
      case "puppet":
        if (args.length > 0) {
          const puppetMsg = args.join();
          console.log(puppetMsg);
          msg.channel.send(puppetMsg);
        }
        msg.delete();
        break;
    }
  }
});

// =============================================================
// BOT LOGIN
// =============================================================
try {
  client.login(auth.token);
} catch (error) {
  console.log(error);
}
