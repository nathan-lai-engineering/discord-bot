const { SlashCommandBuilder } = require('discord.js');
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
        let db = interaction.client.db;
        db.collection('guilds').doc(interaction.guild.id).set({'channels': {'riot': interaction.channel.id}}, {merge: true})
        interaction.reply({content:'Channel set for riot notifications!', ephemeral: true});
        logDebug(client, `Channel ${interaction.channel.id} set as Riot Games notifcation channel`);
	},
};
