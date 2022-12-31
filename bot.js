/*
Discord bot created for funsies.
https://discord.com/oauth2/authorize?client_id=617027534042693664&scope=bot
*/

// =============================================================
// EXTERNAL FILES
// =============================================================
const Discord = require("discord.js");
const firebase = require("firebase-admin");
const distube = require("distube");

const FIREBASE_AUTH = require("./firebase.json");

// =============================================================
// CLIENT INITIALIZATION
// =============================================================
const client = new Discord.Client({
  intents:[
    "Guilds",
    "GuildMessages",
    "MessageContent",
    "GuildVoiceStates"
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
  client.debugMode = global.config.debugMode;
  console.log("Global config loaded.");
  if(client.debugMode) {
    console.log("Global config:\n", global.config);
  }

  // DISTUBE INTEGRATION
  const distubeIntegration = require("./distube_integration.js")
  client.distube = new distube.DisTube(client, global.config.distube);
  distubeIntegration.loadDistubeEventHandlers(client);
  

  // READY
  client.on("ready", () => {
    console.log("Bot connected!");
    client.user.setPresence({
      activities: [{name: 'Praising Zeta'}],
      status: 'online'
    });
  });
  
  // MESSAGE HANDLER
  client.on("messageCreate", (message) => {
    if (message.author.bot || 
        message.channel.type == 'dm' ||
        !message.content.toLowerCase().startsWith(global.config.prefix))
          return;
    
    const args = message.content.slice(global.config.prefix.length).trim().split(/ +/g);
    switch(args.shift().toLowerCase()){
      case "play":
        client.distube.play(message.member.voice.channel, args.join(" "), {
          member: message.member,
          textChannel: message.channel,
          message
        });
        break;
      default:
        break;
    }
  });

  // BOT LOGIN
  try {
    client.login(global.auth);
  } catch (error) {
    console.log(error);
  }
});
