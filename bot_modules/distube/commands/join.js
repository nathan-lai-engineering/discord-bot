const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('joins current vc'),
	async execute(interaction) {
        interaction.client.distube.voices.join(interaction.member.voice.channel);
        interaction.reply({content:'Joined the channel!', ephemeral: true});
	},
};