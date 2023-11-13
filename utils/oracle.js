const oracledb = require('oracledb');

module.exports = {oracleQuery}

/**
 * Method for basic wrapping oracle connection and query
 * @param {*} sqlString 
 * @param {*} binds 
 * @param {*} config 
 * @returns 
 */
async function oracleQuery(sqlString, binds=[], config={}){
    const oracleLogin = require('../external/oracledb.json');
    const connection = await oracledb.getConnection(oracleLogin);

    var result = null
    try{
        oracledb.fetchAsBuffer = [oracledb.BLOB];
        result = await connection.execute(sqlString, binds, config);
    }
    catch(error){
        console.error(error);
    }
    finally{
        connection.close();
    }
    return result;
}
