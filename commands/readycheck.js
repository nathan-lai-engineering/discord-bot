const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('readycheck')
		.setDescription('ready checks the specified people'),
	async execute(interaction) {
        interaction.reply({content: `Creating ready check...`, ephemeral:true})
        var embed = new Discord.EmbedBuilder()
            .setColor(0xf4d03f)
            .setTitle('Gamer Ready Check')
            .setThumbnail('https://raw.githubusercontent.com/nathan-lai-engineering/discord-bot/master/assets/yellow%20question.png')

        interaction.channel.send(embed)
    }
}