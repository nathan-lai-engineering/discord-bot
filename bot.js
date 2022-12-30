/*
Discord bot created for funsies.
https://discord.com/oauth2/authorize?client_id=617027534042693664&scope=bot
*/

// =============================================================
// EXTERNAL FILES
// =============================================================
const Discord = require("discord.js");
const firebase = require("firebase-admin");

const FIREBASE_AUTH = require("./firebase.json");

// =============================================================
// CLIENT INITIALIZATION
// =============================================================
const client = new Discord.Client({
  intents:[
    "Guilds",
    "GuildMessages",
    "MessageContent"
]
});

// =============================================================
// BOT OPERATION
// =============================================================

// INITIALIZE DATABASE
firebase.initializeApp({
  credential: firebase.credential.cert(FIREBASE_AUTH.credential),
  databaseURL: FIREBASE_AUTH.databaseURL
});
console.log("Database intialized.");

// LOAD GLOBAL VARIABLES FROM DATABASE
firebase.database().ref('global').once('value').then((snapshot) => {
  let global = snapshot.val();
  let debugMode = global.config.debugMode;
  console.log("Global config loaded.");
  if(debugMode) {
    console.log("Global config:\n", global.config);
  }

  // BOT LOGIN
  try {
    client.login(global.auth).then(() => console.log("Bot connected."));
  } catch (error) {
    console.log(error);
  }
});

/*
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
const client = new Discord.Client({
    intents:[
      "Guilds",
      "GuildMessages",
      "MessageContent"
  ]
});

// Creates a collection intended to store commands
client.commands = new Discord.Collection();

// Creates a list intended to store a queue for music
client.queue = {
  data: {},
  order: [],
  current: "",
  loop: false
};

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
  client.user.setActivity("nathan", { type: "ACTIVE" });
  console.log(config);
});

// =============================================================
// COMMAND AND MESSAGE CONTROL
// =============================================================
client.on("message", (msg) => {

  // Ignore these messages
  if (msg.author.bot ||
    msg.channel.type == "dm")
    return;

  // Messages without a prefix are ignored
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
    if (client.commands.get(command).memory) {
      client.commands.get(command).execute(msg, args, client);
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

*/