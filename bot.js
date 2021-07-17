/*
Discord bot created for funsies.
https://discord.com/oauth2/authorize?client_id=617027534042693664&scope=bot
*/

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
const prefix = config.main.prefix;
const debugMode = config.main.debugMode;

// =============================================================
// MISC GLOBAL VARIABLES
// =============================================================
const currDate = new Date();

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

  // Messages by bots are ignored
  if (msg.author.bot) return;

  // MUTED HANDLER
  if (msg.member.roles.cache.some((role) => role.name === "Muted")) {
    if (debugMode) console.log(msg.author.username + ": " + msg.content);
    msg.delete();
    return;
  }

  // COUNTING CHANNEL
  if (msg.channel.name.toLowerCase().includes("counting") && !msg.content.startsWith(prefix)) {
    fs.readFile("data/count.txt", "utf-8", (err, data) => {
      if (err) console.log(err);
      data = parseInt(data);
      if (Number.isInteger(data)) {
        if (!msg.content.startsWith((String)(data + 1))) {
          msg.delete();
          return;
        }
        else {
          fs.writeFile("data/count.txt", data + 1, (err) => {
            if (err) console.log(err);
          });
        }
      }
      else {
        if (debugMode) console.log("Error reading count.txt");
      }
    });
  }

  // Messages by bots or without a prefix are ignored
  if (!msg.content.startsWith(prefix)) return;

  // COMMAND HANDLER
  // Handles all message commands and arguments

  // Removes prefix and splits message into command and arguments
  const args = msg.content.slice(prefix.length).trim().split(" ");
  const command = args.shift().toLowerCase();

  // Dynamic command handler using commands stored in commands folder
  try {
    client.commands.get(command).execute(msg, args);
  } catch (error) {
    console.log("Invalid command!");
    console.log(error);
  } finally {
    // Logs any commands with information in the console
    if (debugMode) {
      console.log(msgInfo(msg));
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

// =============================================================
// DEBUG MODE
// =============================================================
function msgInfo(msg) {
  return {
    date: currDate,
    username: msg.author.username,
    userid: msg.author.id,
    server: msg.guild.name,
    serverid: msg.guild.id,
    channel: msg.channel.name,
    channelid: msg.channel.id,
    message: msg.content,
  };
}
