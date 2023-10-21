const { SlashCommandBuilder } = require('discord.js');
const {log, logDebug} = require('../utils/log.js');
const oracledb = require('oracledb');

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
        
            switch(interaction.options.getSubcommand()){
                case 'set':
                    const oracleLogin = require('../oracledb.json');
                    let connection = await oracledb.getConnection(oracleLogin);

                    await connection.execute(
                        `INSERT INTO guilds (guild_id)
                        SELECT :guild_id
                        FROM dual
                        WHERE NOT EXISTS(
                            SELECT * FROM guilds
                            WHERE (guild_id = :guild_id)
                        )`,
                        {guild_id: interaction.guild.id},
                        {}
                    );

                    await connection.execute(
                        `MERGE INTO notification_channels USING dual ON (guild_id=:guild_id AND notification_type='riot')
                        WHEN MATCHED THEN UPDATE SET channel_id=:channel_id
                        WHEN NOT MATCHED THEN INSERT
                        VALUES(:guild_id, 'riot', :channel_id)`,
                    {guild_id: interaction.guild.id,
                    channel_id: interaction.channel.id},
                    {autoCommit:true});

                    interaction.reply({content: 'Channel successfully set!', ephemeral: true})
                    break;

                default:
                    interaction.reply({content:'What subcommand did you even try?', ephemeral: true});
            }

        
	},
};
