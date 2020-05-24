var express = require('express');
var request = require('request');
var router = express.Router();
var funct = require('../handlers/functions.js');

/*
*
*
* */
router.post('/', function(req, res, next) {
    let req_body = req.body;
    let suppliers_uri = funct.getRelUriValue(req_body['links'],"/rels/domestic/current-supply /rels/self");

    funct.sendPOST(suppliers_uri, req_body['data-template'], function(err, result) {
        let usage_uri = funct.getRelUriValue(result['links'],"/rels/domestic/usage /rels/next");
        funct.sendGET(usage_uri,function(err, _result) {
            res.send(_result);
        });
    });

});



router.post('/validate', function(req, res, next) {
    let req_body = req.body;
    let suppliers_uri = funct.getRelUriValue(req_body['links'],"/rels/domestic/current-supply /rels/self");
    var post_supplier_template = function(callback) {

        let options = {
            method: 'PUT',
            body: req_body['data-template'],
            json: true,
            url: suppliers_uri + 'validate/energySupply',
            headers: {
                Authorization: 'Bearer ' + user_token,
                'Accept': 'application/vnd-fri-domestic-energy+json; version=3.0',
                "Content-Type": "application/vnd-fri-domestic-energy+json; version=3.0"
            }
        };
        request(options, function (err, res, body) {
            if (err) {
                return callback(err);
            }
            return callback(null,body);
        });
    };


    post_supplier_template(function(err, result) {
        res.send(JSON.stringify(result));
    });
});

module.exports = router;
