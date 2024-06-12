function validateBody(params) {
    return function(req, res, next) {
        if(!req.body) return res.status(400).send({error: "Missing required body."});

        for(const param of params) {
            if(!(param in req.body)) return res.status(400).send({error: `Missing required body parameter "${param}".`});
        }

        next();
    }
}
module.exports.validateBody = validateBody;

function bodyExists(req, res, next) {
    if(!req.body) return res.status(400).send({error: "Body not included."});

    next();
}
module.exports.bodyExists = bodyExists;