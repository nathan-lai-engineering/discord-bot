/*
Discord bot created for funsies.
https://discord.com/oauth2/authorize?client_id=617027534042693664&scope=bot
*/

// =============================================================
// EXTERNAL FILES
// =============================================================
const fs = require("fs");
const path = require("path");
const Discord = require("discord.js");
const firebase = require("firebase-admin");

const FIREBASE_AUTH = require("./firebase.json");
const {log, logDebug} = require('./utils/log');

// =============================================================
// CLIENT INITIALIZATION
// =============================================================
const client = new Discord.Client({
  intents:[
    Discord.GatewayIntentBits.Guilds,
		Discord.GatewayIntentBits.GuildMessages,
		Discord.GatewayIntentBits.MessageContent,
    Discord.GatewayIntentBits.GuildVoiceStates
]
});

client.commands = new Discord.Collection();
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
    if(client.debugMode)
      console.log(client.commands);
	}
}

// =============================================================
// BOT OPERATION
// =============================================================

// INITIALIZE DATABASE

firebase.initializeApp({
  credential: firebase.credential.cert(FIREBASE_AUTH.credential),
  databaseURL: FIREBASE_AUTH.databaseURL
});

console.log("Database intialized.");
client.db = firebase.firestore();

client.db.collection('global').get().then((document) => {
  const docs = document.docs;
  let auth = docs[0].data()['discord']
  let debugMode = docs[1].data()['debugMode'];
  let distubeConfig = docs[2].data();

  client.debugMode = debugMode;
  client.enabledModules = [];
  client.messageListeners = [];

  console.log("Global config loaded.");
  logDebug(client, 'Auth: ' + auth);

  // DISTUBE MODULE
  const distubeModule = require("./distube_module.js");
  distubeModule.load(client, distubeConfig);

  // TikTok Embed MODULE
  const tiktokModule = require("./tiktok_module.js");
  tiktokModule.load(client);

  // RIOT tracker module
  const riotModule = require("./riot_module.js", docs[0].data()['riot']);
  riotModule.load(client);

  logDebug(client, "Modules loaded: " + client.enabledModules.toString());

  // READY
  client.on("ready", () => {
    console.log("Bot connected!");
    client.user.setPresence({
      activities: [{name: 'Doing a little trolling'}],
      status: 'online'
    });
  });

  // COMMAND HANDLER
  client.on(Discord.Events.InteractionCreate, async interaction => {
    // read the message
    if (!interaction.isChatInputCommand())
      return;

    
    // check for existing command
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
  
    // try executing command
    try {
      logDebug(client, 'EXECUTING COMMAND: ' + interaction.user.username + " => " + interaction.commandName);
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  });

  // MESSAGE CONTENT READER
  client.on(Discord.Events.MessageCreate, async message => {  
    for(key in client.messageListeners){
      client.messageListeners[key](message);
    }
  });

  // BOT LOGIN
  try {
    client.login(auth);
  } catch (error) {
    console.log(error);
  }
});
