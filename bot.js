/*
Discord bot created for funsies.
https://discord.com/oauth2/authorize?client_id=617027534042693664&scope=bot
*/

// =============================================================
// EXTERNAL FILES
// =============================================================
const fs = require("fs");
const Discord = require("discord.js");
const firebase = require("firebase");
const utils = require("./utils.js");

const auth = require("./auth.json");
const { debug, count } = require("console");
const { finished } = require("stream");
const config = JSON.parse(fs.readFileSync("./config.json"));
const database_config = JSON.parse(fs.readFileSync("./database.json"));
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
// MISC GLOBAL VARIABLES
// =============================================================
firebase.initializeApp(database_config);
var database = firebase.database();
console.log("Database connected!")

// =============================================================
// INTIALIZING CLIENT
// =============================================================
const intents = new Discord.Intents([
  Discord.Intents.NON_PRIVILEGED,
  "GUILD_MEMBERS"
]);
const client = new Discord.Client({ ws: { intents } });

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
  console.log("Bot connected!");
  client.user.setActivity("nathan", { type: "ACTIVE AND WATCHING" });
  console.log(config);

  // Updating topic of counting channel to match config
  client.guilds.cache.forEach((key, value) => {
    let countingChannel = key.channels.cache.find(channel => channel.name.includes("counting"));
    if (debugMode)
      console.log(countingChannel.name);
    let newTopic = `${config.counting.chance * 100}% of earning ${config.counting.min} - ${config.counting.max} <:damasiodollar:865942969089785876> damasio dollars`
    if (countingChannel.topic != newTopic) {
      countingChannel.setTopic(newTopic)
        .then(newChannel => {
          if (debugMode)
            console.log(`Changed counting topic to ${newChannel.topic}`)
        })
        .catch(console.error);
    }
  });
});

// =============================================================
// COMMAND AND MESSAGE CONTROL
// =============================================================
client.on("message", (msg) => {

  // Private messages by bots are ignored
  if (msg.channel.type == "dm") return;

  // Messages by bots are ignored
  if (msg.author.bot) return;

  // MUTED HANDLER
  if (msg.member.roles.cache.some((role) => role.name === "Muted")) {
    if (debugMode) console.log(msg.author.username + ": " + msg.content);
    msg.delete();
    return;
  }

  // COUNTING CHANNEL
  if (msg.channel.name.toLowerCase().includes("counting")) {
    if (!msg.member.hasPermission("ADMINISTRATOR") && msg.content.startsWith(prefix)) {
      msg.delete();
      return;
    }
    if (!msg.content.startsWith(prefix)) {
      utils.readDatabase(`${msg.guild.id}/count`, database).then(currentCount => {
        if (msg.content.split(' ')[0] != (String)(currentCount + 1)) {
          msg.delete();
          return;
        }
        if (debugMode)
          console.log(`Updated count: ${currentCount + 1}`);
        utils.writeDatabase(`${msg.guild.id}/count`, currentCount + 1, database);

        let chance = config.counting.chance;
        if (msg.member.roles.cache.some((role) => role.name === "Bot Developer")) {
          chance = 1;
        }

        if (Math.random() <= chance) {
          let money = Math.ceil(Math.random() * (config.counting.max - 9) + config.counting.min);
          utils.addMoney(database, msg.guild.id, msg.author.id, money);
          msg.react("<:damasiodollar:865942969089785876>");
          msg.channel.send(`${msg.author} won ${money} <:damasiodollar:865942969089785876> damasio dollars!`);
        }
      })
        .catch(() => {
          console.log("Error in counting");
        });
    }
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
    if (client.commands.get(command).database) {
      client.commands.get(command).execute(msg, args, database);
    }
    else {
      client.commands.get(command).execute(msg, args);
    }
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