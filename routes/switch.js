var express = require('express');
var request = require('request');
var router = express.Router();
var funct = require('../handlers/functions.js');
var quoteHandler = require('../handlers/generateQuoteLink.js');
var db = require('../handlers/databaseHandler');
var questionHandler = require('../handlers/questionHandler.js');
var nextDate = require('../handlers/nextSwitchDateHandler.js');
var sgMail = require('../handlers/emailHandler.js');

router.post('/', function(req, res, next) {
    console.log("START OF SWITCH POST");
    let req_body = req.body;
    let email = req_body['email'];

    let switch_uri = funct.getRelUriValue(req_body['links'],"/rels/domestic/signup /rels/self");
    var post_form_two = function(callback) {
        let options = {
            method: 'PATCH',
            body: req_body['data-template'],
            json: true,
            url: switch_uri ,
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
    var get_confirmation = function(uri, callback) {

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
                console.log('error posting json: ', err);
                return callback(err);
            }
            return callback(null,body);
        });
    };
    var put_confirm = function(uri, template, callback) {
        let options = {
            method: 'PUT',
            body: template,
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
                return callback(err);
            }
            return callback(null,body);
        });
    };

    post_form_two(function(err, result) {

        console.log("sending postformtwo");
        if (result['data-template'] === undefined) {

            if ("errors" in result) {
                console.log("JSON has error: ");
                console.log(JSON.stringify(result['errors']));
                res.send(JSON.stringify(result));
                return false;
            }

            console.log("no postformtwo result:");
            console.log(JSON.stringify(result));
            let confirmation_uri = funct.getRelUriValue(result['links'], "/rels/domestic/confirmation /rels/next");
            console.log("confirmationuri:" + confirmation_uri);
            get_confirmation(confirmation_uri, function(err, _result) {
            console.log("got confirmation:");
            console.log(JSON.stringify(_result));
                let confirmation_template = _result['data-template'];
                let confirm_uri = funct.getRelUriValue(_result['links'],"/rels/domestic/confirmation /rels/self");

                for(let val of confirmation_template.groups) {
                    if (val.name === "confirmSwitch") {
                        for (let item of val['items']) {
                            if (item['name'] === "confirm") {
                                item['data'] = true;
                            }
                        }
                    }
                }


                put_confirm(confirm_uri, confirmation_template, function(err, confirm_response) {
                    let rsps_uri = funct.getRelUriValue(confirm_response['links'], "/rels/domestic/switch");
                    funct.sendGET(rsps_uri, function(err, send_response) {

                        console.log("calling quotehandler");
                        quoteHandler.generate(req_body, function(result) {
                            console.log("quote response: ");
                            console.log(JSON.stringify(result));
                            db.insertQuoteLink(email, result, function(response) {
                            });
                        });

                        questionHandler.parseQuestions(req_body, function(question_result) {
                            if (question_result['error'] === false) {
                                db.insertQuestions(email, question_result['result'], function(response) {
                                });
                            }
                        });

                        nextDate.generateNextDate(req_body, function(next_date_response) {
                            db.updateNextSwitch(email, next_date_response, function(ins_resp) {
                            });
                        });

                        let return_response = {};
                        return_response['newCost'] = req_body['future-supplier']['expectedAnnualSpend'].toString();
                        return_response['newSaving'] = req_body['future-supplier']['expectedAnnualSavings'].toString();
                        return_response['newSupplier'] = req_body['future-supplier']['supplier']['name'];
                        return_response['newTariff'] = req_body['future-supplier']['supplyDetails']['name'];
                        return_response['EHL'] = send_response['customerData']['EHLReference'];
                        sgMail.createTemplate(send_response, req_body, return_response['newSaving'], function(email_template) {
                            return_response['template'] = email_template;
                            sgMail.send(email_template ,email, function(result) {});
                            db.getUserID(email, function (err, response) {
                                if (response > 0) {
                                    let history = buildResponse(false, null, return_response);
                                    db.insertSwitchHistory(response, history);
                                }
                            });
                        });
                        res.send(JSON.stringify(send_response));
                    });

                });
            });
        } else {
            res.send(JSON.stringify(result));
        }
    });


});

function buildResponse(error, message, result) {
    let response = {};
    response['error'] = error;
    response['message'] = message;
    response['result'] = result;
    return response;
}

module.exports = router;
