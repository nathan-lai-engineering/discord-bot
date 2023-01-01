const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('skip')
		.setDescription('skips the current song'),
	async execute(interaction) {
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        if( !queue ||
            (!queue.autoplay && queue.songs.length <= 1))
                return;

        if(queue.songs.length == 1){
            await interaction.client.distube.stop(interaction.guildId);
            if(interaction.client.debugMode)
                console.log("Stopping music player.");
            return interaction.reply("No more songs, removing queue.");
        }
        interaction.reply("SKIPPING SONG");
        queue.skip();
	},
};