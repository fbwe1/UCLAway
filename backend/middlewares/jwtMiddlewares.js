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
    // verify -> attach decoded user data to req. obj. -> move on
    try {
        const decoded = verifyToken(token);
        req.user = decoded;
        next();
    } catch{ 
        // if invalid or expired token
        res.status(401).json({ message: "Invalid/expired token"})
    }
}