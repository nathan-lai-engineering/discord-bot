const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('speech')
		.setDescription('toggles speech mode'),
	async execute(interaction) {
		if(!(interaction.client.enabledModules.includes("speech"))){
			interaction.reply("Speech recognition module not enabled.");
			return;
		}
		let toggle = !interaction.client.speechDetect;
		for(let [guildName, guildVoice] of interaction.client.distube.voices.collection){
			guildVoice.setSelfDeaf(!toggle);
		}
		interaction.client.speechDetect = toggle;
        interaction.reply(`Speech detection toggled ${interaction.client.speechDetect ? 'on' : 'off'}.`);
	},
};

