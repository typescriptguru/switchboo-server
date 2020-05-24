var mysql = require('mysql');
var funct = require('../handlers/functions.js');
var quoteHandler = require('../handlers/generateQuoteLink.js');
var db = require('../handlers/databaseHandler');
var nextDate = require('../handlers/nextSwitchDateHandler.js');
var sgMail = require('../handlers/emailHandler.js');
let email = "";
async function init() {
    console.log("autorun intialised");
    let switches = await getExpiredSwitches();
    if (switches === null) {
        console.log("no switches to re-run");
        return false;
    }
    for (let expired_switch of switches) {
        try {
        console.log("Handling switch with user ID: " + expired_switch['ID']);
        email = expired_switch['email'];
        let result = await process(expired_switch['ID']);
        db.insertSwitchHistory(expired_switch['ID'], result);
        console.log("switch result for " + expired_switch['ID'] + ": " +  JSON.stringify(result));
        console.log("finished processing with ID: " + expired_switch['ID']);
        } catch (e) {
            console.log(e);
        }
    }
}

async function process(id) {
        try {

            let quote_result = await getQuoteLink(id);
            if (quote_result['error'] === true) return(quote_result);

            let continue_result = await continueWithUsage(quote_result['result']);
            if (continue_result['error'] === true) return(continue_result);

            let prefs_result = await handlePreferences(continue_result['result']);
            if (prefs_result['error'] === true) return(prefs_result);

            let switch_data_result = await handleSwitchData(prefs_result['result']);
            if (switch_data_result['error'] === true) return(switch_data_result);

            let handle_switch_result = await handleSwitch(id, switch_data_result['result']);
            return handle_switch_result;


        } catch (e) {
            return(buildResponse(true, e, null));
        }
}

function getQuoteLink(id) {
    return new Promise(function (resolve) {
        let query = "SELECT * FROM tblquotelink where userID = " + id;
        pool.query(query, function (error, quote_results, fields) {
            try {
                if (error) resolve(buildResponse(true, "MySQL error on getQuoteLink", null));
                if (quote_results === []) resolve(buildResponse(true, "quote_result is undefined"))
                if (typeof(quote_results[0]) === undefined) resolve(buildResponse(true, "quote_result has no length", null));
                if (quote_results[0]['hasError'] === 1) resolve(buildResponse(true, "quote_result hasError is true", null));
                resolve(buildResponse(false, null, quote_results[0]['uri']));
            } catch (e) {
                resolve(buildResponse(true, "quote link doesnt exist", null));
            }
        });
    });
}

function continueWithUsage(uri) {
    return new Promise(function (resolve) {
        try {
            funct.sendGET(uri, function (err, quote_result) {
                if (err) resolve(buildResponse(true, "error in quote link get", null));
                let continue_with_usage_uri = funct.getRelUriValue(quote_result['links'], "/rels/domestic/quote/create-switch-with-usage");
                funct.sendGET(continue_with_usage_uri, function (err, usage_result) {
                    if (err) resolve(buildResponse(true, "error in continue_with_usage GET", null));
                    if (!("data-template" in usage_result)) resolve(buildResponse(true, "no data-template in usage_result", null));
                    let template = usage_result['data-template'];
                    funct.sendPOST(continue_with_usage_uri, template, function (err, usage_post_result) {
                        if (err) resolve(buildResponse(true, "error in posting usage", null));
                        resolve(buildResponse(false, null, usage_post_result));
                    });
                });

            });
        } catch (e) {
            resolve(buildResponse(true, e, null));
        }
    });
}

function getExpiredSwitches() {
    return new Promise(function (resolve, reject) {
        try {
            let query = "SELECT * FROM tblswitch where nextSwitchDate < NOW()";
            pool.query(query, function (error, results, fields) {
                if (error) resolve(null);
                resolve(results);
            });

        } catch (e) {
            resolve(null);
        }
    });
}

function handlePreferences(template) {
    return new Promise(function (resolve, reject) {
        try {
            let switch_uri = funct.getRelUriValue(template['links'], "/rels/domestic/switch /rels/next");
            funct.sendGET(switch_uri, function (err, switch_result) {
                if (err) resolve(buildResponse(true, err, null));
                let prefs_uri = funct.getRelUriValue(switch_result['links'], "/rels/domestic/preferences /rels/next");
                funct.sendGET(prefs_uri, function (err, prefs_result) {
                    if (err) resolve(buildResponse(true, err, null));

                    let template = prefs_result['data-template'];
                    for (let val of template.groups) {
                        if (val['name'] === "tariffFilterOptions") {
                            for (let item of val['items']) {
                                if (item['name'] === "partnerReference") {
                                    item['data'] = "105";
                                }
                            }
                        }
                        if (val['name'] === "resultsOrder") {
                            for (let item of val['items']) {
                                if (item['name'] === "partnerReference") {
                                    item['data'] = "1";
                                }
                            }
                        }
                        if (val['name'] === "limitToPaymentType") {
                            for (let item of val['items']) {
                                if (item['name'] === "paymentMethod") {
                                    let has_minus_one = false;
                                    for (let ptype of item['acceptableValues']) {
                                        if (ptype['id'] === "-1") {
                                            has_minus_one = true;
                                        }
                                    }
                                    if (has_minus_one) {
                                        item['data'] = "-1";
                                    } else {
                                        item['data'] = "3";
                                    }
                                }
                            }
                        }
                    }

                    funct.sendPOST(prefs_uri, template, function (err, prefs_post_result) {
                        if (err) resolve(buildResponse(true, err, null));
                        resolve(buildResponse(false, null, prefs_post_result));
                    });
                });
            });
        } catch (e) {
            resolve(buildResponse(true, e, null));
        }
    });

}

function handleSwitchData(template) {
    return new Promise(function (resolve) {
        try {
            let future_supply_uri = funct.getRelUriValue(template['links'], "/rels/domestic/future-supply /rels/next");
            funct.sendGET(future_supply_uri, function (err, future_supply_result) {
                if (err) resolve(buildResponse(true, err, null));
                let template = future_supply_result['data-template']; //contains template to post back with tariff ID

                let linked_data_uri = funct.getRelUriValue(future_supply_result['linked-data'], "/rels/domestic/future-supplies");
                funct.sendGET(linked_data_uri, function (err, linked_data_result) {
                    if (err) resolve(buildResponse(true, err, null));
                    let future_suppliers = linked_data_result; //contains quote link

                    let save_amount = 50;
                    let switch_type = 0;
                    if (future_suppliers['currentSupply']['supplyType'] === "SingleElectricity") {
                        switch_type = "2";
                        save_amount = 25;
                    } else {
                        switch_type = "4";
                        save_amount = 50;
                    }

                    if (future_suppliers['currentSupply']['electricity']['paymentMethod']['id'] === "3") {
                        save_amount = 15;
                    }

                    let obj = {};
                    obj['template'] = template;
                    obj['futureSuppliers'] = future_suppliers;
                    obj['saveAmount'] = save_amount;
                    obj['switchType'] = switch_type;
                    obj['futureSupplyUri'] = future_supply_uri;
                    resolve(buildResponse(false, null, obj));

                });
            });
        } catch (e) {
            resolve(buildResponse(true, e, null));
        }
    });
}


async function handleSwitch(id, data) {
    try {
        let return_response = {};

        let tariff_template = data.template;
        let future_suppliers = data.futureSuppliers; //contains quote link
        let save_amount = data.saveAmount;
        let switch_type = data.switchType;

        let above_save_amount = false;
        let all_questions_answered = false;
        let questions = await getQuestions(id);
        for (let result_col of future_suppliers['results']) {
            if (result_col['supplyType']['id'] === switch_type) {
                for (let supplier of result_col['energySupplies']) {
                    if (supplier['canApply'] === true && all_questions_answered === false && supplier['expectedAnnualSavings'] > save_amount && supplier['tariffType'] !== "Variable") {
                        above_save_amount = true;
                        tariff_template = updateTariffTemplate(tariff_template, supplier['id']);
                        return_response['newCost'] = supplier['expectedAnnualSpend'].toString();
                        return_response['newSaving'] = supplier['expectedAnnualSavings'].toString();
                        return_response['newSupplier'] = supplier['supplier']['name'];
                        return_response['newTariff'] = supplier['supplyDetails']['name'];


                        let future_supplier_links = await funct.sendAsyncPOST(data.futureSupplyUri, tariff_template);
                        let signup_uri = funct.getRelUriValue(future_supplier_links['links'], "/rels/domestic/signup");
                        let signup_result = await funct.sendAsyncGET(signup_uri);

                        let signup_template = signup_result['data-template'];

                        signup_template = populateQuestionTemplate(signup_template, questions);

                        let signup_response = await funct.sendAsyncPOST(signup_uri, signup_template);

                        if (!("data-template" in signup_response)) {
                            all_questions_answered = true;

                            let confirmation_uri = funct.getRelUriValue(signup_response['links'], "/rels/domestic/confirmation /rels/next");
                            let confirmation_template = await funct.sendAsyncGET(confirmation_uri);
                            for(let val of confirmation_template['data-template'].groups) {
                                if (val.name === "confirmSwitch") {
                                    for (let item of val['items']) {
                                        if (item['name'] === "confirm") {
                                            item['data'] = true;
                                        }
                                    }
                                }
                            }

                            let confirmation_response = await funct.sendAsyncPOST(confirmation_uri, confirmation_template['data-template']);
                            if (!("data-template" in confirmation_response)) {
                                let response_uri = funct.getRelUriValue(confirmation_response['links'], "/rels/domestic/switch");
                                let switch_data = funct.sendAsyncGET(response_uri);
                                return_response = parseSwitch(return_response, switch_data);
                                return_response['EHL'] = switch_data['customerData']['EHLReference'];

                                let current_supply_details_uri = switch_data['futureEnergySupply']['details']['uri'];
                                let csdetails = funct.sendAsyncGET(current_supply_details_uri);
                                    return_response = parseNewDetails(return_response, csdetails);

                                let email_template = sgMail.AsyncCreateTemplate(return_response, return_response, return_response['newSaving']);
                                return_response['template'] = email_template;
                                sgMail.send(email_template , email,function(result) {});


                                let insert_response = await handleInsert(id, signup_response, supplier);
                                console.log("insert response for " + id + ": " + insert_response);
                                return buildResponse(false, null, return_response);
                            } else {
                                return buildResponse(true, "confirmation still had data-template", null);
                            }
                        } else {
                            console.log("failed data-template");
                            console.log(JSON.stringify(signup_response['errors']));
                        }
                    }
                }
            }
        }
        console.log(id + ": passed reach end");
        if (above_save_amount === false) {
            return buildResponse(true, "could not find a better deal", null);
        }

        if (all_questions_answered === false) {
            return buildResponse(true, "could not find a supplier with the questions we have stored", null);
        }

    } catch (e) {
        console.log(e);
        return buildResponse(true, "unsepecified error in autoswitch", null);
    }
}


function updateTariffTemplate(template, id) {
    let _template = template;
    for (let group of _template.groups) {
        if (group.name === "futureSupply") {
            for (let item of group.items) {
                if (item.name === "id") {
                    item['data'] = id;
                }
            }
        }
    }
    return _template;
}

function populateQuestionTemplate(template, questions) {
    let _template = template;
    for (let parent of _template.groups) {
        for (let child of parent.items) {
            for (let question of questions) {
                if (question.parent === parent.name) {
                    if (question.child === child.name) {
                        child['data'] = question.data;
                    }
                }
            }
        }
    }
    return _template;
}

function getQuestions(id) {
    return new Promise(function (resolve, reject) {
        let query = "SELECT * FROM tblquestions where userID = " + id;
        pool.query(query, function (error, results, fields) {
            let questions = [];
            if (error) reject(error);

            let has_preffered_payment = false;

            for (let row of results) {
                try {
                    let obj = {};
                    obj['parent'] = row['qParent'];
                    obj['child'] = row['qChild'];
                    obj['data'] = JSON.parse(row['qData']);
                    questions.push(obj);

                    let newObj = {};
                    if (obj.parent === "directDebitBankAccount") {
                        newObj['parent'] = "directDebitBankAccountWithPreferredPaymentDay";
                        newObj['child'] = obj['child'];
                        newObj['data'] = obj['data'];
                        questions.push(newObj);
                    }

                    let newObj1 = {};
                    if (obj.parent === "directDebitBankAccountWithPreferredPaymentDay") {
                        newObj1['parent'] = "directDebitBankAccount";
                        newObj1['child'] = obj['child'];
                        newObj1['data'] = obj['data'];
                        questions.push(newObj1);
                    }


                    if (obj.child === "preferredPaymentDay") {
                        has_preffered_payment = true;
                    }

                } catch (e) {
                    reject(e)
                }
            }

            if (has_preffered_payment === false) {
                let obj = {};
                obj['parent'] = "directDebitBankAccountWithPreferredPaymentDay";
                obj['child'] = "preferredPaymentDay";
                obj['data'] = "1";
                questions.push(obj);
            }

            console.log("questions for: " + id);
            console.log(JSON.stringify(questions));
            resolve(questions);
        });
    });
}

function handleInsert(id, signup_response, supplier) {
    return new Promise(function (resolve, reject) {
        db.getEmail(id, function (err, email) {
            if (err ) resolve(false);
            quoteHandler.generate(signup_response, function (result) {
                db.insertQuoteLink(email, result, function (response) {
                    console.log(response);
                    let obj_fill = {};
                    obj_fill['future-supplier'] = supplier;
                    nextDate.generateNextDate(obj_fill, function (next_date_response) {
                        db.updateNextSwitch(email, next_date_response, function (ins_resp) {
                            resolve(true);
                        });
                    });
                });
            });
        });
    });
}

function buildResponse(error, message, result) {
    let response = {};
    response['error'] = error;
    response['message'] = message;
    response['result'] = result;
    return response;
}




function insertQuestions(result) {

    for (let group of result.groups) {
        for (let item of group.items) {
            let countQuery = 'SELECT COUNT(*) AS count FROM tbltemp where qParent = "' + group['name'] + '" and qChild = "' + item['name'] + '"';
            pool.query(countQuery, function (error, results, fields) {
                if (results[0].count === 0) {

                    let post = {
                        ID: 0,
                        qParent: group['name'],
                        qChild: item['name'],
                        qFull: JSON.stringify(group)
                    };

                    pool.query('INSERT INTO tbltemp SET ?', post, function (error, results, fields) {
                        if (error) {
                            console.log("got an error inserting: " + error);
                        }
                    });
                }
            });
        }
    }
    return true;
}


function parseNewDetails(arr, details) {

    console.log("details----");
    console.log(details);


    if ("supplies" in details) {
        for (let supply of details['supplies']) {
            let fuel = "new" + supply['fuel'];

            //new supplier name
            if ("supplier" in supply) {
                arr[fuel + "Name"] = supply['supplier']['name'];

            }

            if ("supplierTariff" in supply) {
                if ("annualStandingChargeInPounds" in supply['supplierTariff']) {
                    arr[fuel + "StandingCharge"] = supply['supplierTariff']['annualStandingChargeInPounds'];
                }
                if ("durationWithCurrentSupplierInMonths" in supply['supplierTariff']) {
                    arr[fuel + "Duration"] = supply['supplierTariff']['durationWithCurrentSupplierInMonths'];
                }
                if ("exitFees" in supply['supplierTariff']) {
                    arr[fuel + "ExitFee"] = supply['supplierTariff']['exitFees'];
                }
                if ("name" in supply['supplierTariff']) {
                    arr[fuel + "TariffName"] = supply['supplierTariff']['name'];
                }
                if ("standingCharge" in supply['supplierTariff']) {
                    arr[fuel + "StandingCharge"] = supply['supplierTariff']['standingCharge'];
                }
                if ("unitCharge" in supply['supplierTariff']) {
                    arr[fuel + "UnitCharge"] = supply['supplierTariff']['unitCharge'];
                }
                if ("tariffType" in supply['supplierTariff']) {
                    arr[fuel + "TariffType"] = supply['supplierTariff']['tariffType'];
                }
                if ("paymentMethod" in supply['supplierTariff']) {
                    arr[fuel + "PaymentMethod"] = supply['supplierTariff']['paymentMethod']['name'];
                }

                if ("discounts" in supply['supplierTariff']) {
                    arr[fuel + "Discounts"] = supply['supplierTariff']['discounts'];
                }

                if ("otherServices" in supply['supplierTariff']) {
                    arr[fuel + "OtherServices"] = supply['supplierTariff']['otherServices'];
                }

                if ("nightUnitCharge" in supply['supplierTariff']) {
                    arr[fuel + "NightUnit"] = supply['supplierTariff']['nightUnitCharge'];
                }

                if ("priceGuaranteedUntil" in supply['supplierTariff']) {
                    arr[fuel + "PriceGuaranteed"] = supply['supplierTariff']['priceGuaranteedUntil'];
                }
            }
        }
    }

    return arr;
}

function parseSwitch(arr, switchdata) {
    //old electricity names
    if ("currentSupply" in switchdata) {
        if ("electricity" in switchdata['currentSupply']) {
            arr['oldElecSupplierName'] = switchdata['currentSupply']['electricity']['supplier']['name'];
            arr['oldElecTariffName'] = switchdata['currentSupply']['electricity']['supplierTariff']['name'];
            arr['oldElecPaymentName'] = switchdata['currentSupply']['electricity']['paymentMethod']['name'];
        }
    }

    //old gas names
    if ("currentSupply" in switchdata) {
        if ("gas" in switchdata['currentSupply']) {
            arr['oldGasSupplierName'] = switchdata['currentSupply']['gas']['supplier']['name'];
            arr['oldGasTariffName'] = switchdata['currentSupply']['gas']['supplierTariff']['name'];
            arr['oldGasPaymentName'] = switchdata['currentSupply']['gas']['paymentMethod']['name'];
        }
    }

    //old electicity usage
    if ("currentUsage" in switchdata) {
        if ("elec" in switchdata['currentUsage']) {
            arr['oldAnnualElecKwh'] = switchdata['currentUsage']['elec']['annualKWh'];
            arr['oldAnnualElecSpend'] = switchdata['currentUsage']['elec']['annualSpend'];
        }
    }

    //old gas usage
    if ("currentUsage" in switchdata) {
        if ("gas" in switchdata['currentUsage']) {
            arr['oldAnnualGasKwh'] = switchdata['currentUsage']['gas']['annualKWh'];
            arr['oldAnnualGasSpend'] = switchdata['currentUsage']['gas']['annualSpend'];
        }
    }

    //new cost
    if ("futureUsage" in switchdata) {
        if ("elec" in switchdata['futureUsage']) {
            arr['newElecMonthlyCost'] = switchdata['futureUsage']['elec']['estimatedMonthlyCost'];
        }
        if ("gas" in switchdata['futureUsage']) {
            arr['newGasMonthlyCost'] = switchdata['futureUsage']['gas']['estimatedMonthlyCost'];
        }
    }

    return arr;
}

module.exports = {
    init
};