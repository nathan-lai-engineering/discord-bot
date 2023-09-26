const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('outro')
		.setDescription('gg gn')
        .addSubcommand(subcommand =>
            subcommand
                .setName('play')
                .setDescription('play it'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('sets your outro')
                .addStringOption(option =>
                    option
                        .setName('url')
                        .setDescription('youtube url'))
                .addStringOption(option => 
                    option
                        .setName('start')
                        .setDescription('timestamp'))
                .addStringOption(option => 
                    option
                        .setName('end')
                        .setDescription('timestamp, max 10 secs')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('toggles your outro')),
	async execute(interaction) {
        console.log(interaction.options);
        switch(interaction.options.getSubcommand()){
            case 'play':
                break;


            case 'set':
                let url = interaction.options.getString('url');
                let start = interaction.options.getString('start');
                let end = interaction.options.getString('end');
                break;


            case 'toggle':
                break;


            default:
                interaction.reply('this should never happen');
        }
	},
};