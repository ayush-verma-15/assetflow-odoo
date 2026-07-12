const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment
} = require('../controllers/department.controller');

router.post('/', auth, roleCheck('ADMIN'), createDepartment);
router.get('/', auth, getDepartments);
router.get('/:id', auth, getDepartment);
router.put('/:id', auth, roleCheck('ADMIN'), updateDepartment);
router.delete('/:id', auth, roleCheck('ADMIN'), deleteDepartment);

module.exports = router;
