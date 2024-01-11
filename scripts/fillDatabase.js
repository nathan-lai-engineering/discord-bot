const championData = require("./tft_data.json");
const {oracleQuery, getOracleCredentials} = require('../utils/oracle');
const oracledb = require('oracledb');

const oracleLogin = getOracleCredentials();

let championList = championData['sets']['10']['champions'];
let traitList = championData['sets']['10']['traits'];
console.log(traitList);

fillDatabase();


async function fillDatabase(){
    const connection = await oracledb.getConnection(oracleLogin);

    try{
        
        for(let trait of traitList){
            let unique = 0;
            if(['breakout', 'maestro', 'mixmaster', 'illbeats', 'wildcard'].includes(trait))
                unique = 1;
            let sqlString = `
            INSERT INTO traits (set_number, trait_name, is_unique) 
            SELECT 10, :trait_name, :is_unique 
            FROM dual 
            WHERE NOT EXISTS(
                SELECT * FROM traits 
                WHERE set_number = 10 and trait_name=:trait_name
            )`;
            console.log("executing")
            await connection.execute(sqlString, {trait_name: trait, is_unique: unique}, {});
            
        }
        
       for(let champion of championList){
        
        let sqlString = `
        INSERT INTO champions (set_number, champion_name, cost) 
        SELECT 10, :champion_name, :champion_cost
        FROM dual 
        WHERE NOT EXISTS(
            SELECT * FROM champions
            WHERE set_number = 10 and champion_name=:champion_name
        )`;
        console.log("executing")
        await connection.execute(sqlString, {champion_name: champion.name, champion_cost: champion.cost}, {});
        
       for(let trait of champion.traits){
            let sqlString = `
            INSERT INTO champion_traits (trait_name, set_number, champion_name) 
            SELECT :trait_name, 10, :champion_name
            FROM dual 
            WHERE NOT EXISTS(
                SELECT * FROM champion_traits
                WHERE trait_name=:trait_name and set_number=10 and champion_name=:champion_name
            )`;
            console.log("executing")
            await connection.execute(sqlString, {champion_name: champion.name, trait_name: trait}, {});
       }

       }
        connection.commit();
    }
    catch(error){
        console.error(error);
    }
    finally{
        connection.close();
    }
}