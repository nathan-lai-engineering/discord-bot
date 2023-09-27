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
                        .setDescription('timestamp, max 20 secs')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('toggles your outro')),
	async execute(interaction) {
        switch(interaction.options.getSubcommand()){
            case 'play':
                break;


            case 'set':
                let url = interaction.options.getString('url');
                let start = interaction.options.getString('start');
                let end = interaction.options.getString('end');
                let toggle = true;
                let outroData = {
                    url: url,
                    start: start,
                    end: end,
                    toggle: toggle};

                interaction.client.db.collection('users').doc(interaction.user.id).set({'outro': outroData}, {merge: true})
                    .then(interaction.reply({content:'Successfully saved.', ephemeral: true}));
                break;


            case 'toggle':
                let docRef = interaction.client.db.collection('users').doc(interaction.user.id);
                docRef.get().then(snapshot => {
                    let toggle = snapshot.data().outro.toggle;
                    if(toggle != null && toggle != undefined){
                        toggle = !toggle;
                        docRef.update({'outro.toggle': toggle}).then(result => {
                            let message = 'Outro ';
                            message += toggle ? 'disabled.' : 'enabled.';
                            interaction.reply({content: message, ephemeral: true})
                        });
                    }
                    else
                        interaction.reply({content: 'No outro to toggle', ephemeral: true});
                })
                break;


            default:
                interaction.reply('this should never happen');
        }
	},
};