const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('autoplay')
		.setDescription('toggles the autoplay feature'),
	async execute(interaction) {
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        if( !queue ||
            queue.songs.length <= 0)
                return interaction.channel.send("You'd need a song playing to enable autoplay");
        const autoplay = queue.toggleAutoplay()
        interaction.reply(`AutoPlay is now ${autoplay ? 'on' : 'off'}.`);
	},
};

