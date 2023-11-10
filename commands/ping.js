const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('get bot latency'),
	async execute(interaction) {
        interaction.channel.send("pinging").then(message => {
            interaction.reply({content: `Latency is ${message.createdTimestamp - interaction.createdTimestamp}ms. API latency is ${Math.round(interaction.client.ws.ping)}ms.`, ephemeral:true});
            message.delete();
        });
    }
}