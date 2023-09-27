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
                .addNumberOption(option => 
                    option
                        .setName('start')
                        .setDescription('start time in seconds'))
                .addNumberOption(option => 
                    option
                        .setName('duration')
                        .setDescription('max 20')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('toggles your outro')),
	async execute(interaction) {
        switch(interaction.options.getSubcommand()){
            case 'play':
                this.playOutro(interaction);
                interaction.reply({content: 'Your outro is playing, gg gn', ephemeral: true});
                break;


            case 'set':
                let url = interaction.options.getString('url');
                let start = interaction.options.getNumber('start');
                if(start < 0){
                    interaction.reply({content: 'Start is atleast 0 seconds...', ephemeral: true});
                    return;
                }


                let duration = interaction.options.getNumber('duration');
                if(duration <= 0 || duration > 20){
                    interaction.reply({content: 'Duration is atleast 0 seconds and at most 20 seconds', ephemeral: true});
                    return;
                }

                let toggle = true;
                let outroData = {
                    url: url,
                    start: start,
                    duration: duration,
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

    async playOutro(interaction){
        const distube = interaction.client.distube;
        interaction.client.db.collection('users').doc(interaction.user.id).get().then(snapshot => {
            let outroData = snapshot.data().outro;

            if(outroData == null || outroData.url == null || outroData.start == null || outroData.duration == null){
                interaction.reply({content:'You do not have an outro set up my guy', ephemeral: true});
                return;
            }

            let currentQueue = distube.queues.get(interaction.guild);

            if(currentQueue != null && currentQueue.playing){
         
            }
            else {
                playSongPriority(outroData.url, interaction);
                delayedSkip(outroData, interaction);
            }

        });
    }
};

function playSongPriority(url, interaction){
    if(!interaction.member.voice.channel){
        if(interaction.client.debugMode)
            console.log("User not in a voice channel!");
        interaction.reply("Shouldn't you be in a voice channel?");
        return;
    }

    interaction.client.distube.play(interaction.member.voice.channel, url, {
        member: interaction.member,
        textChannel: interaction.channel,
        position: 1
    }); 
};

function delayedSkip(outroData, interaction){
    const distube = interaction.client.distube;
    const currentQueue = distube.queues.get(interaction.guild);

    distube.addSongFunctions.push(
        function(){setTimeout(()=>{
            if(currentQueue != null && currentQueue.songs.length == 1)
                distube.clear(interaction.guild);
            else
                distube.skip(interaction.guild);
        }, 
            outroData.duration * 1000)});
}