var mysql = require('mysql');
var funct = require('../handlers/functions.js');

function duplicateEmail(email, callback) {
    try {
        let query = 'SELECT COUNT(*) AS count FROM tblswitch where `email` = "' + email + '" and nextSwitchDate is not null';
        pool.query(query, function (error, results, fields) {
            if (error) throw error;
            return callback(results[0].count);
        });
    } catch(error) {
        console.error(error);
        return callback(1);
    }
}

function insertEmail(postcode, email, uuid, market, ref, callback) {
    try {

        let query = 'SELECT COUNT(*) AS count FROM tblswitch where `email` = "' + email + '"';
        pool.query(query, function (error, results, fields) {
            if (error) return callback(false);
            if (results[0].count === 0) {
                var post = {
                    ID: 0,
                    postcode: postcode,
                    email: email,
                    switched: 0,
                    nextSwitchDate: null,
                    uuid: uuid,
                    dateCreated: new Date(),
                    canMarket: market,
                    reference: ref
                };
                pool.query('INSERT INTO tblswitch SET ?', post, function (error, results, fields) {
                    if (error) {
                        if (error.code === "ER_DUP_ENTRY") {
                            return callback(true);
                        } else {
                            return false;
                        }
                    }
                    return callback(true);
                });
            } else {
                return callback(true);
            }
        });
    } catch(error) {
        console.error(error);
        return callback(false);
    }
}

function getUserID(email, callback) {
    try {
        let query = 'SELECT ID as userid FROM tblswitch where `email` = "' + email + '"';
        pool.query(query, function (error, results, fields) {
            if (error) callback(error, 0);
            if (results[0] !== undefined) {
                return callback(null,results[0].userid);
            } else {
                return callback(null,0);
            }
        });
    } catch(error) {
        console.error(error);
        return callback(error, 0);
    }
}

function getEmail(id, callback) {
    try {
        let query = 'SELECT email as userEmail FROM tblswitch where `ID` = ' + id;
        pool.query(query, function (error, results, fields) {
            if (error) callback(error, null);
            if (results.length > 0) {
                return callback(null,results[0].userEmail);
            } else {
                return callback("failed to get email",null);
            }
        });
    } catch(error) {
        console.error(error);
        return callback(error, null);
    }
}

function insertSupplierInfo(uri, email, callback) {// /rels/domestic/switch
    console.log("switch uri:");
    console.log(uri);
    let _email = email;
    let _uri = uri;

    funct.sendGET(_uri, function (err, result) {
        let post = {
            ID: 0,
            userID: 0,
            energyType: null,
            economySeven: 0,
            elecSupplier: null,
            elecTariff: null,
            elecPayment: null,
            gasSupplier: null,
            gasTariff: null,
            gasPayment: null,
            gasUseAmount: 0,
            elecUseAmount: 0,
            lastUpdated: new Date()
        };

        getUserID(_email, function(err, response) {
            if (response > 0) {
                post.userID = response;
                if ("currentSupply" in result) {
                    let cs = result['currentSupply'];

                    if ("supplyType" in cs) {
                        post.energyType = cs['supplyType'];
                    }

                    if ("electricity" in cs) {
                        let cse = cs['electricity'];

                        if ("economy7" in cse) {
                            if (cse['economy7'] === true) {
                                post.economySeven = 1;
                            } else {
                                post.economySeven = 0;
                            }
                        }

                        if ("paymentMethod" in cse) {
                            post.elecPayment = cse['paymentMethod']['name'];
                        }

                        if ("supplier" in cse) {
                            post.elecSupplier = cse['supplier']['name'];
                        }

                        if ("supplierTariff" in cse) {
                            post.elecTariff = cse['supplierTariff']['name'];
                        }

                    }

                    if ("gas" in cs) {
                        let csg = cs['gas'];
                        if ("paymentMethod" in csg) {
                            post.gasPayment = csg['paymentMethod']['name'];
                        }

                        if ("supplier" in csg) {
                            post.gasSupplier = csg['supplier']['name'];
                        }

                        if ("supplierTariff" in csg) {
                            post.gasTariff = csg['supplierTariff']['name'];
                        }

                    }

                }

                if ("currentUsage" in result) {
                    let cu = result['currentUsage'];

                    if ("elec" in cu) {
                        let cue = cu['elec'];

                        if ("annualSpend" in cue) {
                            post.elecUseAmount = cue['annualSpend'];
                        }
                    }

                    if ("gas" in cu) {
                        let cug = cu['gas'];

                        if ("annualSpend" in cug) {
                            post.gasUseAmount = cug['annualSpend'];
                        }
                    }
                }

                let countQuery = 'SELECT COUNT(*) AS count FROM tblformone where `userID` = ' + response;
                pool.query(countQuery, function (error, results, fields) {
                    if (error) throw error;

                    if (results[0].count === 0) {
                        pool.query('INSERT INTO tblformone SET ?', post, function (error, results, fields) {
                            if (error) {
                                console.log("got an error inserting: " + error);
                            }

                            return callback(true);
                        });

                    } else {
                        let update_post = [
                            post.energyType,
                            post.economySeven,
                            post.elecSupplier,
                            post.elecTariff,
                            post.elecPayment,
                            post.gasSupplier,
                            post.gasTariff,
                            post.gasPayment,
                            post.gasUseAmount,
                            post.elecUseAmount,
                            post.lastUpdated,
                            post.userID
                        ];

                        let qry = mysql.format('UPDATE tblformone SET energyType = ?, economySeven = ?, elecSupplier = ?, elecTariff = ?, elecPayment = ?, gasSupplier = ?, gasTariff = ?, gasPayment = ?, gasUseAmount = ?, elecUseAmount = ?, lastUpdated = ? WHERE userID = ?', update_post);
                        pool.query(qry, function (error, results, fields) {
                            if (error) {
                                console.log("got an error updating4: " + error);
                            }
                            return callback(true);
                        });
                    }
                });
            }
        });
    });
}

function insertQuoteLink(email, result, callback) {
    let post = {
        ID: 0,
        userID: 0,
        hasError: 0,
        errorMessage: null,
        uri: null,
        dateGenerated: new Date()
    };

    if (result['error'] === true) {
        post.hasError = 1;
        post.errorMessage = result['message'];
    } else {
        post.uri = result['result'];
    }

    getUserID(email, function(err, response) {
        if (response > 0) {
            post.userID = response;

            let countQuery = 'SELECT COUNT(*) AS count FROM tblquotelink where `userID` = ' + post.userID;
            pool.query(countQuery, function (error, results, fields) {
                if (error) throw error;

                if (results[0].count === 0) {
                    pool.query('INSERT INTO tblquotelink SET ?', post, function (error, results, fields) {
                        if (error) {
                            console.log("got an error inserting: " + error);
                        }

                        return callback(true);
                    });

                } else {
                    let update_post = [
                        post.hasError,
                        post.errorMessage,
                        post.uri,
                        post.dateGenerated,
                        post.userID
                    ];

                    let qry = mysql.format('UPDATE tblquotelink SET hasError = ?, errorMessage = ?, uri = ?, dateGenerated = ? WHERE userID = ?', update_post);
                    pool.query(qry, function (error, results, fields) {
                        if (error) {
                            console.log("got an error updating5: " + error);
                        }
                        return callback(true);
                    });
                }
            });
        }
    });
}

function insertQuestions(email, result, callback) {
    getUserID(email, function(err, response) {
        if (response > 0) {
            for (let obj of result) {
                let post = {
                    ID: 0,
                    userID: 0,
                    qParent: null,
                    qChild: null,
                    qData: null
                };
                post.userID = response;
                post.qParent = obj['parent'];
                post.qChild = obj['child'];
                post.qData = JSON.stringify(obj['data']);

                let countQuery = 'SELECT COUNT(*) AS count FROM tblquestions where `userID` = ' + post.userID + ' and qParent = "' + post.qParent + '" and qChild = "' + post.qChild + '"';
                pool.query(countQuery, function (error, results, fields) {
                    if (error) throw error;

                    if (results[0].count === 0) {
                        pool.query('INSERT INTO tblquestions SET ?', post, function (error, results, fields) {
                            if (error) {
                                console.log("got an error inserting: " + error);
                            }
                        });
                    } else {
                        let update_post = [
                            post.qData,
                            post.userID,
                            post.qParent,
                            post.qChild
                        ];

                        let qry = mysql.format('UPDATE tblquestions SET qData = ? WHERE userID = ? and qParent = ? and qChild = ?', update_post);
                        pool.query(qry, function (error, results, fields) {
                            if (error) {
                                console.log("got an error updating1: " + error);
                            }
                        });
                    }
                });
            }
        }
    });
    return callback(true);
}

function updateNextSwitch(email, data, callback) {

    getUserID(email, function(err, response) {
        if (response > 0) {
            let update_post = [
                data['result'],
                response
            ];

            let qry = mysql.format('UPDATE tblswitch SET nextSwitchDate = ? WHERE ID = ?', update_post);
            pool.query(qry, function (error, results, fields) {
                if (error) {
                    console.log("got an error updating2: " + error);
                }
                return callback(true);
            });
        }
    });
}

function updateNextSwitchID(id) {

    let update_post = [
        id
    ];

    let qry = mysql.format('UPDATE tblswitch SET nextSwitchDate = NULL WHERE ID = ?', update_post);
    pool.query(qry, function (error, results, fields) {
        if (error) {
            console.log("got an error updating3: " + error);
        }
    });
}

function insertSwitchHistory(id, data) {
    let post = {
        ID: 0,
        userID: id,
        switchFailed: 0,
        failedReason: null,
        newSupplier: null,
        newTariff: null,
        entryDate: new Date(),
        newCost: null,
        newSaving: null,
        EHL: null,
        template:null
    };
    try {
        if (data['error'] === true) {
            post.switchFailed = 1;
            post.failedReason = data['message'];
            updateNextSwitchID(id);
        } else {
            if ("newCost" in data['result']) {
                post.newCost = data['result']['newCost'];
            }
            if ("newSaving" in data['result']) {
                post.newSaving = data['result']['newSaving'];
            }
            if ("template" in data['result']) {
                post.template = data['result']['template'];
            }
            if ("newSupplier" in data['result']) {
                post.newSupplier = data['result']['newSupplier'];
            }
            if ("newTariff" in data['result']) {
                post.newTariff = data['result']['newTariff'];
            }
            if ("EHL" in data['result']) {
                post.EHL = data['result']['EHL'];
            }
        }
    } catch (e) {
        console.log(e);
    }


    pool.query('INSERT INTO tblswitchhistory SET ?', post, function (error, results, fields) {
        if (error) {
            console.log("got an error inserting: " + error);
            return false;
        }
    });

    return true;
}


function insertPhone(uid, phone, callback) {
    try {

        var post = {
            ID: 0,
            userID: uid,
            contactType: "phone",
            contactData: phone
        };
        pool.query('INSERT INTO tblcustomercontact SET ?', post, function (error, results, fields) {
            if (error) {
                return callback(false);
            }
            return callback(true);
        });

    } catch(error) {
        console.error(error);
        return callback(false);
    }
}


function insertRef(ref, energy, pay, customer, phone, callback) {
    try {

        let query = 'SELECT COUNT(*) AS count FROM tblref where `phoneNumber` = "' + phone + '"';
        pool.query(query, function (error, results, fields) {
            if (error) return callback("You have already entered");
            if (results[0].count === 0) {
                var post = {
                    ID: 0,
                    refID: ref,
                    energySupplier: energy,
                    payless: pay,
                    customerName: customer,
                    phoneNumber: phone,
                    contacted: 0,
                    entryDate: new Date(),
                    entryMessage: null
                };
                pool.query('INSERT INTO tblref SET ?', post, function (error, results, fields) {
                    if (error) {
                        if (error.code === "ER_DUP_ENTRY") {
                            return callback("You have already entered");
                        } else {
                            return "Unspecified database error";
                        }
                    }
                    return callback("Thanks for entering!");
                });
            } else {
                return callback("You have already entered");
            }
        });
    } catch(error) {
        console.error(error);
        return callback("error: " + error);
    }
}



module.exports = {
    duplicateEmail,
    insertEmail,
    getUserID,
    insertSupplierInfo,
    insertQuoteLink,
    insertQuestions,
    updateNextSwitch,
    getEmail,
    insertSwitchHistory,
    insertRef,
    insertPhone
};