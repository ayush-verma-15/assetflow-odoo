const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const {
  getEmployees,
  getEmployee,
  promoteEmployee,
  updateEmployeeStatus,
  deleteEmployee
} = require('../controllers/employee.controller');

router.get('/', auth, getEmployees);
router.get('/:id', auth, getEmployee);
router.put('/:id/promote', auth, roleCheck('ADMIN'), promoteEmployee);
router.put('/:id/status', auth, roleCheck('ADMIN'), updateEmployeeStatus);
router.delete('/:id', auth, roleCheck('ADMIN'), deleteEmployee);

module.exports = router;
