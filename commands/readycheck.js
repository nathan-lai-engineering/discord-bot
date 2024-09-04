const { SlashCommandBuilder } = require('discord.js');
const Discord = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('readycheck')
		.setDescription('ready checks the specified people'),
	async execute(interaction) {
        interaction.reply({content: `Creating ready check...`, ephemeral:true})
        var embed = new Discord.EmbedBuilder()
            .setColor(0xf4d03f)
            .setTitle('Gamer Ready Check')
            .setDescription('Waiting for all responses...')
            .setThumbnail('https://raw.githubusercontent.com/nathan-lai-engineering/discord-bot/master/assets/yellow%20question.png')

        var ready = new Discord.ButtonBuilder()
            .setCustomId('gamerready')
            .setLabel('I am READY')
            .setStyle(Discord.ButtonStyle.Success)

        var notReady = new Discord.ButtonBuilder()
            .setCustomId('gamernotready')
            .setLabel('I am NOT ready')
            .setStyle(Discord.ButtonStyle.Danger)

        var row = new Discord.ActionRowBuilder()
            .addComponents(ready, notReady)

        interaction.channel.send({embeds: [embed], components: [row]})
    }
}