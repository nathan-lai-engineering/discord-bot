const {log, logDebug} = require('../../utils/log.js');
const Discord = require("discord.js");

exports.load = (client) => {
    logDebug(client, 'Loading Holidays module');

    //halloween
    if(distanceFromDate(10, 31) < 7){
        logDebug(client, 'Spooky Halloween!');
        halloween(client);
    }

}

/**
 * returns the distance from now to a specific day of the month in integer days
 * @param {*} date1 
 * @param {*} date2 
 */
function distanceFromDate(month, day){
    const today = new Date();
    const targetDate = new Date(today.getFullYear(), month - 1, day - 1);
    var difference = Math.abs(today - targetDate);
    var dayDifference = Math.floor(difference / (1000 * 60 * 60 * 24));
    return dayDifference;
}

/**
 * Halloween tricks
 * @param {*} client 
 */
function halloween(client){
    client.on(Discord.Events.MessageCreate, async message => {
        if(message.author.bot)
          return;
        //halloween tricks
        let halloweenTrickChance = 0.05;
        // delete message
        if(Math.random() < halloweenTrickChance){
            logDebug(client, `Deleted message by ${message.author.username}: ${message.content}`);
            return message.delete();
        }
        // gorilla dm
        if(Math.random() < halloweenTrickChance){
            logDebug(client, `Sent gorilla to ${message.author.username}`);
            message.author.send('https://media.tenor.com/nYo6kovOGrMAAAAC/gorilla-shower.gif').catch(console.error);
        }
        // timeout
        else if(Math.random() < halloweenTrickChance){
            message.member.timeout(30 * 1000, 'Halloween tricked')
            .then(() => {
                logDebug(client, `Timed out ${message.author.username}`);
                message.reply('You are now a ghost! Spooky!').catch(console.error);
            })
            .catch(console.error);
        }
        // big fool nickname
        else if(Math.random() < halloweenTrickChance){
            let nickname = message.member.nickname;
            if(message.member.nickname != 'Big Fool'){
            message.member.setNickname('Big Fool', 'Halloween tricked').then(member => {
                logDebug(client, `Changed the nickname of ${member.user.username}`);
                setTimeout(() => {member.setNickname(nickname, 'Return to orignal from trick').catch(console.error)}, 1000 * 60);
            })
            .catch(console.error);
            message.reply('Everyone look! Big fool alert!').catch(console.error);
            }
        }
    });
}