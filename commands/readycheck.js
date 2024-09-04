const { SlashCommandBuilder } = require('discord.js');
const Discord = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('readycheck')
		.setDescription('ready checks the specified people'),
	async execute(interaction) {
        interaction.reply({content: `Creating ready check...`, ephemeral:true})
        var embed = new Discord.EmbedBuilder()
            .setTitle('Gamer Ready Check')
        
        embed = editEmbedInProgress(embed)

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

        const readyCheck = await interaction.channel.send({embeds: [embed], components: [row]})

        try{
            while(true){
                const confirmation = await readyCheck.awaitMessageComponent({time: 60_000})

                if(confirmation.customId === 'gamerready'){
                    await confirmation.update({embeds: [editEmbedReady(embed)], components: [row]})
                } else if(confirmation.customId === 'gamernotready') {
                    await confirmation.update({embeds: [editEmbedNotReady(embed)], components: [row]})
                }
            }
        } catch (e) {
            await readyCheck.edit({embeds: [editEmbedNotReady(embed)], components: []})
        }
    }
}

function editEmbedReady(embed){
    return embed
        .setColor(0x18e327)
        .setDescription('Everyone is ready!')
        .setThumbnail('https://raw.githubusercontent.com/nathan-lai-engineering/discord-bot/master/assets/green%20ready.png')
}

function editEmbedNotReady(embed){
    return embed
        .setColor(0xe32b18)
        .setDescription('Everyone is not ready.')
        .setThumbnail('https://raw.githubusercontent.com/nathan-lai-engineering/discord-bot/master/assets/red%20not%20ready.png')
}

function editEmbedInProgress(embed){
    return embed
        .setColor(0xf4d03f)
        .setDescription('Waiting for all responses...')
        .setThumbnail('https://raw.githubusercontent.com/nathan-lai-engineering/discord-bot/master/assets/yellow%20question.png')
}