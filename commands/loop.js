const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('loop')
		.setDescription('toggles loop'),
	async execute(interaction) {
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        if( !queue ||
            queue.songs.length <= 0)
                return interaction.reply("You'd need a song playing to loop.");
        queue.repeatMode == 0 ? queue.setRepeatMode(2) : queue.setRepeatMode(0);
        interaction.reply(`Looping is now ${queue.repeatMode != 0 ? 'on' : 'off'}.`);
	},
};