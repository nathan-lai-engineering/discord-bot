module.exports = {
    name: "rankup",
    description: "Ranks the user up",
    syntax: "rankup",
    example: "rankup",
    database: true,
    execute(msg, args, database) {
        var utils = require("../utils.js");
        utils.readDatabase(`${msg.guild.id}/ranks`, database).then(ranks => {
            let keys = Object.keys(ranks).sort().reverse();
            for (let i = 1; i < keys.length; i++) {
                console.log(ranks[keys[i]]);
                let foundRole = msg.member.roles.cache.find(role => {
                    if (!role.hasOwnProperty('id') || role == undefined)
                        return false;
                    return role.id == ranks[keys[i]]["id"];
                });
                if (foundRole != undefined && foundRole != null) {
                    console.log(foundRole.name);
                    utils.getMoney(database, msg.guild.id, msg.author.id).then(bal => {
                        msg.channel.send(`Rankup from ${foundRole.name} will cost ${ranks[keys[i]]["cost"]} <:damasiodollar:865942969089785876> damasio dollars. Type **confirm** to proceed`);
                        console.log("Rankup intiated");
                        msg.channel.awaitMessages(m => m.author.id == msg.author.id,
                            { max: 1, time: 30000 }).then(collected => {
                                if (collected.first().content.toLowerCase() == "confirm") {
                                    if (bal >= ranks[keys[i]]["cost"]) {
                                        console.log("Fetching next rank");
                                        msg.guild.roles.fetch(ranks[keys[i - 1]]["id"]).then(toRole => {
                                            if (toRole != undefined || toRole != null) {
                                                console.log("Adding next rank");
                                                msg.member.roles.add(toRole).then(() => {
                                                    console.log("Removing old rank");
                                                    msg.member.roles.remove(foundRole).then(() => {
                                                        msg.channel.send(`Rankup complete, your bal is now ${bal - ranks[keys[i]]["cost"]} <:damasiodollar:865942969089785876> damasio dollars`);
                                                        utils.addMoney(database, msg.guild.id, msg.author.id, -ranks[keys[i]]["cost"]).then(() => {

                                                        });
                                                    });
                                                });
                                            }
                                        });
                                    }
                                    else {
                                        msg.channel.send("You're actually too poor for this");
                                    }
                                } else {
                                    msg.channel.send("No confirmation received, rank up cancelled");
                                }


                            }).catch(error => {
                                console.log(error);
                                msg.channel.send("No confirmation received, rank up cancelled");
                            });

                    });
                }
            }
        });
    },
};
