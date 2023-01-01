const { SlashCommandBuilder } = require('discord.js');

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
                console.log("User not in a voice channel!");
            interaction.reply("Shouldn't you be in a voice channel?");
            return;
        }

        interaction.client.distube.play(interaction.member.voice.channel, interaction.options.getString('song'), {
            member: interaction.member,
            textChannel: interaction.channel,
            metadata: {i: interaction}
        }); 
	},
};