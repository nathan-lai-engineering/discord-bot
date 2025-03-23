const { SlashCommandBuilder } = require('discord.js');
const {logDebug} = require('../../../utils/log');
const {oracleQuery} = require('../../../utils/oracle');
const oracledb = require('oracledb');



let maxDuration = 7;

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

                let outroPlayed = await this.playOutro(interaction.client, interaction.member, interaction.guild, interaction.member.voice.channel);
                outroPlayed ? interaction.reply({content:'Your outro is playing, gg gn', ephemeral: true}) : interaction.reply({content:'Your outro is off or you do not have one set up', ephemeral: true});
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

                const oracleLogin = require('../../../oracledb.json');
                let connection = await oracledb.getConnection(oracleLogin);
            
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

            case 'toggle':
                await outroToggle(interaction.client, interaction);
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
        return oracleQuery(
            `SELECT * 
            FROM outros
            WHERE discord_id=:0`,
            [member.id],
            {},
            client=client
        ).then(res => {
            if(res.rows.length > 0){
                let url, start, duration, toggle;
                [_, url, start, duration, toggle] = res.rows[0];
                
                if(toggle != 0){
                    let currentQueue = distube.queues.get(guild);

                    if(currentQueue != null && currentQueue.playing){
                        return false;
                    }
                    else {
                        playSongPriority(url, channel, client, start);
                        delayedSkipGradual(duration, client, guild);
                    }
                    return true;
                }  
            }
            return false;
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

/**
 * Toggles on and off the outro function through the database
 * @param {*} client 
 * @param {*} interaction 
 */
async function outroToggle(client, interaction){
    const oracleLogin = require('../../../oracledb.json');
    const connection = await oracledb.getConnection(oracleLogin);

    try{
        let res = await connection.execute(
            `SELECT toggle
            FROM outros
            WHERE discord_id = :0`,
            [interaction.member.id],
            {}
        );
        let toggle = res.rows[0][0];
        if(toggle == 0){
            toggle = 1;
        }
        else {
            toggle = 0;
        }
        await connection.execute(
            `UPDATE outros
            SET toggle = :0
            WHERE discord_id = :1`, 
            [toggle, interaction.member.id], 
            {autoCommit: true}
        );
        interaction.reply({content:`Outro toggled ${toggle == 0 ? 'off': 'on'}`, ephemeral: true});
    }
    catch(error){
        interaction.reply({content: 'Toggle failed', ephemeral: true});
        logDebug(client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
}