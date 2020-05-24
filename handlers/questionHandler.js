function parseQuestions(template, callback) {
    try {
        let result = [];
        for (let group of template['data-template'].groups) {
            for (let item of group.items) {
                if (item.data !== "") {
                    let obj = {};
                    obj['parent'] = group.name;
                    obj['child'] = item.name;
                    obj['data'] = item.data;
                    result.push(obj);
                }
            }
        }

        return callback(buildResponse(false, null, result));

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
    parseQuestions
};