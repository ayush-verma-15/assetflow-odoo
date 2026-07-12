const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const { promoteToDepartmentHead } = require('../controllers/user.controller');
const { getAllUsers } = require('../controllers/user.list.controller');

router.get('/', auth, getAllUsers);
router.put('/:userId/promote', auth, roleCheck('ADMIN'), promoteToDepartmentHead);

module.exports = router;
