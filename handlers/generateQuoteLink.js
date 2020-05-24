var funct = require('../handlers/functions.js');

function generate(template, callback) {
    try {
        let switch_uri = funct.getRelUriValue(template['links'], "/rels/domestic/switch");

        funct.sendGET(switch_uri, function(err, result) {
            if (err) return callback(buildResponse(true, "failed to get the switch with switch_uri", null));
            let switch_data = result;
            getPostcode(switch_data, function (result) {
                if (result['error'] === true) return callback(result);

                initialise(result['result'], function (response) {
                    if (response['error'] === true) return callback(response);
                    let init_result = response['result'];
                    if ("data-template" in init_result) return callback(true, "Failed to post back the postcode", null);
                    let supply_uri = funct.getRelUriValue(init_result['links'], "/rels/domestic/current-supply /rels/next");
                    handleSupply(supply_uri, switch_data, template, function (supply_result) {
                        if (supply_result['error'] === true) return callback(supply_result);

                        handleUsage(supply_result['result'], switch_data, template, function(usage_result) {
                            if (usage_result['error'] === true) return callback(usage_result);

                           let preferences_uri = funct.getRelUriValue(usage_result['result']['links'], "/rels/domestic/preferences /rels/next");
                           handlePreferences(preferences_uri, function(preferences_result) {
                               if (preferences_result['error'] === true) return callback(preferences_result);

                                handleQuote(preferences_result['result'], function(quote_result) {
                                    if (quote_result['error'] === true) return callback(quote_result);
                                    return callback(quote_result);
                                });
                           });
                        });
                    });
                });
            });
        });
    } catch(e) {
        return callback(buildResponse(true, e, null));
    }
}



function getPostcode(data, callback) {
    try {
        if ("supplyLocation" in data) {
            if ("supplyPostcode" in data['supplyLocation']) {
                return callback(buildResponse(false, null, data['supplyLocation']['supplyPostcode']));
            }
        }
        return callback(buildResponse(true, "Failed to parse postcode", null));
    } catch(e) {
        return callback(buildResponse(true, e, null));
    }
}

function initialise(postcode, callback) {
    try {
        funct.sendGET("https://rest.energyhelpline.com/domestic/energy", function(err, uri_result) {
            let uri = funct.getRelUriValue(uri_result.links, "/rels/domestic/switches /rels/bookmark");

            funct.sendGET(uri, function(err, template_result) {
                if (err) return callback(buildResponse(true, "failed to sendGET initialise", null));
                let data_template = funct.addApiAndReference(template_result['data-template']);

                for(let val of data_template.groups) {
                    if (val['name'] === "supplyPostcode") {
                        for(let item of val['items']) {
                            if (item['name'] === "postcode") {
                                item['data'] = postcode;
                            }
                        }
                    }
                }

                let post_uri = funct.getRelUriValue(template_result['links'], "/rels/domestic/switches /rels/bookmark /rels/self");
                funct.sendPOST(post_uri, data_template, function(err, result) {
                    if (err) return callback(buildResponse(true, "failed to sendPOST intialise", null));
                    return callback(buildResponse(false, null, result));
                });
            });
        });
    } catch(e) {
        return callback(buildResponse(true, e, null));
    }
}

function handleSupply(uri,switch_data, template, callback) {
    try {
        funct.sendGET(uri, function(err, response) {
            if (!("data-template" in response)) return callback(true, "no data-template in supply template", null);
                if (err) return callback(buildResponse(true, "failed to handle switch_uri in handleSupply", null));
                let _switch = switch_data;
                let _template = response['data-template'];
                for (let group of _template.groups) {

                    if (group.name === "includedFuels") {
                        for (let item of group.items) {

                            if (item.name === "compareGas") {
                                if (_switch['currentSupply']['supplyType'] === "DualGasAndElectricity") {
                                    item.data = true;
                                } else {
                                    item.data = false;
                                }
                            }

                            if (item.name === "compareElec") {
                                item.data = true;
                            }

                        }
                    }

                    if (group.name === "gasTariff") {
                        if ("futureEnergySupply" in _switch) {
                            if ("gas" in _switch['futureEnergySupply']) {
                                let _base = _switch['futureEnergySupply']['gas'];
                                for (let item of group.items) {
                                    if (item.name === "supplier") {
                                        item.data = _base['supplier']['id'];
                                    }
                                    if (item.name === "supplierTariff") {
                                        item.data = _base['supplierTariff']['id'];
                                    }
                                    if (item.name === "paymentMethod") {
                                        item.data = _base['paymentMethod']['id'];
                                    }
                                }
                            }
                        }
                    }

                    if (group.name === "elecTariff") {
                        if ("futureEnergySupply" in _switch) {
                            if ("electricity" in _switch['futureEnergySupply']) {
                                let _base = _switch['futureEnergySupply']['electricity'];
                                for (let item of group.items) {
                                    if (item.name === "supplier") {
                                        item.data = _base['supplier']['id'];
                                    }
                                    if (item.name === "supplierTariff") {
                                        item.data = _base['supplierTariff']['id'];
                                    }
                                    if (item.name === "paymentMethod") {
                                        item.data = _base['paymentMethod']['id'];
                                    }
                                    if (item.name === "economy7") {
                                        item.data = _base['economy7'];
                                    }
                                }
                            }
                        }
                    }

                }

                funct.sendPOST(uri, _template, function(err, u_result) {
                    console.log("sending quotelink post");
                    if (err) return callback(buildResponse(true, "failed to handle supplier post - handleSupply", null));
                    let usage_uri = funct.getRelUriValue(u_result['links'],"/rels/domestic/usage /rels/next");
                    if ("data-template" in u_result) return callback(buildResponse(true, "supply POST returned data template", null));
                    return callback(buildResponse(false, null, usage_uri));
                });
        });
    } catch(e) {
        return callback(buildResponse(true, e, null));
    }
}

function handleUsage(uri,switch_data, template, callback) {
    try {
        funct.sendGET(uri, function(err, response) {
            if (err) return callback(buildResponse(true, "Failed to get usage template", null));
            if (!("data-template" in response)) return callback(true, "no data-template in supply template", null);

            let _template = response['data-template'];
            for (let group of _template.groups) {
                if (group.name === "includedFuels") {
                    for (let item of group.items) {

                        if (item.name === "compareElec") {
                            item.data = true;
                        }

                        if (item.name === "compareGas") {
                            if ("gas" in switch_data['futureUsage']) {
                                item.data = true;
                            } else {
                                item.data = false;
                            }
                        }

                    }
                }

                if ("gas" in switch_data['futureUsage'] && group.name === "gasUsageType") {
                    for (let item of group.items) {
                        if (item.name === "usageType") {
                            item.data = "4";
                        }
                    }
                }

                if ("gas" in switch_data['futureUsage'] && group.name === "gasSpend") {
                    for (let item of group.items) {
                        if (item.name === "spendPeriod") {
                            item.data = "1";
                        }
                        if (item.name === "usageAsSpend") {
                            item.data = switch_data['futureUsage']['gas']['estimatedMonthlyCost'].toFixed(2);
                        }
                    }
                }

                if (group.name === "elecSpend") {
                    for (let item of group.items) {
                        if (item.name === "spendPeriod") {
                            item.data = "1";
                        }
                        if (item.name === "usageAsSpend") {
                            item.data = switch_data['futureUsage']['elec']['estimatedMonthlyCost'].toFixed(2);
                        }
                    }
                }

                if (group.name === "elecUsageType") {
                    for (let item of group.items) {
                        if (item.name === "usageType") {
                            item.data = "4";
                        }
                    }
                }

                if (group.name === "economy7") {
                    for (let item of group.items) {
                        if (item.name === "nightUsagePercentage") {
                            item.data = 0.42;
                        }
                    }
                }

            }

            funct.sendPOST(uri, _template, function(err, result) {
                if (err) return callback(buildResponse(true, "posting the usage template failed", null));

                if ("errors" in result) {
                    return callback(buildResponse(true, "Posting the usage template returned errors", null));
                }

                if ("data-template" in result) {
                    return callback(buildResponse(true, "posting the usage template returned an unexpected template", null));
                }

                return callback(buildResponse(false, null, result));
            });
        });
    } catch(e) {
        return callback(buildResponse(true, e, null));
    }
}

function handlePreferences(uri, callback) {
    try {
        funct.sendGET(uri, function(err, response) {
            if (err) return callback(buildResponse(true, "Failed to get preferences template", null));
            if (!("data-template" in response)) return callback(true, "no data-template in preferences template", null);
            let _template = response['data-template'];
            for (let val of _template.groups) {
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
            funct.sendPOST(uri, _template, function (err, post_response) {
                if (err) return callback(buildResponse(true, "Failed to post preferences", null));
                return callback(buildResponse(false, null, post_response));
            });
        });
    } catch(e) {
        return callback(buildResponse(true, e, null));
    }
}

function handleQuote(template, callback) {
    try {
        if (!("links" in template)) return callback(buildResponse(true, "failed to find links in quote template", null));

        let future_next = funct.getRelUriValue(template['links'], "/rels/domestic/future-supply /rels/next");
        funct.sendGET(future_next,function (err, result) {
            if (err) return callback(buildResponse(true, "failed to get future supply /rels/next", null));
            if (!("linked-data") in result) {
                return callback(buildResponse(true, "no linked-data in future-supply", null));
            }

            let future_supply_uri = funct.getRelUriValue(result['linked-data'], "/rels/domestic/future-supplies");
            funct.sendGET(future_supply_uri, function(err, supply_result) {
                if (err) return callback(buildResponse(true, "error in getting future supply", null));
                let bookmark_uri = funct.getRelUriValue(supply_result['links'], "/rels/bookmark /rels/domestic/quote");
                return callback(buildResponse(false, null, bookmark_uri));
            });
        });
    } catch(e) {
        return callback(buildResponse(true, e, null));
    }
}

function buildResponse(error, message, result) {
    let response = {};
    response['error'] = error;
    response['message'] = message;
    response['result'] = result;
    return response;
}

module.exports = {
generate
};