const {log, logDebug} = require('../utils/log.js');
const Discord = require("discord.js");
const axios = require('axios')
const https = require('https')
const fs = require('fs');

exports.load = (client) => {
    logDebug(client, 'Loading TikTok Embed module');
    client.enabledModules.push("tiktok_embed");

    function messageListener(message){
        if(isTikTokLink(message)){
            logDebug(client, 'TikTok link detected, working...');
            message.channel.send("Working...").then((toEdit) => {
                try{
                    tikVM(client, message.content).then(videoData => {
                        if(videoData == null){
                            logDebug(client, "Invalid video data, probably bad link");
                            toEdit.delete();
                            return;
                        }
                        let videoPath = './temp/tiktok.mp4'
                        downloadVideoUrl(client, videoData.videoUrl, videoPath).then(() => {
                            logDebug(client, 'Starting embed creation');
                            if(videoData != null){
                                let messagePayload = {};
                                messagePayload['embeds'] = [createTikTokEmbed(message, videoData)];

                                if(videoData.size >= 8388000){
                                    videoPath = compressVideo(client, videoPath);
                                }

                                messagePayload['files'] = [videoPath];

                                message.channel.send(messagePayload).then(() => {
                                    logDebug(client, 'TikTok Embed sent!');
                                    toEdit.delete();
                                    message.delete();
                                    logDebug(client, 'TikTok old messages deleted');
                                    fs.unlink(videoPath, (err) => logDebug(client, err));
                                    logDebug(client, 'TikTok video deleted');
                                });
                            }
                        });
                    });
                }
                catch(error){
                    logDebug(client, error);
                    console.log(error);
                }
            });
        }
    }

    client.messageListeners.push(messageListener);
}

/**
 * Takes video data from the TikWM api and creates a Discord embed
 * @param {*} message 
 * @param {*} videoData 
 * @returns Discord embed
 */
function createTikTokEmbed(message, videoData){
    let caption = videoData.caption;
    if(caption.length <= 1)
        caption = " ";

    let avatar = videoData.avatar;

    let posterName = videoData.authorName;
    if(posterName != undefined && posterName.length <= 1)
        posterName = " ";

    let likesCommentsShares = `${addCommas(videoData.viewCount)} 👀  ${addCommas(videoData.likeCount)} ♥  ${addCommas(videoData.commentCount)} 💬  ${addCommas(videoData.shareCount)} 🔗`; 

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
            url:'https://www.tiktok.com/@' + videoData.id
        });
    }
    catch(error){
        logDebug(message.client, 'Failed setting videoData for TikTok embed' + error);
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
            let videoData = {};
            videoData.videoUrl = data.play;
            if(videoData.videoUrl == undefined || videoData.videoUrl == null){
                return null;
            }
            videoData.id = data.author.id;
            videoData.caption = data.title;
            videoData.size = data.size;
            videoData.viewCount = data.play_count;
            videoData.likeCount = data.digg_count;
            videoData.commentCount = data.comment_count;
            videoData.shareCount = data.share_count;
            videoData.authorName = data.author.nickname;
            videoData.avatar = data.author.avatar;
            return videoData;
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