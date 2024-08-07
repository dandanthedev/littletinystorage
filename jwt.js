const jwt = require('jsonwebtoken');


async function generateSignedToken(bucket, file, type, expiry) {

    try {
        const token = jwt.sign({
            bucket: bucket,
            file: file,
            type: type
        }, process.env.SECRET, {
            expiresIn: expiry ?? "60s"
        });
        return token;
    } catch (e) {
        console.warn(e)
        return "Error generating token, please check the expiry time";
    }
}

async function verifyToken(token, bucket, file, type) {
    try {
        const toCheck = [bucket, file, type];
        const decoded = jwt.verify(token, process.env.SECRET)
        console.log(decoded);
        if (!decoded) return {
            authorized: false,
        }
        toCheck.forEach(check => {
            if (check !== decoded[check] && check !== null) return {
                authorized: false,
            }
        });
        return {
            authorized: true,
            timeLeft: decoded.exp ? Math.round((decoded.exp - Date.now() / 1000)) : null,
            decoded
        }
    } catch (e) {
        return {
            authorized: false,
        }
    }
}

module.exports = {
    generateSignedToken,
    verifyToken
}