module.exports = {
    name: "top",
    description: "Acquire a list of the top 5 users in the server",
    syntax: "top",
    example: "top",
    database: true,
    execute(msg, args, database) {
        var utils = require("../utils.js")
        var Discord = require("discord.js");
        msg.react("👍");
        utils.readDatabase(`${msg.guild.id}/users`, database).then(users => {
            // Deletes dev entries, so devs aren't included in leaderboard
            Object.keys(users).forEach(key => {
                if (users[key]["dev"] == true) {
                    delete users[key];
                }
            });

            // Sort by balance
            sorted = Array.from(Object.keys(users)).sort((a, b) => {
                if (users[a]["balance"] < users[b]["balance"]) {
                    return 1;
                }
                return -1;
            });

            // Creates entries for embed message
            const promises = [];
            let fields = [];
            for (let i = 0; i < 5; i++) {
                // Skips if there are less people than 5
                if (i >= Object.keys(users).length)
                    continue;
                promises.push(
                    msg.guild.members.fetch(sorted[i]).then(found => {
                        foundUser = "N/A";
                        if (found != undefined && found.user != undefined) {
                            foundUser = found.user.username;
                        }
                        else {
                            console.log(`Fetch error: ${found} \n ${found.user}`);
                        }
                        console.log(users[sorted[i]]);
                        fields[i] = { name: `${i + 1}. ${foundUser}`, value: `${users[sorted[i]]["balance"]} <:damasiodollar:865942969089785876> damasio dollars` };
                    })
                );
            }

            // Waits until all promises are resolved to create the leaderboard
            Promise.all(promises).then(() => {
                const leaderboard = new Discord.MessageEmbed()
                    .setTitle("🏆Top 5 Money Makers🏆");
                leaderboard.addFields(fields);
                msg.channel.send(leaderboard);
            });
        });
    },
};