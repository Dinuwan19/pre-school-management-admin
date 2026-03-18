const { z } = require('zod');

const studentSchema = z.object({
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    gender: z.enum(['MALE', 'FEMALE']),
    classroomId: z.coerce.number().int().positive(),
    parentId: z.coerce.number().int().positive(),
    emergencyContact: z.string().min(10, "Phone number too short")
}).partial();

const parentSchema = z.object({
    fullName: z.string().min(3),
    email: z.string().email().optional(),
    phone: z.string().min(10),
    relationship: z.enum(['FATHER', 'MOTHER', 'GUARDIAN'])
}).partial();

const userSchema = z.object({
    fullName: z.string().min(3),
    role: z.enum(['SUPER_ADMIN', 'ADMIN', 'TEACHER', 'STAFF', 'CASHIER']),
    phone: z.string().min(10)
}).partial();

const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        const errorMsg = (error.errors && error.errors[0]?.message) || (error.issues && error.issues[0]?.message) || error.message || 'Validation failed';
        return res.status(400).json({ status: 'error', message: errorMsg });
    }
};

module.exports = {
    validate,
    studentSchema,
    parentSchema,
    userSchema
};
