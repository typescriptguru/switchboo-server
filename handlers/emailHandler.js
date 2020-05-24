const sgMail = require('@sendgrid/mail');
var fs = require('fs');




function createTemplate(confirmation, formTwo, saving,  callback) {
    let template = "";

    read('handlers/template.txt', function(data) {
        template = data;
        template = template.replace("#PRICE#", parseFloat(saving).toFixed(2));

        if ("customerData" in confirmation) {


            if ("nextSteps" in confirmation['customerData']) {
                if (confirmation['customerData']['nextSteps'] === "") {
                    template = template.replace("#nextsteps#", "Supplier has no next step");
                } else {
                    template = template.replace("#nextsteps#", confirmation['customerData']['nextSteps']);
                }
            } else {
                template = template.replace("#nextsteps#", "N/A");
            }

            if ("EHLReference" in confirmation['customerData']) {
                template = template.replace("#referencenumber#", confirmation['customerData']['EHLReference']);
            } else {
                template = template.replace("#referencenumber#", "N/A");
            }

            let name = "";
            if ("title" in confirmation['customerData']) {
                name = name + confirmation['customerData']['title'];
            }
            if ("firstName" in confirmation['customerData']) {
                name = name + " " + confirmation['customerData']['firstName'];
            }
            if ("surname" in confirmation['customerData']) {
                name = name + " " + confirmation['customerData']['surname'];
            }
            template = template.replace('#AAA#', name);


            if ("supplyAddress" in confirmation['customerData']) {
                template = template.replace('#BBB#', confirmation['customerData']['supplyAddress']);
                template = template.replace('#MMM#', confirmation['customerData']['supplyAddress']);
            } else {
                template = template.replace('#BBB#', "N/A");
                template = template.replace('#MMM#', "N/A");
            }

            if ("eMail" in confirmation['customerData']) {
                template = template.replace('#CCC#', confirmation['customerData']['eMail']);
            } else {
                template = template.replace('#CCC#', "N/A");
            }

            if ("daytimePhoneNumber" in confirmation['customerData']) {
                template = template.replace('#DDD#', confirmation['customerData']['daytimePhoneNumber']);
            } else if ("eveningPhoneNumber" in confirmation['customerData']) {
                template = template.replace('#DDD#', confirmation['customerData']['eveningPhoneNumber']);
            } else {
                template = template.replace('#DDD#', "N/A");
            }


        }

        if ("supplyLocation" in confirmation) {
            if ("region" in confirmation['supplyLocation']) {
                template = template.replace('#region#', confirmation['supplyLocation']['region']['name']);
            } else {
                template = template.replace('#region#', "N/A");
            }
        } else {
            template = template.replace('#region#', "N/A");
        }

        let tariffinformation = "";
        if ("future-supplier-details" in formTwo) {
            for (let supply of formTwo["future-supplier-details"]['supplies']) {
                if (supply['fuel'] === "electricity") {

                    if ("supplier" in supply) {
                        let contact_info = "";

                        if ("email" in supply['supplier']) {
                            contact_info = contact_info + supply['supplier']["email"] + "<br>";
                        }
                        if ("contactTelephone" in supply['supplier']) {
                            contact_info = contact_info + supply['supplier']["contactTelephone"] + "<br>";
                        }
                        if ("supplierUrl" in supply['supplier']) {
                            contact_info = contact_info + supply['supplier']["supplierUrl"] + "<br>";
                        }

                        template = template.replace('#suppliercontact#', contact_info);

                    }


                    if ("supplierTariff" in supply) {
                        if ("tariffInformation" in supply['supplierTariff']) {
                            tariffinformation = supply['supplierTariff']['tariffInformation'];
                        }
                    }
                }
            }
        }

        if (tariffinformation === "") {
            template = template.replace('#tariffinfo#', "N/A");
        } else {
            template = template.replace('#tariffinfo#', tariffinformation);
        }

        if ("oldGasSupplierName" in formTwo) {
            template = template.replace('#EEE#', formTwo['oldGasSupplierName']);
        } else {
            template = template.replace('#EEE#', "N/A");
        }

        if ("oldElecSupplierName" in formTwo) {
            template = template.replace("#FTP#", formTwo['oldElecSupplierName']);
        } else {
            template = template.replace("#FTP#", "N/A");
        }

        if ("oldGasPaymentName" in formTwo) {
            template = template.replace('#GGG#', formTwo['oldGasPaymentName']);
        } else {
            template = template.replace('#GGG#', "N/A");
        }

        if ("oldElecPaymentName" in formTwo) {
            template = template.replace('#HHH#', formTwo['oldElecPaymentName']);
        } else {
            template = template.replace('#HHH#', "N/A");
        }

        if ("oldAnnualGasSpend" in formTwo) {
            template = template.replace('#III#', "£" + formTwo['oldAnnualGasSpend'].toFixed(2));
        } else {
            template = template.replace('#III#', "N/A");
        }

        if ("oldAnnualElecSpend" in formTwo) {
            template = template.replace('#JJJ#', "£" + formTwo['oldAnnualElecSpend'].toFixed(2));
        } else {
            template = template.replace('#JJJ#', "N/A");
        }

        if ("oldAnnualGasKwh" in formTwo) {
            console.log("oldAnnualGaskWH is in formTwo");
            if (template.includes("#upy#")) {
                console.log("template includes upy");
            } else {
                console.log("cant find upy in template");
            }

            template = template.replace('#AAAA#', formTwo['oldAnnualGasKwh'] + "kWh");
            template = template.replace('#001#', formTwo['oldAnnualGasKwh'] + "kWh");
        } else {
            template = template.replace('#AAAA#', "N/A");
            template = template.replace('#001#', "N/A");
        }

        if ("oldAnnualElecKwh" in formTwo) {
            template = template.replace('#LLL#', formTwo['oldAnnualElecKwh'] + "kWh");
            template = template.replace('#002#', formTwo['oldAnnualElecKwh'] + "kWh");
        } else {
            template = template.replace('#LLL#', "N/A");
            template = template.replace('#002#', "N/A");
        }



        if ("newgasName" in formTwo) {
            template = template.replace('#NNN#', formTwo['newgasName']);
        } else {
            template = template.replace('#NNN#', "N/A");
        }

        if ("newelectricityName" in formTwo) {
            template = template.replace('#OOO#', formTwo['newelectricityName']);
        } else {
            template = template.replace('#OOO#', "N/A");
        }

        if ("newgasTariffName" in formTwo) {
            template = template.replace('#PPP#', formTwo['newgasTariffName']);
        } else {
            template = template.replace('#PPP#', "N/A");
        }

        if ("newelectricityTariffName" in formTwo) {
            template = template.replace('#QQQ#', formTwo['newelectricityTariffName']);
        } else {
            template = template.replace('#QQQ#', "N/A");
        }

        if ("newgasTariffType" in formTwo) {
            template = template.replace('#RRR#', formTwo['newgasTariffType']);
        } else {
            template = template.replace('#RRR#', "N/A");
        }

        if ("newelectricityTariffType" in formTwo) {
            template = template.replace('#SSS#', formTwo['newelectricityTariffType']);
        } else {
            template = template.replace('#SSS#', "N/A");
        }

        if ("newelectricityPaymentMethod" in formTwo) {
            template = template.replace('#TTT#', formTwo['newelectricityPaymentMethod']);
        } else {
            template = template.replace('#TTT#', "N/A");
        }

        if ("newgasUnitCharge" in formTwo) {
            template = template.replace('#VVV#', formTwo['newgasUnitCharge']);
        } else {
            template = template.replace('#VVV#', "N/A");
        }

        if ("newelectricityUnitCharge" in formTwo) {
            template = template.replace('#WWW#', formTwo['newelectricityUnitCharge']);
        } else {
            template = template.replace('#WWW#', "N/A");
        }


        if ("newelectricityNightUnit" in formTwo) {
            template = template.replace('#YYY#', formTwo['newelectricityNightUnit']);
        } else {
            template = template.replace('#YYY#', "N/A");
        }

        if ("newgasStandingCharge" in formTwo) {
            template = template.replace('#ZZZ#', formTwo['newgasStandingCharge']);
        } else {
            template = template.replace('#ZZZ#', "N/A");
        }

        if ("newelectricityStandingCharge" in formTwo) {
            template = template.replace('#ABC#', formTwo['newelectricityStandingCharge']);
        } else {
            template = template.replace('#ABC#', "N/A");
        }


        if ("newgasDuration" in formTwo) {
            var date = new Date();
            var endDate = new Date(date.setMonth(date.getMonth()+formTwo['newgasDuration']));
            let month = parseInt(endDate.getMonth()) + 1;
            let newDate = endDate.getDate() + "/" + month + "/" + endDate.getFullYear();
            template = template.replace('#DEF#', newDate);
        } else {
            template = template.replace('#DEF#', "N/A");
        }

        if ("newelectricityDuration" in formTwo) {
            var date = new Date();
            var endDate = new Date(date.setMonth(date.getMonth()+formTwo['newelectricityDuration']));
            let month = parseInt(endDate.getMonth()) + 1;
            let newDate = endDate.getDate() + "/" + month + "/" + endDate.getFullYear();
            template = template.replace('#GHI#', newDate);
        } else {
            template = template.replace('#GHI#', "N/A");
        }

        if ("newgasPriceGuaranteed" in formTwo) {
            var date = new Date(parseInt(formTwo['newgasPriceGuaranteed'].substr(6)));
            let month = parseInt(date.getMonth()) + 1;
            let newDate = date.getDate() + "/" + month + "/" + date.getFullYear();
            template = template.replace('#JKL#', newDate);
        } else {
            template = template.replace('#JKL#', "N/A");
        }

        if ("newelectricityPriceGuaranteed" in formTwo) {
            var date = new Date(parseInt(formTwo['newelectricityPriceGuaranteed'].substr(6)));
            let month = parseInt(date.getMonth()) + 1;
            let newDate = date.getDate() + "/" + month + "/" + date.getFullYear();
            template = template.replace('#MNO#', newDate);
        } else {
            template = template.replace('#MNO#', "N/A");
        }

        if ("newgasExitFee" in formTwo) {
            template = template.replace('#PQR#', "£" + formTwo['newgasExitFee']);
        } else {
            template = template.replace('#PQR#', "N/A");
        }

        if ("newelectricityExitFee" in formTwo) {
            template = template.replace('#STU#', "£" + formTwo['newelectricityExitFee']);
        } else {
            template = template.replace('#STU#', "N/A");
        }

        if ("newelectricityDiscounts" in formTwo) {
            template = template.replace('#TTT#', formTwo['newelectricityDiscounts']);
        } else {
            template = template.replace('#TTT#', "N/A");
        }

        if ("newelectricityOtherServices" in formTwo) {
            template = template.replace('#specialoffers#', formTwo['newelectricityOtherServices']);
            template = template.replace('#123#', formTwo['newelectricityOtherServices']);
        } else {
            template = template.replace('#specialoffers#', "N/A");
            template = template.replace('#123#', "N/A");
        }

        if ("newGasMonthlyCost" in formTwo) {
            let cost = formTwo['newGasMonthlyCost'] * 12;
            template = template.replace('#003#', "£" + cost.toFixed(2));
        } else {
            template = template.replace('#003#', "N/A");
        }

        if ("newElecMonthlyCost" in formTwo) {
            let cost = formTwo['newElecMonthlyCost'] * 12;
            template = template.replace('#004#', "£" + cost.toFixed(2));
        } else {
            template = template.replace('#004#', "N/A");
        }


        if ("newGasMonthlyCost" in formTwo) {
            template = template.replace('#005#', "£" + formTwo['newGasMonthlyCost'].toFixed(2));
        } else {
            template = template.replace('#005#', "N/A");
        }

        if ("newElecMonthlyCost" in formTwo) {
            template = template.replace('#006#', "£" + formTwo['newElecMonthlyCost'].toFixed(2));
        } else {
            template = template.replace('#006#', "N/A");
        }

        callback(template);
    });
}

function send(template,email, callback) {
    console.log("sending email");
    sgMail.setApiKey("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");

    const msg = {
        to: email, //TODO: replace with email
        from: 'hello@switchboo.com',
        subject: 'Your recent switch',
        text: 'This email is in Html format, Please update your client',
        html: template,
    };

    sgMail.send(msg, (error, result) => {
        if (error) {
            console.log(JSON.stringify(error));
            return callback("failed");
        } else {
            return callback("ok");
        }
    });
}


function AsyncCreateTemplate(confirmation, formTwo, saving) {
    return new Promise(function (resolve, reject) {
        let template = "";

        read('handlers/template.txt', function(data) {
            template = data;
            template = template.replace("#PRICE#", parseFloat(saving).toFixed(2));

            if ("customerData" in confirmation) {

                if ("EHLReference" in confirmation['customerData']) {
                    template = template.replace("#referencenumber#", confirmation['customerData']['EHLReference']);
                } else {
                    template = template.replace("#referencenumber#", "N/A");
                }

                let name = "";
                if ("title" in confirmation['customerData']) {
                    name = name + confirmation['customerData']['title'];
                }
                if ("firstName" in confirmation['customerData']) {
                    name = name + " " + confirmation['customerData']['firstName'];
                }
                if ("surname" in confirmation['customerData']) {
                    name = name + " " + confirmation['customerData']['surname'];
                }
                template = template.replace('#AAA#', name);


                if ("supplyAddress" in confirmation['customerData']) {
                    template = template.replace('#BBB#', confirmation['customerData']['supplyAddress']);
                    template = template.replace('#MMM#', confirmation['customerData']['supplyAddress']);
                } else {
                    template = template.replace('#BBB#', "N/A");
                    template = template.replace('#MMM#', "N/A");
                }

                if ("eMail" in confirmation['customerData']) {
                    template = template.replace('#CCC#', confirmation['customerData']['eMail']);
                } else {
                    template = template.replace('#CCC#', "N/A");
                }

                if ("daytimePhoneNumber" in confirmation['customerData']) {
                    template = template.replace('#DDD#', confirmation['customerData']['daytimePhoneNumber']);
                } else if ("eveningPhoneNumber" in confirmation['customerData']) {
                    template = template.replace('#DDD#', confirmation['customerData']['eveningPhoneNumber']);
                } else {
                    template = template.replace('#DDD#', "N/A");
                }


            }

            if ("supplyLocation" in confirmation) {
                if ("region" in confirmation['supplyLocation']) {
                    template = template.replace('#region#', confirmation['supplyLocation']['region']['name']);
                } else {
                    template = template.replace('#region#', "N/A");
                }
            } else {
                template = template.replace('#region#', "N/A");
            }

            let tariffinformation = "";
            if ("future-supplier-details" in formTwo) {
                for (let supply of formTwo["future-supplier-details"]['supplies']) {
                    if (supply['fuel'] === "electricity") {

                        if ("supplier" in supply) {
                            let contact_info = "";

                            if ("email" in supply['supplier']) {
                                contact_info = contact_info + supply['supplier']["email"] + "<br>";
                            }
                            if ("contactTelephone" in supply['supplier']) {
                                contact_info = contact_info + supply['supplier']["contactTelephone"] + "<br>";
                            }
                            if ("supplierUrl" in supply['supplier']) {
                                contact_info = contact_info + supply['supplier']["supplierUrl"] + "<br>";
                            }

                            template = template.replace('#suppliercontact#', contact_info);

                        }


                        if ("supplierTariff" in supply) {
                            if ("tariffInformation" in supply['supplierTariff']) {
                                tariffinformation = supply['supplierTariff']['tariffInformation'];
                            }
                        }
                    }
                }
            }

            if (tariffinformation === "") {
                template = template.replace('#tariffinfo#', "N/A");
            } else {
                template = template.replace('#tariffinfo#', tariffinformation);
            }

            if ("oldGasSupplierName" in formTwo) {
                template = template.replace('#EEE#', formTwo['oldGasSupplierName']);
            } else {
                template = template.replace('#EEE#', "N/A");
            }

            if ("oldElecSupplierName" in formTwo) {
                template = template.replace("#FTP#", formTwo['oldElecSupplierName']);
            } else {
                template = template.replace("#FTP#", "N/A");
            }

            if ("oldGasPaymentName" in formTwo) {
                template = template.replace('#GGG#', formTwo['oldGasPaymentName']);
            } else {
                template = template.replace('#GGG#', "N/A");
            }

            if ("oldElecPaymentName" in formTwo) {
                template = template.replace('#HHH#', formTwo['oldElecPaymentName']);
            } else {
                template = template.replace('#HHH#', "N/A");
            }

            if ("oldAnnualGasSpend" in formTwo) {
                template = template.replace('#III#', "£" + formTwo['oldAnnualGasSpend'].toFixed(2));
            } else {
                template = template.replace('#III#', "N/A");
            }

            if ("oldAnnualElecSpend" in formTwo) {
                template = template.replace('#JJJ#', "£" + formTwo['oldAnnualElecSpend'].toFixed(2));
            } else {
                template = template.replace('#JJJ#', "N/A");
            }

            if ("oldAnnualGasKwh" in formTwo) {
                console.log("oldAnnualGaskWH is in formTwo");
                if (template.includes("#upy#")) {
                    console.log("template includes upy");
                } else {
                    console.log("cant find upy in template");
                }

                template = template.replace('#AAAA#', formTwo['oldAnnualGasKwh'] + "kWh");
                template = template.replace('#001#', formTwo['oldAnnualGasKwh'] + "kWh");
            } else {
                template = template.replace('#AAAA#', "N/A");
                template = template.replace('#001#', "N/A");
            }

            if ("oldAnnualElecKwh" in formTwo) {
                template = template.replace('#LLL#', formTwo['oldAnnualElecKwh'] + "kWh");
                template = template.replace('#002#', formTwo['oldAnnualElecKwh'] + "kWh");
            } else {
                template = template.replace('#LLL#', "N/A");
                template = template.replace('#002#', "N/A");
            }



            if ("newgasName" in formTwo) {
                template = template.replace('#NNN#', formTwo['newgasName']);
            } else {
                template = template.replace('#NNN#', "N/A");
            }

            if ("newelectricityName" in formTwo) {
                template = template.replace('#OOO#', formTwo['newelectricityName']);
            } else {
                template = template.replace('#OOO#', "N/A");
            }

            if ("newgasTariffName" in formTwo) {
                template = template.replace('#PPP#', formTwo['newgasTariffName']);
            } else {
                template = template.replace('#PPP#', "N/A");
            }

            if ("newelectricityTariffName" in formTwo) {
                template = template.replace('#QQQ#', formTwo['newelectricityTariffName']);
            } else {
                template = template.replace('#QQQ#', "N/A");
            }

            if ("newgasTariffType" in formTwo) {
                template = template.replace('#RRR#', formTwo['newgasTariffType']);
            } else {
                template = template.replace('#RRR#', "N/A");
            }

            if ("newelectricityTariffType" in formTwo) {
                template = template.replace('#SSS#', formTwo['newelectricityTariffType']);
            } else {
                template = template.replace('#SSS#', "N/A");
            }

            if ("newelectricityPaymentMethod" in formTwo) {
                template = template.replace('#TTT#', formTwo['newelectricityPaymentMethod']);
            } else {
                template = template.replace('#TTT#', "N/A");
            }

            if ("newgasUnitCharge" in formTwo) {
                template = template.replace('#VVV#', formTwo['newgasUnitCharge']);
            } else {
                template = template.replace('#VVV#', "N/A");
            }

            if ("newelectricityUnitCharge" in formTwo) {
                template = template.replace('#WWW#', formTwo['newelectricityUnitCharge']);
            } else {
                template = template.replace('#WWW#', "N/A");
            }


            if ("newelectricityNightUnit" in formTwo) {
                template = template.replace('#YYY#', formTwo['newelectricityNightUnit']);
            } else {
                template = template.replace('#YYY#', "N/A");
            }

            if ("newgasStandingCharge" in formTwo) {
                template = template.replace('#ZZZ#', formTwo['newgasStandingCharge']);
            } else {
                template = template.replace('#ZZZ#', "N/A");
            }

            if ("newelectricityStandingCharge" in formTwo) {
                template = template.replace('#ABC#', formTwo['newelectricityStandingCharge']);
            } else {
                template = template.replace('#ABC#', "N/A");
            }


            if ("newgasDuration" in formTwo) {
                var date = new Date();
                var endDate = new Date(date.setMonth(date.getMonth()+formTwo['newgasDuration']));
                let month = parseInt(endDate.getMonth()) + 1;
                let newDate = endDate.getDate() + "/" + month + "/" + endDate.getFullYear();
                template = template.replace('#DEF#', newDate);
            } else {
                template = template.replace('#DEF#', "N/A");
            }

            if ("newelectricityDuration" in formTwo) {
                var date = new Date();
                var endDate = new Date(date.setMonth(date.getMonth()+formTwo['newelectricityDuration']));
                let month = parseInt(endDate.getMonth()) + 1;
                let newDate = endDate.getDate() + "/" + month + "/" + endDate.getFullYear();
                template = template.replace('#GHI#', newDate);
            } else {
                template = template.replace('#GHI#', "N/A");
            }

            if ("newgasPriceGuaranteed" in formTwo) {
                var date = new Date(parseInt(formTwo['newgasPriceGuaranteed'].substr(6)));
                let month = parseInt(date.getMonth()) + 1;
                let newDate = date.getDate() + "/" + month + "/" + date.getFullYear();
                template = template.replace('#JKL#', newDate);
            } else {
                template = template.replace('#JKL#', "N/A");
            }

            if ("newelectricityPriceGuaranteed" in formTwo) {
                var date = new Date(parseInt(formTwo['newelectricityPriceGuaranteed'].substr(6)));
                let month = parseInt(date.getMonth()) + 1;
                let newDate = date.getDate() + "/" + month + "/" + date.getFullYear();
                template = template.replace('#MNO#', newDate);
            } else {
                template = template.replace('#MNO#', "N/A");
            }

            if ("newgasExitFee" in formTwo) {
                template = template.replace('#PQR#', "£" + formTwo['newgasExitFee']);
            } else {
                template = template.replace('#PQR#', "N/A");
            }

            if ("newelectricityExitFee" in formTwo) {
                template = template.replace('#STU#', "£" + formTwo['newelectricityExitFee']);
            } else {
                template = template.replace('#STU#', "N/A");
            }

            if ("newelectricityDiscounts" in formTwo) {
                template = template.replace('#TTT#', formTwo['newelectricityDiscounts']);
            } else {
                template = template.replace('#TTT#', "N/A");
            }

            if ("newelectricityOtherServices" in formTwo) {
                template = template.replace('#specialoffers#', formTwo['newelectricityOtherServices']);
                template = template.replace('#123#', formTwo['newelectricityOtherServices']);
            } else {
                template = template.replace('#specialoffers#', "N/A");
                template = template.replace('#123#', "N/A");
            }

            if ("newGasMonthlyCost" in formTwo) {
                let cost = formTwo['newGasMonthlyCost'] * 12;
                template = template.replace('#003#', "£" + cost.toFixed(2));
            } else {
                template = template.replace('#003#', "N/A");
            }

            if ("newElecMonthlyCost" in formTwo) {
                let cost = formTwo['newElecMonthlyCost'] * 12;
                template = template.replace('#004#', "£" + cost.toFixed(2));
            } else {
                template = template.replace('#004#', "N/A");
            }


            if ("newGasMonthlyCost" in formTwo) {
                template = template.replace('#005#', "£" + formTwo['newGasMonthlyCost'].toFixed(2));
            } else {
                template = template.replace('#005#', "N/A");
            }

            if ("newElecMonthlyCost" in formTwo) {
                template = template.replace('#006#', "£" + formTwo['newElecMonthlyCost'].toFixed(2));
            } else {
                template = template.replace('#006#', "N/A");
            }

            resolve(template);
        });
    });
}






function read(file, callback) {
    fs.readFile(file, 'utf8', function(err, data) {
        if (err) {
            console.log(err);
        }
        callback(data);
    });
}


module.exports = {
    send,
    createTemplate,
    AsyncCreateTemplate
};