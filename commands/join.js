const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('join')
		.setDescription('joins current vc'),
	async execute(interaction) {
        let vc = interaction.member.voice.channel;
        joinVoiceChannel({
            channelId: vc.id,
            guildId: vc.guild.id,
            adapterCreator: vc.guild.voiceAdapterCreator,
        });
        interaction.reply({content:'Joined the channel!', ephemeral: true});
	},
};