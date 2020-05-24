

function generateNextDate(template, callback) {

    if (!("future-supplier") in template) return callback(buildResponse(true, "no future-supplier in data", null));

    let supplier = template['future-supplier'];

    let rtnDate = new Date();

    if ("durationWithCurrentSupplierInMonths" in supplier) {
        rtnDate = new Date(rtnDate.setMonth(rtnDate.getMonth()+supplier["durationWithCurrentSupplierInMonths"]));
        rtnDate.setDate(rtnDate.getDate() - 49);
    } else {
        rtnDate = new Date(rtnDate.setMonth(rtnDate.getMonth()+3));
    }

    return callback(buildResponse(false, null, rtnDate));
}




function buildResponse(error, message, result) {
    let response = {};
    response['error'] = error;
    response['message'] = message;
    response['result'] = result;
    return response;
}

module.exports = {
    generateNextDate
};