function addMoney(database, serverid, userid, amt) {
    let path = serverid + '/users/' + userid + '/balance/';
    getMoney(serverid, userid).then(currBal => {
        if (currBal == NaN || currBal == null)
            currBal = 0;
        if (debugMode)
            console.log("Adding " + amt + " to " + userid + "'s current balance of " + currBal);
        database.ref((String)(path)).set(amt + currBal, function (error) {
            if (error) {
                console.log("Write failed with error: " + error)
            }
        })
    })
}

function getMoney(database, serverid, userid) {
    let path = serverid + '/users/' + userid + '/balance/';
    return new Promise((resolve, reject) => {
        resolve(database.ref(path).once('value').then(snapshot => {
            let money = snapshot.val();
            console.log(money);
            return money;
        }))
    });
}

function readDatabase(path, database) {
    return new Promise((resolve, reject) => {
        resolve(database.ref(path).once('value').then(snapshot => snapshot.val()))
    });
}

function writeDatabase(path, value, database) {
    database.ref((String)(path)).set(value, function (error) {
        if (error) {
            console.log("Write failed with error: " + error);
        }
    });
}

module.exports = {
    addMoney,
    getMoney,
    readDatabase,
    writeDatabase
}