var express = require('express');
var request = require('request');
var router = express.Router();
var funct = require('../handlers/functions.js');
var db = require('../handlers/databaseHandler.js');
var async = require('async');




router.post('/', function(req, res, next) {
    let req_body = req.body;
    let user_email = "";
    if ("email" in req_body) {
        user_email = req_body['email'];
    }
    let switch_uri = funct.getRelUriValue(req_body['links'],"/rels/domestic/switch");
    let usage_uri = funct.getRelUriValue(req_body['links'],"/rels/domestic/usage /rels/self");
    let usage_data_template = req_body['data-template'];

    var put_preferences = function(uri, template, callback) {

        let options = {
            method: 'post',
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
                console.log('error posting json: ', err);
                return callback(err);
            }
            return callback(null,body);
        });
    };
    var put_preference_template = function(uri, template, callback) {

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
                console.log('error posting json: ', err);
                return callback(err);
            }
            return callback(null,body);
        });
    };


    funct.sendPOST(usage_uri, usage_data_template, function(err, result) {

        if ("errors" in result) {
            res.send(JSON.stringify(result));
            return false;
        }

        db.insertSupplierInfo(switch_uri, user_email, function(result) {
        });


        let preferences_uri = funct.getRelUriValue(result['links'],"/rels/domestic/preferences /rels/next");
        funct.sendGET(preferences_uri, function(err, _result) {

            let template = _result['data-template'];

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

            let put_uri = funct.getRelUriValue(_result['links'],"/rels/domestic/preferences /rels/self");
            funct.sendPOST(put_uri, template, function(err, __result) {

                let future_supply_uri = funct.getRelUriValue(__result['links'], '/rels/domestic/future-supply /rels/next');
                funct.sendGET(future_supply_uri, function(err, ___result) {


                    let future_supply_template = ___result;
                    let suppliers_uri = funct.getRelUriValue(___result['linked-data'], "/rels/domestic/future-supplies");
                    funct.sendGET(suppliers_uri, function(err, supplier_results) {



                        let supply_type = 0;
                        if ("gas" in supplier_results['currentSupply']) {
                            supply_type = 4;
                        } else {
                            supply_type = 2;
                        }

                        let rtnarry = [];
                        for (let resultOBJ of supplier_results['results']) {
                            if (resultOBJ['supplyType']['id'] == supply_type) {
                                for (let result of resultOBJ['energySupplies']) {
                                    if ("canApply" in result) {
                                        if (result['canApply'] === true && "tariffType" in result) {
                                            if (result['tariffType'] !== "Variable") {
                                                if (result['expectedAnnualSavings'] > 0) {
                                                    rtnarry.push(result)
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }


                        let rtn_result = {};
                        rtn_result['template'] = future_supply_template;
                        rtn_result['tariffs'] = rtnarry;

                        let switch_uri = funct.getRelUriValue(future_supply_template['links'], "/rels/domestic/switch");
                        funct.sendGET(switch_uri, function(err, switch_response) {
                            let current_uri = switch_response['currentSupply']['details']['uri'];
                                funct.sendGET(current_uri, function(err, current_response) {
                                rtn_result['currentUsage'] = current_response;
                                console.log(JSON.stringify(rtn_result));
                                res.send(JSON.stringify(rtn_result));
                            });
                        });
                        return;
                        if (supplier === null) {
                            console.log("supplier is nulled");
                            let _error = funct.buildError("Sorry we cant seem to find you a better deal at the moment, Please check back once your current tariff ends.", true);
                            res.send(JSON.stringify(_error));
                            return true;
                        }

                        console.log("SUPPLIER");
                        console.log(JSON.stringify(supplier));
                        let supplier_details_uri = supplier['supplyDetails']['details']['uri'];
                        let preference_put_uri = funct.getRelUriValue(future_supply_template['links'], '/rels/domestic/future-supply /rels/self');
                        future_supply_template['data-template']['groups'][0]['items'][0]['data'] = supplier['id'];

                        put_preference_template(preference_put_uri, future_supply_template['data-template'], function(err, _p_template) {
                            let _p_uri = funct.getRelUriValue(_p_template['links'], '/rels/domestic/signup');
                            funct.sendGET(_p_uri, function (err, _result_s) {
                                let return_template = injectReturnTemplate(_result_s);
                                funct.sendGET(supplier_details_uri, function(err, details) {
                                    return_template['future-supplier'] = supplier;
                                    return_template['future-supplier-details'] = details;

                                    funct.sendGET(switch_uri, function(err, switch_data) {
                                        if (err) res.send(JSON.stringify(return_template));
                                        return_template = parseSwitch(return_template, switch_data);

                                        let current_supply_details_uri = switch_data['futureEnergySupply']['details']['uri'];
                                        funct.sendGET(current_supply_details_uri, function(err, csdetails) {
                                            if (err) res.send(JSON.stringify(return_template));
                                            return_template = parseNewDetails(return_template, csdetails);
                                            res.send(JSON.stringify(return_template));
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});


function injectReturnTemplate(data_template) {
    let return_response = data_template;
    let template = data_template['data-template'];
    let addressOne = false;
    let addressTwo = false;
    let correspondanceAddress = false;
    let priorityRegister = false;
    let propertyOwner = false;
    let overseas = false;
    let employment = false;

    for (let group of template.groups) {
        if (group.name === "addressHistoryTwoPreviousAddresses") {
            addressTwo = true;
        }
        if (group.name === "correspondenceAddress") {
            correspondanceAddress = true;
        }
        if (group.name === "priorityRegister") {
            priorityRegister = true;
        }
        if (group.name === "addressHistoryOnePreviousAddress") {
            addressOne = true;
        }
        if (group.name === "propertyOwnerStatus") {
            propertyOwner = true;
        }

        if (group.name === "addressHistoryWithOverseasOption") {
            overseas = true;
        }

        if (group.name === "employmentStatus") {
            employment = true;
        }


    }


    if (addressTwo === false) {
        let obj = JSON.parse('{"addon": true,"items":[{"data":"","name":"firstPreviousPostcode","prompt":"Postcode of your previous address","validateAs":"/validate/ukPostcode"},{"data":"","name":"knownfirstPreviousAddress","prompt":"Select your previous address","rel":"/rels/domestic/address-lookup","type":"linked"},{"data":"","name":"firstPreviousFlatNumber","prompt":"Flat number of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousHouseNumber","prompt":"House number of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousHouseName","prompt":"House name of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousAddressLine1","prompt":"First line of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousAddressLine2","prompt":"Second line of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousTown","prompt":"Town of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousCounty","prompt":"County of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"timeAtFirstPreviousAddress","prompt":"Time at your previous address in months","type":"int"},{"data":"","name":"secondPreviousPostcode","prompt":"Postcode of your second previous address","validateAs":"/validate/ukPostcode"},{"data":"","name":"knownSecondPreviousAddress","prompt":"Select your second previous address","rel":"/rels/domestic/address-lookup","type":"linked"},{"data":"","name":"secondPreviousFlatNumber","prompt":"Flat number of your second previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"secondPreviousHouseNumber","prompt":"House number of your second previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"secondPreviousHouseName","prompt":"House name of your second previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"secondPreviousAddressLine1","prompt":"First line of your second previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"secondPreviousAddressLine2","prompt":"Second line of your second previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"secondPreviousTown","prompt":"Town of your second previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"secondPreviousCounty","prompt":"County of your second previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","mandatory":true,"name":"timeAtSupplyAddress","prompt":"Time at your supply address in months","type":"int"}],"name":"addressHistoryTwoPreviousAddresses","tags":"AddressHistory","title":"Address history"}');
        template.groups.push(obj);
    }

    if (addressOne === false) {
        let obj = JSON.parse('{"addon":true, "items":[{"data":"","name":"firstPreviousPostcode","prompt":"Postcode of your previous address","validateAs":"/validate/ukPostcode"},{"data":"","name":"knownfirstPreviousAddress","prompt":"Select your previous address","rel":"/rels/domestic/address-lookup","type":"linked"},{"data":"","name":"firstPreviousFlatNumber","prompt":"Flat number of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousHouseNumber","prompt":"House number of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousHouseName","prompt":"House name of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousAddressLine1","prompt":"First line of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","mandatory":true,"name":"timeAtSupplyAddress","prompt":"Time at your supply address in months","type":"int"}],"name":"addressHistoryOnePreviousAddress","tags":"AddressHistory","title":"Address history"}');
        template.groups.push(obj);
    }

    if (correspondanceAddress === false) {
        let obj = JSON.parse('{"addon": true,"items":[{"data":true,"mandatory":true,"name":"isSameAsSupplyAddress","prompt":"Is your billing address the same as your supply address?","type":"bool"},{"acceptableValues":[{"id":"Mr","name":"Mr"},{"id":"Mrs","name":"Mrs"},{"id":"Miss","name":"Miss"},{"id":"Ms","name":"Ms"},{"id":"Dr","name":"Dr"}],"data":"","name":"title","prompt":"Title","type":"oneOf"},{"data":"","name":"firstName","prompt":"First name","regularExpression":"^[-a-zA-Z0-9 .\'&ñçàáâãäèéêëìíîïòóôõöùúûü]{2,50}$","regularExpressionErrorMessage":"Please enter between 2 and 50 characters and not any special characters"},{"data":"","name":"surname","prompt":"Surname","regularExpression":"^[-a-zA-Z0-9 .\'&ñçàáâãäèéêëìíîïòóôõöùúûü]{2,50}$","regularExpressionErrorMessage":"Please enter between 2 and 50 characters and not any special characters"},{"data":"","name":"knownAddress","prompt":"Select your address","rel":"/rels/domestic/address-lookup","type":"linked"}],"name":"correspondenceAddress","tags":"CorrespondenceAddress","title":"Correspondence address","validateAs":"/validate/correspondenceAddress"}');
        template.groups.push(obj);
    }

    if (priorityRegister === false) {
        let obj = JSON.parse('{"addon": true,"guidance":[{"reference":"/guidance/special-needs","statement":"If you have any special needs or requirements, your new supplier may be able to offer you specialised support for your energy supply.","title":"Priority Register"}],"items":[{"acceptableValues":[{"id":"0","name":"None"},{"id":"1","name":"Additional presence preferred"},{"id":"2","name":"Blind"},{"id":"3","name":"Careline/telecare system"},{"id":"4","name":"Chronic/serious illness"},{"id":"5","name":"Dementia"},{"id":"6","name":"Developmental condition"},{"id":"7","name":"Dialysis, feeding pump and automated medication"},{"id":"8","name":"Electric showering (e.g. skin related conditions/disabled)"},{"id":"9","name":"Families with young children aged 5 or under"},{"id":"10","name":"Hearing/speech difficulties (inc. Deaf)"},{"id":"11","name":"Heart, lung & ventilator"},{"id":"12","name":"Medicine refrigeration"},{"id":"13","name":"Mental health"},{"id":"14","name":"Nebuliser, or Apnoea monitor"},{"id":"15","name":"Oxygen concentrator (powered by electricity)"},{"id":"16","name":"Oxygen tank use"},{"id":"17","name":"Partially sighted"},{"id":"18","name":"Pensionable age"},{"id":"19","name":"Physical impairment (incl. severe arthiritis, or disabled)"},{"id":"20","name":"Poor sense of smell"},{"id":"21","name":"Restricted hand movement"},{"id":"22","name":"Stair lift, hoist, electric bed"},{"id":"23","name":"Temporary - Life changes"},{"id":"24","name":"Temporary - Post hospital recovery"},{"id":"25","name":"Temporary - Young adult householder aged under 18"},{"id":"26","name":"Unable to answer door/restricted movement"},{"id":"27","name":"Unable to communicate in English"}],"data":"0","guidance":[{"reference":"/guidance/special-needs","statement":"If you have any special needs or requirements, your new supplier may be able to offer you specialised support for your energy supply","title":"Priority Register"}],"mandatory":true,"name":"specialNeeds","prompt":"Your supplier may have a Priority Service Register, so that in the event of a planned supply interruption, your network operator is able to contact you should they need to. There are additional services available if you are eligible, details of which will be sent in a letter. The service is for anyone in your household who is of pensionable age, is registered as disabled, is long term sick, has a sight or hearing difficulty, or uses illness related equipment that may need electricity. Do you have any special conditions that you would like us to make your supplier of?","type":"oneOf"},{"acceptableValues":[{"id":"Yes","name":"Yes"},{"id":"No","name":"No"}],"data":"No","mandatory":true,"name":"consent","prompt":"With your consent your supplier will share some of your information with the company responsible for getting the energy to your house. You\'ll get extra support from them when you need it, such as when there is a planned gas or electricity outage. Do you give consent for your information to be shared by your supplier with your local network operator?","type":"oneOf"}],"name":"priorityRegister","tags":"AdditionalInformation","title":"Priority Register"}');
        template.groups.push(obj);
    }

    if (propertyOwner === false) {
        let obj = JSON.parse('{"addon": true,"items":[{"acceptableValues":[{"id":"Property Owner","name":"Property Owner"},{"id":"Tenant","name":"Tenant"},{"id":"Landlord","name":"Landlord"}],"data":"","mandatory":true,"name":"propertyOwnerStatus","prompt":"Residential status","type":"oneOf"}],"name":"propertyOwnerStatus","tags":"SupplyAddress","title":"Residential status"}');
        template.groups.push(obj);
    }

    if (overseas === false) {
        let obj = JSON.parse('{"addon": true, "items":[{"data":false,"name":"firstPreviousAddressWasOverseas","prompt":"Was your previous address overseas?","type":"bool"},{"data":"","name":"firstPreviousPostcode","prompt":"Postcode of your previous address","validateAs":"/validate/ukPostcode"},{"data":"","name":"knownfirstPreviousAddress","prompt":"Select your previous address","rel":"/rels/domestic/address-lookup","type":"linked"},{"data":"","name":"firstPreviousFlatNumber","prompt":"Flat number of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousHouseNumber","prompt":"House number of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousHouseName","prompt":"House name of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","name":"firstPreviousAddressLine1","prompt":"First line of your previous address","regularExpression":"^.{0,50}$","regularExpressionErrorMessage":"Input must be no more than 50 characters"},{"data":"","mandatory":true,"name":"timeAtSupplyAddress","prompt":"Time at your supply address in months","type":"int"}],"name":"addressHistoryWithOverseasOption","tags":"AddressHistory","title":"Address history"}');
        template.groups.push(obj);
    }

    if (employment === false) {
        let obj = JSON.parse('{"items":[{"acceptableValues":[{"id":"EmployedFullTime","name":"Employed Full Time"},{"id":"EmployedPartTime","name":"Employed Part Time"},{"id":"SelfEmployed","name":"Self Employed"},{"id":"Unemployed","name":"Unemployed"},{"id":"Retired","name":"Retired"},{"id":"Homemaker","name":"Homemaker"},{"id":"Student","name":"Student"}],"data":"EmployedFullTime","mandatory":true,"name":"employmentStatus","prompt":"Employment status","type":"oneOf"}],"name":"employmentStatus","tags":"PersonalDetails","title":"Employment status"}');
        template.groups.push(obj);
    }

    return_response['data-template'] = template;
    return return_response;


}

function parseNewDetails(arr, details) {

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

router.post('/validate', function(req, res, next) {
    let req_body = req.body;
    let usage_uri = funct.getRelUriValue(req_body['links'],"/rels/domestic/usage /rels/self");
    var post_supplier_template = function(callback) {

        let options = {
            method: 'PUT',
            body: req_body['data-template'],
            json: true,
            url: usage_uri + 'validate/usage',
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
