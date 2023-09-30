const { SlashCommandBuilder } = require('discord.js');
const {logDebug} = require('../utils/log');

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
                this.playOutro(interaction.client, interaction.member, interaction.guild, interaction.member.voice.channel);
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

    async playOutro(client, member, guild, channel){
        const distube = client.distube;
        client.db.collection('users').doc(member.id).get().then(snapshot => {
            logDebug(client, 'Outro data acquired from Firestore');
            
            let outroData = snapshot.data().outro;

            if(outroData == null || outroData.url == null || outroData.start == null || outroData.duration == null){
                return 'You do not have an outro set up my guy';
            }

            let currentQueue = distube.queues.get(guild);

            if(currentQueue != null && currentQueue.playing){
         
            }
            else {
                playSongPriority(outroData.url, channel, distube);
                delayedSkip(outroData, client, guild);
            }

            return 'Successful';
        });
    }
};

function playSongPriority(url, channel, distube){
    distube.play(channel, url, {
        position: 1
    }); 
};

function delayedSkip(outroData, client, guild){
    logDebug(client, 'Queueing delayed skip');
    client.distube.addSongFunctions.push(
        function(){setTimeout(()=>{
            logDebug(client, 'Executing delayed skip');
            const currentQueue = client.distube.queues.get(guild);
            if(currentQueue != undefined){
                if(currentQueue.songs.length <= 1)
                    client.distube.stop(guild);
                else
                    client.distube.skip(guild);
            }
            else{
                logDebug(client, 'Error on delayedSkip, no queue');
            }
        }, 
            outroData.duration * 1000)});
}