const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clear')
		.setDescription('no more songs!'),
	async execute(interaction) {
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        if(!queue)
            return;
        interaction.reply(`CLEARED: ${interaction.client.distube.getQueue(interaction.guildId).songs.length} song(s).`);
        interaction.client.distube.stop(interaction.guildId);
        if(interaction.client.debugMode)
            console.log("Stopping music player.");
	},
};