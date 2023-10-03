const { SlashCommandBuilder } = require('discord.js');
const { joinVoiceChannel } = require('@discordjs/voice');
const {logDebug} = require('../utils/log');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('leave')
		.setDescription('leaves vc'),
	async execute(interaction) {
        logDebug(interaction.client, "Force leave channel ");
        let voice = interaction.client.distube.voices.get(interaction.guild)
        if(voice != undefined) {
            interaction.reply({content:'Leaving', ephemeral: true})
            voice.leave();
        }
        else 
            interaction.reply({content: 'Not even in a voice channel', ephemeral: true});
        
	},
};