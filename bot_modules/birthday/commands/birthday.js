const { SlashCommandBuilder } = require('discord.js');
const {log, logDebug} = require('../../../utils/log.js');
const oracledb = require('oracledb');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('birthday')
		.setDescription('all birthday related commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('set the channel for birthday notifications'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('register')
                .setDescription('registers your birthdate to the bot')),
	async execute(interaction) {
        switch(interaction.options.getSubcommand()){
            case 'set':
                await birthdaySet(interaction);
                break;
            default:
                interaction.reply({content:'What subcommand did you even try?', ephemeral: true});
        }
	},
};

async function birthdaySet(interaction){
    logDebug(interaction.client, 'Updating Birthday notification channel on database');
    let connection = await oracledb.getConnection(interaction.client.dbLogin);
    try{
        // check if user is admin
        let result = await connection.execute(
            `SELECT admin
            FROM discord_accounts
            WHERE discord_id=:0`,
            [interaction.member.id],
            {}
        );

        // only allow admins to perform command
        if(result.rows.length > 0){
            if(result.rows[0][0] == true){

                // insert guild info if doesnt exist
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
            
                // upsert notification channel
                await connection.execute(
                    `MERGE INTO notification_channels USING dual ON (guild_id=:guild_id AND notification_type='birthday')
                    WHEN MATCHED THEN UPDATE SET channel_id=:channel_id
                    WHEN NOT MATCHED THEN INSERT
                    VALUES(:guild_id, 'birthday', :channel_id)`,
                {guild_id: interaction.guild.id,
                channel_id: interaction.channel.id},
                {autoCommit:true});
                return interaction.reply({content: 'Channel successfully set!', ephemeral: true});
            }
        }
        interaction.reply({content: 'You are no admin!', ephemeral: true});
    }
    catch(error){
        logDebug(interaction.client, error);
    }
    finally{
        if(connection)
            connection.close();
    }
}
