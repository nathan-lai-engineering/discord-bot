const { SlashCommandBuilder } = require('discord.js');
const Discord = require("discord.js");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('readycheck')
		.setDescription('ready checks the specified people')
        .addMentionableOption(option =>
            option
                .setName('person1')
                .setDescription('Person 1 to ready check'))
        .addMentionableOption(option =>
            option
                .setName('person2')
                .setDescription('Person 2 to ready check'))
        .addMentionableOption(option =>
            option
                .setName('person3')
                .setDescription('Person 3 to ready check'))
        .addMentionableOption(option =>
            option
                .setName('person4')
                .setDescription('Person 4 to ready check'))
        .addMentionableOption(option =>
            option
                .setName('person5')
                .setDescription('Person 5 to ready check')),
	async execute(interaction) {

        // add all members, includes person starting the ready check
        var members = {
            [interaction.user.id]: {
                "user": interaction.user,
                "status": 0
            }
        }

        for(let interactionOption of interaction.options.data){
            console.log(interactionOption.user.bot)
            if(interactionOption.user.bot != true)
                members[interactionOption.user.id] = {
                    "user": interactionOption.user,
                    "status": 0
                }
        }
        
        console.log(members)

        interaction.reply({content: `Creating ready check...`, ephemeral:true})
        var embed = new Discord.EmbedBuilder()
            .setTitle('Gamer Ready Check')
            .setFooter({
                text: 'Started by: ' + interaction.user.username, 
                iconURL: interaction.user.displayAvatarURL()
            });
        
        embed = editEmbedFields(editEmbedInProgress(embed), members)

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
            // basically keep the buttons interactable until a minute passes without pressing
            let done = false
            while(!done){
                const confirmation = await readyCheck.awaitMessageComponent({time: 60_000})
                let authorId = confirmation.user.id

                if(confirmation.customId === 'gamerready'){
                    if(Object.keys(members).includes(authorId))
                        members[authorId]['status'] = 1
                } else if(confirmation.customId === 'gamernotready') {
                    if(Object.keys(members).includes(authorId))
                        members[authorId]['status'] = -1
                }

                let statusSum = 0
                for(const [userId, user] of Object.entries(members)){
                    let userStatus = user['status']
                    if(userStatus == -1){
                        embed.setFields()
                        await confirmation.update({embeds: [editEmbedFields(editEmbedNotReady(embed), members)], components: []})
                        return
                    }
                    statusSum += userStatus
                }
                if(statusSum == Object.keys(members).length){
                    await confirmation.update({embeds: [editEmbedFields(editEmbedReady(embed), members)], components: []})
                    return
                }
                await confirmation.update({embeds: [editEmbedFields(editEmbedInProgress(embed), members)], components: [row]})
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

function editEmbedFields(embed, members){
    let embedFields = []
    for(const [userId, user] of Object.entries(members)){
        let statusString = ''
        switch(user.status){
            case -1:
                statusString = `<:rednotready:1280723659933093970> ${user.user.username} is not ready! `
                break
            case 0:
                statusString = `<:yellowquestion:1280723678882959485> ${user.user.username} is still deciding! `
                break
            case 1:
                statusString = `<:greenready:1280723636067504220> ${user.user.username} is ready! `
                break
            default:
        }
        embedFields.push({
            name: statusString,
            value: ' '
        })
    }
    return embed.setFields(...embedFields)
}