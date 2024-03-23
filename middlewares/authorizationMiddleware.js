import jwt from "jsonwebtoken";
// import Customer from "../models/customerSchema.js"

export const authenticate = async (req, res, next) => {
    // get token from headers
    const authToken = req.headers.authorization;    
    if (!authToken || !authToken.startsWith("Bearer")) {
        return res.status(401).json({ status: "fail", message: "Token is not valid" });
    }
    try {
        const token = authToken.split(" ")[1];
        const decoded = await jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded._id;
        req.role = decoded.role;
        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({ success: false, message: "Token is Expired" });
        } else if (error instanceof jwt.JsonWebTokenError) {
            return res.status(401).json({ success: false, message: "Invalid token" });
        }
        // Handle other errors
        console.error("Error during token verification:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

