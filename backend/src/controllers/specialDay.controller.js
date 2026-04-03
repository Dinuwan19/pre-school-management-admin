const prisma = require('../config/prisma');
const { logAction } = require('../services/audit.service');

exports.createSpecialDay = async (req, res, next) => {
    try {
        const { date, name, description } = req.body;
        const specialDay = await prisma.special_day.create({
            data: {
                date: new Date(date),
                name,
                description
            },
        });

        await logAction(req.user.id, `CREATE_SPECIAL_DAY: Added special day ${name} on ${date}`);

        res.status(201).json(specialDay);
    } catch (error) {
        if (error.code === 'P2002') {
            return res.status(400).json({ message: 'A special day is already recorded for this date.' });
        }
        next(error);
    }
};

exports.getAllSpecialDays = async (req, res, next) => {
    try {
        const specialDays = await prisma.special_day.findMany({
            orderBy: { date: 'asc' },
        });
        res.json(specialDays);
    } catch (error) {
        next(error);
    }
};

exports.deleteSpecialDay = async (req, res, next) => {
    try {
        const { id } = req.params;
        const specialDay = await prisma.special_day.delete({
            where: { id: parseInt(id) },
        });

        await logAction(req.user.id, `DELETE_SPECIAL_DAY: Removed special day ${specialDay.name}`);

        res.json({ message: 'Special day removed successfully' });
    } catch (error) {
        next(error);
    }
};
