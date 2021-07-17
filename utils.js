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

module.exports = {
    addMoney,
    getMoney
}