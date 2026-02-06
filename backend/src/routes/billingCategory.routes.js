const express = require('express');
const router = express.Router();
const billingCategoryController = require('../controllers/billingCategory.controller');
const { authenticateToken, authorizeRole } = require('../middlewares/auth.middleware');

router.use(authenticateToken);

// Management: SUPER_ADMIN and ADMIN
router.post('/', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingCategoryController.createCategory);
router.delete('/:id', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingCategoryController.deleteCategory);
router.get('/:id/stats', authorizeRole(['SUPER_ADMIN', 'ADMIN']), billingCategoryController.getCategoryStats);

// View: SUPER_ADMIN, ADMIN, and PARENT (for their scoped categories)
router.get('/', authorizeRole(['SUPER_ADMIN', 'ADMIN', 'PARENT']), billingCategoryController.getAllCategories);

module.exports = router;
