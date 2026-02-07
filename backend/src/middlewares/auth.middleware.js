const jwt = require('jsonwebtoken');

exports.authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            console.error(`[Auth] JWT Verification Failed: ${err.message}. Token: ${token.substring(0, 10)}...`);
            return res.status(403).json({ message: `Token Error: ${err.message}` });
        }
        console.log(`[Auth] Token verified for: ${user.username} (${user.role})`);
        req.user = user;
        next();
    });
};

exports.authorizeRole = (roles) => {
    return (req, res, next) => {
        const userRole = req.user?.role?.toUpperCase().trim();
        const allowedRoles = roles.map(r => r.toUpperCase().trim());

        console.log(`[Auth] Checking access: User Role: "${userRole}", Allowed Roles: [${allowedRoles}]`);
        console.log(`[Auth] Full User Object:`, JSON.stringify(req.user));

        if (!userRole || !allowedRoles.includes(userRole)) {
            console.log(`[Auth] Access Denied for ${req.user?.username || 'Unknown'}. Role "${userRole}" not in [${allowedRoles}]`);
            return res.status(403).json({ message: 'Access denied' });
        }
        next();
    };
};
