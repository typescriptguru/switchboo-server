var request = require('request');

//const key = "F63ED344-8A05-4065-81C0-CE5D2DC23F6E"; //test
const key = "A421A3F4-32E9-4100-ACFB-489FAA14747D"; //live

function getRelUriValue(template, relVal) {
    for(let val of template) {
        if (val['rel'] === relVal) {
            return(val['uri']);
        }
    }
}

function addApiAndReference(template) {
    for(let val of template.groups) {
        if (val['name'] === "references") {
            for(let item of val['items']) {
                if (item['name'] === "partnerReference") {
                    item['data'] = "switchboo";
                }
                if (item['name'] === "apiKey") {
                    item['data'] = key;
                }
            }
        }
    }
    return template;
}

function sendGET(uri, callback) {

    let options = {
        method: 'get',
        json: true,
        url: uri,
        headers: {
            Authorization: 'Bearer ' + user_token,
            'Accept': 'application/vnd-fri-domestic-energy+json; version=3.0'
        }
    };
    request(options, function (err, res, body) {
        if (err) {
            console.log('error with GET: ', err);
            return callback(err);
        }
        return callback(null,body);
    });
}

function sendPOST(uri, data, callback) {

    let options = {
        method: 'post',
        body: data,
        json: true,
        url: uri,
        headers: {
            Authorization: 'Bearer ' + user_token,
            'Accept': 'application/vnd-fri-domestic-energy+json; version=3.0',
            "Content-Type": "application/vnd-fri-domestic-energy+json; version=3.0"
        }
    };
    request(options, function (err, res, body) {
        if (err) {
            console.log('error posting json: ', err);
            return callback(err);
        }
        return callback(null,body);
    });
};

function sendAsyncGET(uri) {
    return new Promise(function (resolve, reject) {
        let options = {
            method: 'get',
            json: true,
            url: uri,
            headers: {
                Authorization: 'Bearer ' + user_token,
                'Accept': 'application/vnd-fri-domestic-energy+json; version=3.0'
            }
        };
        request(options, function (err, res, body) {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}

function sendAsyncPOST(uri, data) {
    return new Promise(function (resolve, reject) {
        let options = {
            method: 'post',
            body: data,
            json: true,
            url: uri,
            headers: {
                Authorization: 'Bearer ' + user_token,
                'Accept': 'application/vnd-fri-domestic-energy+json; version=3.0',
                "Content-Type": "application/vnd-fri-domestic-energy+json; version=3.0"
            }
        };

        request(options, function (err, res, body) {
            if (!err) {
                resolve(body);
            } else {
                reject(err);
            }
        });
    });
}


function buildError(text, includeContainer) {
    try {

        let obj = {};
        obj['message'] = {};
        obj['message']['id'] = "";
        obj['message']['text'] = text;

        if (includeContainer === false) {
            return obj;
        } else {
            let _obj = {};
            _obj['errors'] = [];
            _obj['errors'].push(obj)
            return _obj;
        }

    } catch(error) {
        console.error(error);
    }
}


function getValue(template, outer, inner) {
    try {
        for(let val of template.groups) {
            if (val.name === outer) {
                for (let item of val['items']) {
                    if (item['name'] === inner) {
                        return item['data'];
                    }
                }
            }
        }
        return "";
    } catch(error) {
        console.log(error);
        return "";
    }
}


module.exports = {
    getRelUriValue,
    addApiAndReference,
    sendGET,
    sendPOST,
    buildError,
    getValue,
    sendAsyncPOST,
    sendAsyncGET
};