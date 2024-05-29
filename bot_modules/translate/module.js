const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const deepl = require('deepl-node');
const SOURCE_LANGAUGES = require('./sourceLanguages.json');
const distance = require('jaro-winkler');

exports.load = (client) => {
    logDebug(client, 'Loading Translate module');
    client.on(Discord.Events.MessageCreate, async message => {
        if(!client.apiKeys || message.author.bot || !message.content || message.content.length <= 1 || message.content.startsWith('$'))
          return;
 
        // hardcoded specifically for alex
        if(message.content.toLowerCase() == "kucing")
            return message.reply("Indonesian → English: cat");

        const translator = new deepl.Translator(client.apiKeys['deepl']);
        let taggedMessage = message.content;
        const regex = /<@[0-9]>{17-19}/g;
        const pings = taggedMessage.match(regex);
        console.log(taggedMessage);
        console.log(pings);
        if(pings){
            for (let [_, ping] of Object.entries(pings)){
                if(ping in taggedMessage){
                    taggedMessage.replace(ping, `<x>${ping}</x>`);
                }
            }
        }

        translator.translateText(taggedMessage, null, 'en-US', {ignoreTags: ['x']})
        .then(res => {
            logDebug(client, `[TRANSLATE] ${res.text} | ${res.detectedSourceLang}`);
            if(res){
                if(res.detectedSourceLang 
                    && !res.detectedSourceLang.toLowerCase().includes("en") 
                    && res.text){
                    
                    // use jaro-winkler algorithm to determine similarity and only send translation if its under threshold
                    let similarity = distance(res.text.replace(/[^a-zA-Z ]/g, ""), message.content.replace(/[^a-zA-Z ]/g, ""), {caseSensitive: false});
                    if(similarity < 0.9 && res.text != message.content){
                        logDebug(client, `[TRANSLATE] simarility: ${similarity}`);
                        let replyString = `${res.detectedSourceLang} -> English: ${res.text}`; // default
                        if(res.detectedSourceLang.toUpperCase() in SOURCE_LANGAUGES)
                            replyString = `${SOURCE_LANGAUGES[res.detectedSourceLang.toUpperCase()]} → English: ${res.text}` // convert to full name from code
                        message.reply(replyString).catch(console.error);
                    }


                }
            }
        })
        .catch(error => console.log(error));
    });
}

