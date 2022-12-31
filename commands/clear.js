const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('clear')
		.setDescription('no more songs!'),
	async execute(interaction) {
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        if( !queue ||
            (!queue.autoplay && queue.songs.length <= 1))
                return;
        await interaction.client.distube.stop(interaction.guildId);
        interaction.channel.send("Queue and settings cleared");
        if(interaction.client.debugMode)
            console.log("Stopping music player.");
	},
};