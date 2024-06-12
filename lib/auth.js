const jwt = require("jsonwebtoken");
const secretKey = process.env.KEY || "GoodThingNoneOfThisDataIsActuallyRealOrSecureInAnyWay!1:)";

function noAccess(res) {
    res.status(403).json({error: "You do not have access to this resource"});
}

// Uses 403 as these endpoints don't actually support 500 and it's still logically an authentication error.
function internalError(res) {
    res.status(403).json({
        error: "Error authenticating request."
    });
}

function generateAuthToken(userID, role) {
    const payload = {
        sub: userID,
        role: role
    };
    return jwt.sign(payload, secretKey, { expiresIn: "24h" });
}
module.exports.generateAuthToken = generateAuthToken;

function authenticate(req) {
    const authHeader = req.get("Authorization") || "";
    const authHeaderParts = authHeader.split(" ");

    const token = authHeaderParts[0] === "Bearer" ? authHeaderParts[1] : null;
    const payload = jwt.verify(token, secretKey);
    return payload;
}
module.exports.authenticate = authenticate;

function requireAuthentication(req, res, next) {
    try {
        const payload = authenticate(req);
        req.user = payload.sub;
        req.role = payload.role;
        next();
    } catch (e) {
        res.status(401).json({
            error: "Invalid authentication token."
        });
    }
}
module.exports.requireAuthentication = requireAuthentication;

function requireAdmin(req, res, next) {
    try {
        if(req.role == "admin") next();
        else noAccess(res);
    } catch (e) {
        internalError(res);
    }
}
module.exports.requireAdmin = requireAdmin;

function requireUserMatchReq(getter) {
    return function(req, res, next) {
        try {
            if(req.role == "admin" || req.user == getter(req)) next();
            else noAccess(res);
        } catch (e) {
            internalError(res);
        }
    }
}
module.exports.requireUserMatchReq = requireUserMatchReq;

function requireUserMatchRecord(pkGetter, idGetter, recordType, includes = []) {
    return async function(req, res, next) {
        try {
            if(req.role == "admin") return next();

            const permissionCheck = await recordType.findByPk(pkGetter(req), {include: includes});
            if(!permissionCheck) {
                res.status(404).json({
                    error: "Unable to locate resource for permission check"
                });
                return;
            }

            if(idGetter(permissionCheck.dataValues) == req.user) next();
            else noAccess(res);
        } catch (e) {
            internalError(res);
        }
    }
}
module.exports.requireUserMatchRecord = requireUserMatchRecord;