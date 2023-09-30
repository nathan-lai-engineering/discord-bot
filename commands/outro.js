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
                        .setDescription('integer, the seconds when you want to start video from'))
                .addNumberOption(option => 
                    option
                        .setName('duration')
                        .setDescription('integer, the seconds you want music to last, max of 15')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('toggle')
                .setDescription('toggles your outro')),
	async execute(interaction) {
        switch(interaction.options.getSubcommand()){
            /**
             * Play the outro
             */
            case 'play':
                this.playOutro(interaction.client, interaction.member, interaction.guild, interaction.member.voice.channel) ? 
                    interaction.reply({content:'Your outro is playing, gg gn', ephemeral: true}) : interaction.reply({content:'Your outro is off or you do not have one set up', ephemeral: true});
                break;

            /**
             * Sets the outro
             * @param url
             * @param start
             * @param duration
             */
            case 'set':
                let url = interaction.options.getString('url');
                let start = interaction.options.getNumber('start');
                if(start < 0){
                    logDebug(client, interaction.member + ' failed /outro set parameters');
                    interaction.reply({content: 'Start is atleast 0 seconds...', ephemeral: true});
                    return;
                }


                let duration = interaction.options.getNumber('duration');
                if(duration <= 0 || duration > 15){
                    logDebug(client, interaction.member + ' failed /outro set parameters');
                    interaction.reply({content: 'Duration is atleast 0 seconds and at most 15 seconds', ephemeral: true});
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

            /**
             * Toggles whether the outro is played or not
             */
            case 'toggle':
                let docRef = interaction.client.db.collection('users').doc(interaction.user.id);
                docRef.get().then(snapshot => {
                    let toggle = snapshot.data().outro.toggle;
                    if(toggle != null && toggle != undefined){
                        toggle = !toggle;
                        docRef.update({'outro.toggle': toggle}).then(result => {
                            let message = 'Outro ';
                            message += toggle ? 'enabled.' : 'disabled.';
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

    /**
     * Plays the outro if it is toggled and there is no current song playing
     * @param {*} client 
     * @param {*} member 
     * @param {*} guild 
     * @param {*} channel 
     */
    async playOutro(client, member, guild, channel){
        const distube = client.distube;
        client.db.collection('users').doc(member.id).get().then(snapshot => {
            let outroData = snapshot.data().outro;
            logDebug(client, 'Outro data acquired from Firestore');

            if(outroData == null || outroData.url == null || outroData.start == null || outroData.duration == null || !outroData.toggle){
                logDebug(client, 'Outro play denied');
                return false;
            }

            let currentQueue = distube.queues.get(guild);

            if(currentQueue != null && currentQueue.playing){
         
            }
            else {
                playSongPriority(outroData.url, channel, client, outroData);
                delayedSkipGradual(outroData, client, guild);
            }

            return true;
        });
    }
};

/**
 * Plays a song at a certain point, skipping the queue
 * @param {*} url 
 * @param {*} channel 
 * @param {*} client 
 * @param {*} outroData 
 */
function playSongPriority(url, channel, client, outroData){
    client.distube.eventFunctionsQueue['playSong'].push(
        function(){
            logDebug(client, 'Seeking to ' + outroData.start + 's');
            client.distube.seek(channel.guild, outroData.start);
            return true; //continue to next in queue
        }
    );
    client.distube.play(channel, url, {
        position: 1
    });
};

/**
 * After a duration, lowers the volume gradually until silence
 * @param {*} outroData 
 * @param {*} client 
 * @param {*} guild 
 */
function delayedSkipGradual(outroData, client, guild){
    logDebug(client, 'Queueing delayed skip');
    client.distube.eventFunctionsQueue['playSong'].push(
        function(){
            setTimeout(()=>{
                logDebug(client, 'Executing delayedSkipGradual');

                let volume = 50;
                let interval = (outroData.duration + 4) / 400; // the gradual lower volume will be little more than 1/4 of total duration
                delayedSkipGradualHelper(client, guild, interval, volume);
            }, 
                outroData.duration * 1000);
            return false; // end of list of actions
        }
    );
}

/**
 * Recursive helper function to lower volume
 * @param {*} client 
 * @param {*} guild 
 * @param {*} interval 
 * @param {*} volume 
 */
function delayedSkipGradualHelper(client, guild, interval, volume){
    if(volume > 0){
        setTimeout(() => {
            client.distube.setVolume(guild, volume);
            delayedSkipGradualHelper(client, guild, interval, volume - 1)
        },
            interval * 1000);
    }
    else {
        const currentQueue = client.distube.queues.get(guild);
        if(currentQueue != undefined){
            if(currentQueue.songs.length <= 1)
                client.distube.stop(guild);
            else
                client.distube.skip(guild);
        }
        else{
            logDebug(client, 'Error on delayedSkipGradual, no queue');
        }
    }
}