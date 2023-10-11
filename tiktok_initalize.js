const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");
const { default: puppeteer } = require('puppeteer');
const Puppeteer = require('puppeteer');
const Session = require('express-session');
const fs = require('fs');

exports.load = (client) => {
    logDebug(client, 'Loading TikTok Embed module');
    client.enabledModules.push("tiktok_embed");

    function messageListener(message){
        if(isTikTokLink(message)){
            logDebug(client, 'TikTok link detected, working...');
            message.channel.send("Working...").then((toEdit) => {
                try{
                    downloadTikTok(client, message.content).then(videoData => {
                        if(videoData != null || videoData != undefined){
                            let videoPath = videoData[0];
                            let caption = videoData[1];
                            let avatar = videoData[2];
                            let posterName = videoData[3];
        
                            logDebug(client, videoData.toString());
                        }
                        toEdit.delete();
                        message.delete();
                    });
                }
                catch(error){

                }
            });
        }
    }

    client.messageListeners.push(messageListener);
}

/**
 * Checks if the message has tiktok in it, and removes spaces
 * @param {*} message 
 * @returns 
 */
function isTikTokLink(message){
    let content = message.content;
    if(content.search('\.tiktok\.') >= 0){
        if(content.search(' ') >= 0){
            let splitContent = content.split(' ');
            for(contentPiece in splitContent){
                if(contentPiece.search('\.tiktok\.') >= 0){
                    message.content = contentPiece;
                }
            }
        }
        return true;
    }
    return false;
}

/**
 * Largely adapted from https://github.com/dumax315/Tiktok-Auto-Embed/blob/main/main.py
 * @param {*} client 
 * @param {*} url 
 * @returns localPath to downloaded video, caption, avatar link, original poster name
 */
async function downloadTikTok(client, url){
    let localPath = './temp/tiktok.mp4';
    let browser = null;

    try{
        logDebug(client, 'Beginning TikTok download process for URL: ' + url);

        browser = await Puppeteer.launch({
            'headless': true,
			"args": ['--no-sandbox', '--disable-setuid-sandbox']
        });

        logDebug(client, 'Browser created, creating page...');
        let page = await browser.newPage();

        logDebug(client, 'Page created, setting usage agent...');
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36');

        logDebug(client, 'User agent set');

        // gets video url with 3 attempts
        let videoUrl = null;

        async function acquireVideoUrl(page){
            logDebug(client, 'Going to URL...')
            await page.goto(url, {"waitUntil": 'load', "timeout": 1000000});
            let videoUrl = await page.$eval('video', e => e.src);
            logDebug(client, "Video URL acquired");
            return videoUrl;
        }

        try {
            videoUrl = await acquireVideoUrl(page);
        }
        catch(error) {
            logDebug(client, error);
            try{
                videoUrl = await acquireVideoUrl(page);
            }
            catch(error2) {
                logDebug(client, error2);
                videoUrl = await acquireVideoUrl(page);
            }
        }

        // gets caption
        let caption = "No caption";
        try {
            logDebug(client, 'Acquiring caption...');
            caption = await page.$eval('.tiktok-1fbzdvh-H1Container.ejg0rhn1', e => e.innerText);
        }
        catch(error){
            logDebug(client, error);
        }

        // gets avatar url
        let avatar = "";
        try{
            logDebug(client, 'Acquiring avatar...');
            avatar = await page.$eval('.tiktok-1zpj2q-ImgAvatar.e1e9er4e1', e => e.src);
        }
        catch(error){
            logDebug(client, error);
        }


        // get poster name
        let posterName = "";
        try{
            logDebug(client, 'Acquiring poster username...');
            posterName = await page.$eval('.tiktok-1c7urt-SpanUniqueId.evv7pft1', e => e.textContent);
        }
        catch(error){
            logDebug(client, error);
        }

        logDebug(client, 'Closing browser...');
        logDebug(client, `Video URL : ${videoUrl}, Caption: ${caption}, Avatar: ${avatar}, Original Poster: ${posterName}`);
        console.log(caption);
        console.log(posterName);
        let cookies = await page.cookies()
        await browser.close()
        let chunk_size = 4096;

        headers = {
			"Connection": "keep-alive",
			"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36",
			"Referer": "https://www.tiktok.com/"
		}
        let jar = {};
        for(let selenium_cookie in cookies){
            jar[cookies[selenium_cookie]['name']] = cookies[selenium_cookie]['value'];
        }

        /**
         * TO DO DOWNLOAD THE VIDEO
         */

        let stats = fs.statSync(localPath);
        if(stats.size >= 8388000){
            logDebug(client, "File too big, compressing...");
            compressVideo(client, localPath);
            localPath = './temp/comp_tiktok.mp4'
        }
        return [localPath, caption, avatar, posterName];



    }
    catch(error){
        logDebug(client, error)
        if(browser != null){
            try{
                await browser.close();
            }
            catch(error2){
                logDebug(client, error);
            }     
        }
    }
}

function compressVideo(client, localPath){
    logDebug(client, "Beginning compression");

}