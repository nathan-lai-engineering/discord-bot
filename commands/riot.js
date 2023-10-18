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
                .setDescription('set the channel for riot games notifications'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('registers your Riot username to your discord'))
                .addStringOption(option =>
                    option
                        .setName('summoner_name')
                        .setDescription('caps sensitive summoner name')
                        .setRequired(true)),
	async execute(interaction) {

	},
};
