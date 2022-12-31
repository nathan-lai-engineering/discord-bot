const { SlashCommandBuilder, EmbedBuilder} = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('filter')
		.setDescription('change filter of songs')
        .addStringOption(option => 
            option.setName("filter")
                .setDescription("the type of filter you want to add")
                .addChoices(
                    {name:'Bass boost', value: 'bassboost'},
                    {name:'Nightcore', value: 'nightcore'},
                    {name:'Karaoke', value: 'karaoke'},
                    {name:'Echo', value: 'echo'},
                    {name:'3d', value: '3d'},
                    {name:'Surround', value: 'surround'},
                    {name:'Vaporwave', value: 'vaporwave'},
                    {name:'Clear filters', value: 'clear'},
                )),
	async execute(interaction) {
        let queue = interaction.client.distube.getQueue(interaction.guildId);
        if( !queue ||
            queue.songs.length <= 0)
                return interaction.channel.send("You'd need a song playing to apply a filter.");
        const filter = interaction.options.getString('filter');
        if(!filter){
            const embed = new EmbedBuilder()
            .setColor(0xa8a8a8)
            .setTitle("Current filters");
            for(let f in queue.filters.names)
                embed.addFields({name: queue.filters.names[f], value: '\u200B'});
            interaction.channel.send({embeds:[embed]});
        }
        else if(filter == 'clear'){
            queue.filters.clear();
            interaction.channel.send("Filters have been cleared.");
        }
        else {
            if(queue.filters.has(filter)){
                queue.filters.remove(filter);
                interaction.channel.send(`${filter} filter has been removed.`);
            }
                
            else {
                queue.filters.add(filter);
                interaction.channel.send(`${filter} filter has been added.`);
            }
        }
	},
};

