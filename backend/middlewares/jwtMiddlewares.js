const { verifyToken }  = require('../services/jwtService')
module.exports = (req, res, next) => {
    // JWT header
    const authHeader = req.headers["authorization"];
    if (!authHeader)
        return res.status(401).json({message: "No token provided"})
    // extract token
    const token = authHeader.split(" ")[1];
    if (!token) 
        return res.status(401).json({message: "Malformed/invalid token"})
}