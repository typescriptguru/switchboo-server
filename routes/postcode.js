var express = require('express');
var request = require('request');
var router = express.Router();
var funct = require('../handlers/functions.js');
var db = require('../handlers/databaseHandler.js');


router.post('/', function(req, res, next) {


    let req_body = req.body;
    let market = req_body['marketing'];

    let ref = null;
    if(req_body.hasOwnProperty("ref")) {
        ref = req_body['ref'];
    }

    let phone = null;
    if(req_body.hasOwnProperty("phoneno")) {
        phone = req_body['phoneno'];
    }


    let data_template = funct.addApiAndReference(req_body['data-template']);
    let email = funct.getValue(data_template, "references", "customerReference");
    let postcode = funct.getValue(data_template, "supplyPostcode", "postcode");
    let uri_link = funct.getRelUriValue(req_body['links'], "/rels/domestic/switches /rels/bookmark /rels/self");

    db.duplicateEmail(email, function(result) {
        if (result === 0 && email !== "") {
            funct.sendPOST(uri_link, data_template, function(err, result) {
                let current_supply_template_uri = funct.getRelUriValue(result['links'], "/rels/domestic/current-supply /rels/next");
                let switch_uri = funct.getRelUriValue(result['links'], "/rels/domestic/switch");
                if (!result.hasOwnProperty("errors")) {
                    funct.sendGET(current_supply_template_uri, function (err, supplier_result) {
                        let supplier_data_template = supplier_result;
                        let supplier_information_uri = funct.getRelUriValue(supplier_result['linked-data'], "/rels/domestic/current-supplies");

                        funct.sendGET(supplier_information_uri, function (err, supplier_info_result) {
                            funct.sendGET(switch_uri, function(err, switch_data) {
                                let uuid = switch_data['id'];
                                db.insertEmail(postcode, email, uuid, market, ref, function (result) {

                                    if (phone !== null) {
                                        console.log("got phone");
                                        db.getUserID(email, function (err, uidresponse) {
                                            console.log("response from getUserID: " + uidresponse);
                                            if (uidresponse > 0) {
                                                db.insertPhone(uidresponse, phone, function (response) {
                                                    console.log(response);
                                                });
                                            }
                                        });
                                    }

                                    if (result === false) {
                                        console.log("error in postcode insert");
                                    }
                                });
                            });
                            let supplier_data = supplier_info_result;
                            let responseObj = {};
                            responseObj['data-template'] = supplier_data_template;
                            responseObj['data-template']['supply-data'] = supplier_data;
                            res.send(JSON.stringify(responseObj));
                        });
                    });
                } else { //here
                    res.send(JSON.stringify(result));
                }
            });
        } else {
            let _error = funct.buildError("You already have an active switch associated with this email, Please use another email address", true);
            res.send(JSON.stringify(_error));
        }
    });

});


module.exports = router;
