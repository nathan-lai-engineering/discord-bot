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
const { getDefaultHighWaterMark } = require("stream");

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

  console.log("Global config loaded.");
  if(client.debugMode) {
    console.log('Auth:', auth);
    console.log('Distube config:', distubeConfig);
  }

  // DISTUBE MODULE
  const distubeEvents = require("./distube_events.js");
  distubeEvents.load(client, distubeConfig);

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
    if (!interaction.isChatInputCommand()) return;
  
    const command = interaction.client.commands.get(interaction.commandName);
  
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
  
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  });

  // BOT LOGIN
  try {
    client.login(auth);
  } catch (error) {
    console.log(error);
  }
});

/*
// LOAD GLOBAL VARIABLES FROM DATABASE
firebase.database().ref('global').once('value').then((snapshot) => {
  let global = snapshot.val();
  client.debugMode = global.config.debugMode;
  client.trigger = global.config.trigger;
  client.enabledModules = [];
  console.log("Global config loaded.");
  if(client.debugMode) {
    console.log("Global config:\n", global.config);
  }

  // DISTUBE MODULE
  const distubeEvents = require("./distube_events.js");
  distubeEvents.load(client, global.config.distube);

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
    if (!interaction.isChatInputCommand()) return;
  
    const command = interaction.client.commands.get(interaction.commandName);
  
    if (!command) {
      console.error(`No command matching ${interaction.commandName} was found.`);
      return;
    }
  
    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  });

  // BOT LOGIN
  try {
    client.login(global.auth);
  } catch (error) {
    console.log(error);
  }
});
*/