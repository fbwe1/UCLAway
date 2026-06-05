const jwt = require("jsonwebtoken")

// generate json web token w/ secret key
exports.generateToken = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {expiresIn: "1h" });
};
// verify if jwt valid
exports.verifyToken = (token) => {
    return jwt.verify(token, process.env.JWT_SECRET);
};