const {log, logDebug} = require('./utils/log.js');
const Discord = require("discord.js");
const { default: puppeteer } = require('puppeteer');
const Puppeteer = require('puppeteer');
const Session = require('express-session');
const fs = require('fs';)

exports.load = (client) => {
    logDebug(client, 'Loading TikTok Embed module');
    client.enabledModules.push("tiktok_embed");

    function messageListener(message){
        if(isTikTokLink(message.content)){
            message.channel.send("Working...").then((toEdit) => {
                try{
                    
                
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
 */
async function downloadTikTok(client, url){
    let localPath = './temp/tiktok.mp4';

    try{
        logDebug(client, 'Beginning TikTok download process for URL: ' + url);

        let browser = await Puppeteer.launch({
            'headless': True,
			"args": ['--no-sandbox', '--disable-setuid-sandbox']
        });

        logDebug(client, 'Browser created, creating page...');
        let page = await browser.newPage();

        logDebug(client, 'Page created, setting usage agent...');
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.72 Safari/537.36');

        logDebug(client, 'User agent set, going to url...');
        await page.goto(url, {"waitUntil": 'load', "timeout": 1000000});

        // gets video url
        let videoUrl = null;
        try {
            let element = await page.querySelector('video');
            videoUrl = await page.evaluate('(element) => element.src', element);
        }
        catch(error) {
            logDebug(client, error);
            try{
                logDebug(client, 'Going to url...');
                await page.goto(url, {"waitUntil": 'load', "timeout": 1000000})
				await page.waitForSelector('video')
				let element = await page.querySelector('video')
				videoUrl = await page.evaluate('(element) => element.src', element)
                logDebug(client, "Video URL acquired");
            }
            catch(error2) {
                logDebug(client, error2);
                logDebug(client, 'Going to url...');
                await page.goto(url, {"waitUntil": 'load', "timeout": 1000000})
                let element = await page.querySelector('video')
				videoUrl = await page.evaluate('(element) => element.src', element);
                logDebug(client, "Video URL acquired");
            }
        }

        // gets caption
        let caption = "No caption";
        try {
            logDebug(client, 'Acquiring caption...');
            let cap = await page.querySelector('.tiktok-1ejylhp-DivContainer.e11995xo0')
			caption = await page.evaluate('(element) => element.innerText', cap)
        }
        catch(error){
            logDebug(client, error);
        }

        // gets thumbnail url
        let thumbnail = "";
        try{
            logDebug(client, 'Acquiring thumbnail...');
            let imgobj = await page.querySelector('.tiktok-1zpj2q-ImgAvatar.e1e9er4e1')
			thumbnail = await page.evaluate('(element) => element.src', imgobj)
        }
        catch(error){
            logDebug(client, error);
        }


        // get poster name
        let posterName = "";
        try{
            logDebug(client, 'Acquiring poster username...');
            let posternameObj = await page.querySelector('h3.tiktok-debnpy-H3AuthorTitle.e10yw27c0')
			posterName = await page.evaluate('(element) => element.innerText', posternameObj)
        }
        catch(error){
            logDebug(client, error);
        }

        logDebug(client, 'Closing browser...');
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






    }
    catch(error){
        logDebug(client, error)
    }
}