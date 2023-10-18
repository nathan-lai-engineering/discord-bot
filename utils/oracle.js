const oracledb = require('oracledb');

module.exports = {oracleQuery}

/**
 * Helper method for wrapping oracle connection and query
 * @param {*} sqlString 
 * @param {*} binds 
 * @param {*} config 
 * @returns 
 */
async function oracleQuery(sqlString, binds, config){
    if(binds == undefined){
        binds = [];
    }
    if(config == undefined){
        config = {};
    }
    const oracleLogin = require('../oracledb.json');

    var connection;
    var result = null;
    connection = await oracledb.getConnection(oracleLogin);
    try{
        oracledb.fetchAsBuffer = [oracledb.BLOB];
        result = await connection.execute(sqlString, binds, config);
        console.log(result)
    }
    catch(error){
        console.error(error);
    }
    finally{
        connection.close();
    }
    return result;
}