const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('queue')
		.setDescription('see the music queue'),
	async execute(interaction) {
		const embed = new EmbedBuilder()
            .setColor(0xa8a8a8)
            .setTitle("No music :(")

        let songsInQueue = 0;
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        let totalDuration = 0;
        if(queue) {
            songsInQueue = queue.songs.length;
            if(songsInQueue > 0){
                embed.setTitle(queue.songs[0].name)
                    .setAuthor({name: 'Now playing...'})
                    .setDescription(`${queue.songs[0].uploader.name} - ${new Date(queue.songs[0].duration * 1000).toISOString().slice(11, 19)}`)
                    .setURL(queue.songs[0].url)
                    .setThumbnail(queue.songs[0].thumbnail);
                for(let i = 1; i < Math.min(songsInQueue, 26); i++){
                    embed.addFields({name: `[${i}] ${queue.songs[i].name}`, 
                                    value: `${queue.songs[i].uploader.name} - ${new Date(queue.songs[i].duration * 1000).toISOString().slice(11, 19)}`});
                }
                queue.songs.forEach((song) => {
                    totalDuration += song.duration;
                });
            }
            embed.setFooter({text:`Songs in queue: ${songsInQueue}\tLooping: ${queue.repeatMode != 0 ? 'On' : 'Off'}\tAutoPlay: ${queue.autoplay ? 'On' : 'Off'}\tTotal Duration: ${new Date(totalDuration * 1000).toISOString().slice(11, 19)}`});
        }
        interaction.reply({embeds: [embed]});
	},
};

