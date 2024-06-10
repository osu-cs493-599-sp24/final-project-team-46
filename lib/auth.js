const jwt = require("jsonwebtoken");
const secretKey = process.env.KEY || "GoodThingNoneOfThisDataIsActuallyRealOrSecureInAnyWay!1:)";

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

// TODO - Middleware for common authentication requirements of multiple endpoints