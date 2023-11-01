const { SlashCommandBuilder } = require('discord.js');
const {logDebug} = require('../../../utils/log');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Plays a music')
        .addStringOption(option => 
            option.setName("song")
            .setDescription("name of song to play")
            .setRequired(true)
        ),
	async execute(interaction) {
        if(!interaction.member.voice.channel){
            if(interaction.client.debugMode)
                logDebug(interaction.client, 'User not in a voice channel!');
            interaction.reply({content:'Should you not be in a voice channel', ephemeral: true});
            return;
        }
        let songUrl = interaction.options.getString('song');
        interaction.client.distube.play(interaction.member.voice.channel, songUrl, {
            member: interaction.member,
            textChannel: interaction.channel
        }); 
        interaction.reply({content:'Added to queue', ephemeral: true});
	},
};