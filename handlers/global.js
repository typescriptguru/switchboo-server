var mysql = require('mysql');

//const initurl = "https://rest.staging.energyhelpline.com/domestic/energy"; //test
const initurl = "https://rest.energyhelpline.com/domestic/energy"; //live


//const tokenurl = "https://rest.staging.energyhelpline.com/token"; //test
const tokenurl = "https://rest.energyhelpline.com/token"; //live

//const auth = "Basic R2V0IEJldHRlciBCaWxsczo1Nlh5QzJGSTRsQldxR1hIeDFSOXNWTjNvVzRadWxxUg=="; //test
const auth = "Basic U3dpdGNoQm9vX0FQSTpuVkJrbnJWVlUybVVMbnNLdnd2TVFLWE02NjVHc2lpeQ=="; //live

global.user_token = "";
global.pool = null;
global.pool_loaded = false;
var request = require('request');
var get_token = function(callback) {
    let options = {
        method: 'post',
        timeout: 10000,
        body: "grant_type=client_credentials&scope=Domestic",
        json: true,
        url: tokenurl,
        headers: {
            Authorization: auth,
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };
    request(options, function (err, res, body) {
        if (err) {
            console.error('err res: ', res);
            return callback(err);
        }
        return callback(null,body['access_token']);
    });
};


/*
 * automatically generates a new token every 8 minutes as the token expires after 10
 * ideally if it fails to fetch a token for whatever reason it needs to try again instantly
 * but i dont know how to implement that
 * also im not sure if there will be issues with different controllers potentially accessing the token at the same time ?
 * likewise with the generateToken() changing the user_token at the same time a controller access's it
 */
let attempts = 0;
function generateToken() {
    console.log("generating new token");
    get_token(function (err, token_result) {
        if (err && attempts++ < 3){
            console.log("failed to generate token, attempt: ", attempts);
            generateToken();
        } else {
            console.log("token: " + token_result);
            user_token = token_result;
        }
    });
}

function startMySQL() {
    console.log("starting MySQL connection pool");
    pool = mysql.createPool({
        host            : '77.68.16.238',
        //host            : '127.0.0.1',
        user            : 'callum',
        password        : 'Ss546hhn#',
        database        : 'switchboo',
        //host            : '127.0.0.1',
        //user            : 'root',
        //password        : '',
        //database        : 'test',
        queueLimit : 0, // unlimited queueing
        connectionLimit : 0 // unlimited connections
    });

    pool.getConnection(function(err, connection) {
        if (err) {
            console.log("MySQL startup error - " + err);
        } else {
            console.log("MySQL connection pool started");

            /*
            pool.on('enqueue', function () {
                console.log('Waiting for available connection slot');
            });

            pool.on('release', function (connection) {
                console.log('Connection %d released', connection.threadId);
                console.log("number of connections in pool: " + pool._allConnections.length);
                console.log("number of free connections in pool: " + pool._freeConnections.length);
            });
            */

            pool.on('error', function (error) {
                console.log('pool error: ' + error);
            });
        }

        try {
            connection.release();
            pool_loaded = true;
        } catch(error) {
            pool = null;
            console.log("error starting MySQL connection pool");
            console.log("restarting MySQL connection pool init");
            startMySQL();
        }

    });
}







module.exports = {
    generateToken,
    user_token,
    pool,
    startMySQL,
    pool_loaded,
    tokenurl,
    auth,
    initurl
};
