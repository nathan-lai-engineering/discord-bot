const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const deepl = require('deepl-node');

exports.load = (client) => {
    logDebug(client, 'Loading Translate module');
    client.on(Discord.Events.MessageCreate, async message => {
        if(!client.apiKeys || message.author.bot)
          return;
 
        const translator = new deepl.Translator(client.apiKeys['deepl']);
        translator.translateText(message.content, null, 'en-US')
        .then(res => {
            if(res){
                if(res.detectedSourceLang 
                    && !res.detectedSourceLang.toLowerCase().includes("en") 
                    && res.text
                    && res.text != message.content){
                    message.reply(`${res.detectedSourceLang} -> English: ${res.text}`).catch(console.error);
                }
            }
        })
        .catch(error => console.log(error));
    });

}

