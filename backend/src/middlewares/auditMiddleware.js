const auditService = require('../services/audit.service');

/**
 * Middleware to log route access.
 * Usage: router.post('/create', auditMiddleware('CREATE_RESOURCE'), controller.create);
 * Note: For detailed logs (like created IDs), prefer calling auditService directly in controller.
 */
const auditMiddleware = (actionType) => {
    return (req, res, next) => {
        // We hook into response finish to log only completed requests or just log attempt
        // For simplicity and reliability, we log the attempt immediately, 
        // or we can wait for 'finish'. Let's wait for finish to capture status.

        res.on('finish', () => {
            // Only log successful modifications or specific status codes if needed
            if (res.statusCode >= 200 && res.statusCode < 400) {
                const userId = req.user ? req.user.id : null;
                const details = {
                    method: req.method,
                    url: req.originalUrl,
                    params: req.params,
                    query: req.query,
                    // body: req.body // Be careful with logging sensitive body data!
                };

                auditService.logAction(userId, actionType, details);
            }
        });

        next();
    };
};

module.exports = auditMiddleware;
