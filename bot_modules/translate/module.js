const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const axios = require('axios');

exports.load = (client) => {
    logDebug(client, 'Loading Translate module');
    client.on(Discord.Events.MessageCreate, async message => {
        if(message.author.bot)
          return;

        let apiUrl = 'https://api-free.deepl.com/v2/translate';  

        axios({
            method: 'get',
            url: apiUrl,
            data: {
                text: [message.content],
                target_lang: "EN"
            },
            headers: {
                'Authorization': `DeepL-Auth-Key ${client.apiKeys['deepl']}`,
                'Content-Type': 'application/json',
            }
        })
        .then(res => {
            console.log(res.data);
            if(res){
                if(res.data.detected_source_language && res.data.detected_source_language != "EN" && res.data.text){
                    message.reply(`From ${res.data.detected_source_language}: ${res.data.text}`).catch(console.error);
                }
            }
        })
        .catch(error => console.log(error));
    });

}

