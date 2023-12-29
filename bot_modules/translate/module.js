const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const deepl = require('deepl-node');
const SOURCE_LANGAUGES = require('./sourceLanguages.json');

exports.load = (client) => {
    logDebug(client, 'Loading Translate module');
    client.on(Discord.Events.MessageCreate, async message => {
        if(!client.apiKeys || message.author.bot || !message.content || message.content.length <= 1 || message.content.startsWith('$'))
          return;
 
        const translator = new deepl.Translator(client.apiKeys['deepl']);
        translator.translateText(message.content, null, 'en-US')
        .then(res => {
            logDebug(client, `[TRANSLATE] ${res.text} | ${res.detectedSourceLang}`);
            if(res){
                if(res.detectedSourceLang 
                    && !res.detectedSourceLang.toLowerCase().includes("en") 
                    && res.text
                    && res.text != message.content){
                    let replyString = `${res.detectedSourceLang} -> English: ${res.text}`; // default
                    if(res.detectedSourceLang.toUpperCase() in SOURCE_LANGAUGES)
                        replyString = `${SOURCE_LANGAUGES[res.detectedSourceLang.toUpperCase()]} → English: ${res.text}` // convert to full name from code
                    message.reply(replyString).catch(console.error);
                }
            }
        })
        .catch(error => console.log(error));
    });
    
    client.on(Discord.Events.MessageCreate, async message => {
        if(!client.apiKeys || message.author.bot || (message.content && message.content.startsWith('$')))
          return;
        let direction = "+";
        if(Math.random() > 0.9){
            if(Math.random() > 0.5){
                direction = "-";
            }
            message.reply(`${direction}${Math.ceil(Math.random() * 100)} GP`).catch(console.error);
        }
    });

}

