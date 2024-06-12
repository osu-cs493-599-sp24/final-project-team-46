const { token } = require("morgan");
const redis = require("redis");

const redisHost = process.env.REDIS_HOST || "localhost";
const redisPort = process.env.REDIS_PORT || 6379;

const rateLimitWindowMilliseconds = 60000;

const redisClient = redis.createClient({
    url: `redis://${redisHost}:${redisPort}`
});
module.exports.redisClient = redisClient;

async function rateLimit(key, maxReqs, res, next) {
    try {
        let tokenBucket = await redisClient.hGetAll(key);

        console.log(tokenBucket);

        tokenBucket = {
            tokens: parseFloat(tokenBucket.tokens) || maxReqs,
            last: parseInt(tokenBucket.last) || Date.now()
        };
    
        const timestamp = Date.now();
        const elapsedMilliseconds = timestamp - tokenBucket.last;
        const refreshRate = maxReqs / rateLimitWindowMilliseconds;
        tokenBucket.tokens += elapsedMilliseconds * refreshRate;
        tokenBucket.tokens = Math.min(maxReqs, tokenBucket.tokens);
        tokenBucket.last = timestamp;

        let valid = tokenBucket.tokens >= 1;

        if(valid) tokenBucket.tokens -= 1;

        await redisClient.hSet(key, [
            ["tokens", tokenBucket.tokens],
            ["last", tokenBucket.last]
        ]);

        if(valid) next();
        else res.status(429).json({error: "Too many requests per minute."});
    } catch (e) {
        console.log(e);
        next();
    }
}

async function rateLimitAuth(req, res, next) {
    await rateLimit(`U-${req.user}`, 30, res, next);
}
module.exports.rateLimitAuth = rateLimitAuth;

async function rateLimitNoAuth(req, res, next) {
    await rateLimit(`I-${req.ip}`, 10, res, next);
}
module.exports.rateLimitNoAuth = rateLimitNoAuth;