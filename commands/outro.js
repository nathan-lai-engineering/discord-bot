const { SlashCommandBuilder } = require('discord.js');
const {logDebug} = require('../utils/log');
const {oracleQuery} = require('../utils/oracle');
const oracledb = require('oracledb');



let maxDuration = 10;

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
                        .setDescription('youtube url')
                        .setRequired(true))

                .addNumberOption(option => 
                    option
                        .setName('start')
                        .setDescription('integer, the seconds when you want to start video from')
                        .setRequired(true))
                .addNumberOption(option => 
                    option
                        .setName('duration')
                        .setDescription(`decimal, the seconds you want music to last, max of ${maxDuration}`)
                        .setRequired(true)))
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
                if(!interaction.member.voice.channel){
                    if(interaction.client.debugMode)
                        logDebug(interaction.client, 'User not in a voice channel!');
                    interaction.reply({content:'Should you not be in a voice channel', ephemeral: true});
                    return;
                }

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
                if(duration <= 0 || duration > maxDuration){
                    logDebug(interaction.client, interaction.member + ' failed /outro set parameters');
                    interaction.reply({content: `Duration is atleast 0 seconds and at most ${maxDuration} seconds, try again.`, ephemeral: true});
                    return;
                }

                const oracleLogin = require('../oracledb.json');
                const connection = await oracledb.getConnection(oracleLogin);
            
                var result = null
                try{
                    await connection.execute(
                        `INSERT INTO discord_accounts (discord_id, admin)
                        SELECT :0, 0
                        FROM dual
                        WHERE NOT EXISTS(
                            SELECT * FROM discord_accounts
                            WHERE (discord_id = :1)
                        )`,
                        [interaction.member.id, interaction.member.id],
                        {}
                    );
                    connection.execute(
                        `MERGE INTO outros USING dual ON (discord_id = :discord_id)
                        WHEN MATCHED THEN UPDATE SET url=:url,start_second=:start_second, duration_second=:duration_second, toggle=1
                        WHEN NOT MATCHED THEN INSERT
                            VALUES(:discord_id, :url, :start_second, :duration_second, 1)`,
                        {discord_id: interaction.member.id,
                        url: url,
                        start_second: start,
                        duration_second: duration},
                        {autoCommit:true}
                    );
                }
                catch(error){
                    console.error(error);
                }
                finally{
                    connection.close();
                }

                interaction.reply({content:'Successfully saved.', ephemeral: true});
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
        oracleQuery(
            `SELECT * 
            FROM outros
            WHERE discord_id=:0`,
            [member.id],
            {}
        ).then(res => {
            console.log(res.rows)
            if(res.rows.length > 0){
                let url, start, duration, toggle;
                [_, url, start, duration, toggle] = res.rows[0];
                

                
                let currentQueue = distube.queues.get(guild);

                if(currentQueue != null && currentQueue.playing){
            
                }
                else {
                    playSongPriority(url, channel, client, start);
                    delayedSkipGradual(duration, client, guild);
                }

                return true;
            }
        });
    }
};

/**
 * Plays a song at a certain point, skipping the queue
 * @param {*} url 
 * @param {*} channel 
 * @param {*} client 
 * @param {*} start
 */
function playSongPriority(url, channel, client, start){
    client.distube.eventFunctionsQueue['playSong'].push(
        function(){
            logDebug(client, 'Seeking to ' + start + 's');
            client.distube.seek(channel.guild, start);
            return true; //continue to next in queue
        }
    );
    client.distube.play(channel, url, {
        position: 1
    });
};

/**
 * After a duration, lowers the volume gradually until silence
 * @param {*} duration
 * @param {*} client 
 * @param {*} guild 
 */
function delayedSkipGradual(duration, client, guild){
    logDebug(client, 'Queueing delayed skip');
    client.distube.eventFunctionsQueue['playSong'].push(
        function(){
            setTimeout(()=>{
                logDebug(client, 'Executing delayedSkipGradual');

                let volume = 50;
                let interval = (duration + 4) / 200; // the gradual lower volume will be little more than 1/4 of total duration
                delayedSkipGradualHelper(client, guild, interval, volume);
            }, 
                duration * 1000);
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
            if(client.distube.getQueue(guild.id) != undefined){
                client.distube.setVolume(guild, volume);
                delayedSkipGradualHelper(client, guild, interval, volume - 1)
            }
        },
            interval * 1000);
    }
    else {
        const currentQueue = client.distube.queues.get(guild);
        if(currentQueue != undefined){
            client.distube.stop(guild);
        }
        else{
            logDebug(client, 'Error on delayedSkipGradual, no queue');
        }
    }
}