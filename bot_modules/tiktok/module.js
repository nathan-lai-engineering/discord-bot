const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const https = require('https')
const fs = require('fs');

exports.load = (client) => {
    logDebug(client, 'Loading TikTok Embed module');

    client.on(Discord.Events.MessageCreate, async message => convertTiktokLink(client, message));
}

/**
 * Converts a tik tok link to a viewable video embed by downloading from TikWM Web API
 * @param {*} message 
 */
function convertTiktokLink(client, message){
    if(isTikTokLink(message)){
        logDebug(client, 'TikTok link detected, working...');
        message.channel.send("Working...").then((toEdit) => {
            try{
                tikVM(client, message.content).then(tiktokData => {
                    if(tiktokData == null){
                        logDebug(client, "Invalid video data, probably bad link");
                        toEdit.delete();
                        return;
                    }

                    if(tiktokData.type == 'video'){
                        if (!fs.existsSync('./temp')){
                            fs.mkdirSync('./temp');
                        }
                        let videoPath = './temp/tiktok.mp4'
                        downloadVideoUrl(client, tiktokData.fileUrls[0], videoPath).then(() => {
                            logDebug(client, 'Starting embed creation');
                            let messagePayload = {};
                            messagePayload['embeds'] = [createTikTokEmbed(message, tiktokData)];

                            //if(videoData.size >= 8388000){
                            //    videoPath = compressVideo(client, videoPath);
                            //}

                            messagePayload['files'] = [videoPath];

                            message.channel.send(messagePayload).then(() => {
                                logDebug(client, 'TikTok Embed sent!');
                                toEdit.delete();
                                message.delete();
                                logDebug(client, 'TikTok old messages deleted');
                                fs.unlink(videoPath, (err) => logDebug(client, err));
                                logDebug(client, 'TikTok video deleted');
                            });
                            
                        });
                    }
                    else {
                        logDebug(client, 'Starting embed creation');
                        let messagePayload = {};
                        messagePayload['embeds'] = [createTikTokEmbed(message, tiktokData)];
                        messagePayload['files'] = tiktokData.fileUrls;

                        message.channel.send(messagePayload).then(() => {
                            logDebug(client, 'TikTok Embed sent!');
                            toEdit.delete();
                            message.delete();
                            logDebug(client, 'TikTok old messages deleted');
                            logDebug(client, 'TikTok video deleted');
                        });
                    }
                    
                });
            }
            catch(error){
                logDebug(client, error);
                console.log(error);
            }
        });
    }
}

/**
 * Takes video data from the TikWM api and creates a Discord embed
 * @param {*} message 
 * @param {*} tiktokData
 * @returns Discord embed
 */
function createTikTokEmbed(message, tiktokData){
    let caption = tiktokData.caption;
    if(caption.length <= 1)
        caption = " ";

    let avatar = tiktokData.avatar;

    let posterName = tiktokData.authorName;
    if(posterName != undefined && posterName.length <= 1)
        posterName = " ";

    let likesCommentsShares = `${addCommas(tiktokData.viewCount)} 👀  ${addCommas(tiktokData.likeCount)} ♥  ${addCommas(tiktokData.commentCount)} 💬  ${addCommas(tiktokData.shareCount)} 🔗`; 

    let embed = new Discord.EmbedBuilder()
        .setURL(message.content)
        .setDescription(message.content.split('?')[0]);
        //.setColor(Discord.Color.Aqua);

    // footer
    try{
        embed.setFooter({
            text: 'Requested by: ' + message.author.username, 
            iconURL: message.author.avatarURL()
        });
    }
    catch(error){
        logDebug(message.client, 'Failed setting footer for TikTok embed' + error);
    }

    // video data
    try{
        embed.addFields([{
            name: caption,
            value: likesCommentsShares,
            inline: true
        }]);
        embed.setAuthor({
            name: posterName,
            iconURL: avatar,
            url:'https://www.tiktok.com/@' + tiktokData.id
        });
    }
    catch(error){
        logDebug(message.client, 'Failed setting tiktokData for TikTok embed' + error);
    }
    return embed;
}

/**
 * Checks if the message has tiktok in it, and removes spaces
 * @param {*} message 
 * @returns 
 */
function isTikTokLink(message){
    let content = message.content;
    if(content.search('\.www.tiktok.com\.') >= 0){
        if(content.search(' ') >= 0){
            let splitContent = content.split(' ');
            for(contentPiece in splitContent){
                if(contentPiece.search('\.www.tiktok.com\.') >= 0){
                    message.content = contentPiece;
                }
            }
        }
        return true;
    }
    return false;
}

function downloadVideoUrl(client, videoUrl, videoPath){
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(videoPath);
        https.get(videoUrl, (res) => {
            logDebug(client, 'Video download started: '+ videoUrl);
            res.pipe(file);
    
            file.on('finish', () => {
                file.close();
                logDebug(client, 'Video download finished')
                resolve();
            })

            file.on('error', (err) => {
                logDebug(client, 'Video download failed');
                file.close();
                reject();
            });
        });
    });


}

function tikVM(client, tiktokUrl){
    logDebug(client, 'Acquiring TikTok data: ' + tiktokUrl);

    return axios({
        method: 'post',
        url: 'https://www.tikwm.com/api/',
        data: {
            url: tiktokUrl
        }
    }).then(res => {
        try{
            logDebug(client, 'Response from TikVM received.');
            let data = res.data.data;
            let tiktokData = {};

            if('images' in data){
                tiktokData.fileUrls = data.images;
                tiktokData.type = 'image';
            }
            else {
                tiktokData.fileUrls = [data.play];
                tiktokData.type = 'video';
            }

            tiktokData.id = data.author.id;
            tiktokData.caption = data.title;
            tiktokData.size = data.size;
            tiktokData.viewCount = data.play_count;
            tiktokData.likeCount = data.digg_count;
            tiktokData.commentCount = data.comment_count;
            tiktokData.shareCount = data.share_count;
            tiktokData.authorName = data.author.nickname;
            tiktokData.avatar = data.author.avatar;
            return tiktokData;
        }
        catch(error){
            logDebug(client, error);
            return null;
        }
    });

}

function addCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}



function compressVideo(client, localPath){
    logDebug(client, "Beginning compression");
}