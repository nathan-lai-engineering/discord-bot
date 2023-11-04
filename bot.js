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
const {log, logDebug} = require('./utils/log');
const {oracleQuery} = require('./utils/oracle');
const { REST, Routes } = require('discord.js');

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

// load login details for global usage
client.dbLogin = require('./oracledb.json');
client.debugMode = true;
client.enabledModules = ['distube', 'riot', 'tiktok', 'holidays', 'birthday'];


// =============================================================
// DYNAMIC CUSTOM MODULE HANDLING
// =============================================================
// get paths of all modules that are enabled
const modulePath = path.join(__dirname, 'bot_modules');
let modules = [];
for(let moduleName of fs.readdirSync(modulePath)){
  if(client.enabledModules.includes(moduleName)){
    modules.push(path.join(modulePath, moduleName));
  }
}

// =============================================================
// DYNAMIC COMMAND HANDLING
// =============================================================
client.commands = new Discord.Collection();
const commandJSONs = [];

// full paths of default available commands
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
var commandsFullPaths = commandFiles.map((file) => path.join(commandsPath, file));

// full paths of module specific commands
for(let moduleFullPath of modules){
  let moduleCommandsPath = path.join(moduleFullPath, 'commands');
  let moduleCommandFiles = fs.readdirSync(moduleCommandsPath).filter(file => file.endsWith('.js'));
  commandsFullPaths = commandsFullPaths.concat(moduleCommandFiles.map((file) => path.join(moduleCommandsPath, file)));
}

// loading all commands
for (const filePath of commandsFullPaths) {
	let command = require(filePath);
  commandJSONs.push(command.data.toJSON());
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	}
}
if(client.debugMode)
  console.log(client.commands.map((command) => command.data.name));

// =============================================================
// COMMAND DEPLOYMENT
// =============================================================
const { clientId, guildId, token } = require('./discordconfig.json');

// Construct and prepare an instance of the REST module
const rest = new Discord.REST({ version: '10' }).setToken(token);
log(`Started refreshing ${commandJSONs.length} application (/) commands.`);

// The put method is used to fully refresh all commands in the guild with the current set
rest.put(
  Discord.Routes.applicationGuildCommands(clientId, guildId),
  { body: commandJSONs },
)
.then(data => log(`Successfully reloaded ${data.length} application (/) commands.`))
.catch(console.error);

// =============================================================
// BOT OPERATION
// =============================================================
oracleQuery(`SELECT * FROM api_keys`).then(res => {
  // load api keys from database
  client.apiKeys = {};
  for(let apiKey of res.rows){
    client.apiKeys[apiKey[0]] = apiKey[1];
  }

  logDebug(client, 'API keys loaded');

  // Completely loads the modules
  for(let modulePath of modules){
    let moduleFullPath = path.join(modulePath, 'module.js');
    let module = require(moduleFullPath);
    module.load(client);
  }
  logDebug(client, 'Loaded modules: ' + client.enabledModules);

  // READY
  client.on("ready", () => {
    log('Bot connected!');
    client.user.setPresence({
      activities: [{name: 'Doing a little trolling'}],
      status: 'online'
    });
  });


  // =============================================================
  // COMMAND EXECUTION
  // =============================================================
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
      let commandString = interaction.commandName;
      if(interaction.options.getSubcommand(false) != null)
        commandString += " " + interaction.options.getSubcommand();
      if(interaction.options.data.length){
        for(let option of interaction.options.data){
          commandString += ` ${option.name}:${option.value}`;
        }
      }
      logDebug(client, `EXECUTING COMMAND: ${interaction.user.username} => ${commandString}`);
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
    }
  });

  // BOT LOGIN
  try {
    client.login(client.apiKeys['discord']);
  } catch (error) {
    console.log(error);
  }
});