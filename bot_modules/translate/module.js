const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
import * as deepl from 'deepl-node';

exports.load = (client) => {
    logDebug(client, 'Loading Translate module');
    client.on(Discord.Events.MessageCreate, async message => {
        if(message.author.bot)
          return;
 
        const translator = new deepl.Translator(client.apiKeys['deepl']);
        translator.translateText(message.content, null, 'en')
        .then(res => {
            console.log(res);
            if(res){
                if(res.detected_source_language && !res.detected_source_language.includes("EN") && res.text){
                    message.reply(`From ${res.detected_source_language}: ${res.text}`).catch(console.error);
                }
            }
        })
        .catch(error => console.log(error));
    });

}

