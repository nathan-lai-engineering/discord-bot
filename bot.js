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

// =============================================================
// INTIALIZING CLIENT
// =============================================================
const client = new Discord.Client();

// Creates a collection intended to store commands
client.commands = new Discord.Collection();

// Reads every file in the commands folder and creates an array of them
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));

// Adds the array of commands to the commands collection
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

// Connecting the bot after initializing all other modules
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

  try {
    client.commands.get(command).execute(msg, args);
  } catch (error) {
    console.log("Invalid command executed!");
  }

  /*
  if (command != null) {
    switch (command) {
      // TEST
      // Simple test command
      case "test":
        client.commands.get("test").execute(msg, args);
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
  */
});

// =============================================================
// BOT LOGIN
// =============================================================
try {
  client.login(auth.token);
} catch (error) {
  console.log(error);
}
