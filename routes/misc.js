var express = require('express');
var request = require('request');
var router = express.Router();
var funct = require('../handlers/functions.js');



router.post('/postcode', function(req, res, next) {
    let req_body = req.body;
    let postcode = req_body['postcode'];
    let uri = req_body['uri'];
    uri = uri.replace("{&postcode}", "&postcode=" + postcode);


    funct.sendGET(uri, function(err, result) {
        res.send(JSON.stringify(result['addresses']));
    });
});



module.exports = router;