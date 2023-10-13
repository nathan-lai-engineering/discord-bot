const { SlashCommandBuilder } = require('discord.js');
const {log, logDebug} = require('../utils/log.js');
const firebase = require("firebase-admin");

module.exports = {
	data: new SlashCommandBuilder()
		.setName('riot')
		.setDescription('all riot games related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('set the channel for riot games notifications')),
	async execute(interaction) {
        switch(interaction.options.getSubcommand()){
            case 'set':
                let db = interaction.client.db;
                db.collection('guilds').doc(interaction.guild.id).set({'channels': {'riot': interaction.channel.id}}, {merge: true}).then(() => {
                    interaction.reply({content:'Channel set for riot notifications!', ephemeral: true});
                    logDebug(interaction.client, `Channel ${interaction.channel.id} set as Riot Games notification channel`);
                });
                break;

            default: 
                break;
        }

	},
};
