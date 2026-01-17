const errorHandler = (err, req, res, next) => {
    console.error('Error:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Handle Prisma unique constraint error
    if (err.code === 'P2002') {
        return res.status(400).json({
            message: `A record with this ${err.meta?.target || 'value'} already exists.`,
            error: 'Conflict'
        });
    }

    // Handle Prisma record not found error
    if (err.code === 'P2025') {
        return res.status(404).json({
            message: err.meta?.cause || 'Record not found.',
            error: 'Not Found'
        });
    }

    res.status(statusCode).json({
        message,
        error: err.name || 'Error',
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
};

module.exports = errorHandler;
