var express = require('express');
var router = express.Router();
var db = require('../handlers/databaseHandler.js');


router.post('/', function(req, res, next) {

    let req_body = req.body;

    let ref = req_body['refID'];
    let energy = req_body['energySupplier'];
    let pay = req_body['payless'];
    let customer = req_body['customerName'];
    let phone = req_body['phoneNumber'];

    db.insertRef(ref, energy, pay, customer, phone, function (result) {
        res.send(JSON.stringify(result));
    });
});


module.exports = router;
