const express = require('express');
const router = express.Router();
<<<<<<< HEAD
const { auth, roleCheck } = require('../middleware/auth');
const {
  createCategory,
  getCategories,
  getCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/category.controller');

router.post('/', auth, roleCheck('ADMIN'), createCategory);
router.get('/', auth, getCategories);
router.get('/:id', auth, getCategory);
router.put('/:id', auth, roleCheck('ADMIN'), updateCategory);
router.delete('/:id', auth, roleCheck('ADMIN'), deleteCategory);
=======

router.get('/health', (req, res) => {
  res.json({ message: 'Category routes ready' });
});
>>>>>>> a6c4c14 (Add department and user APIs)

module.exports = router;
