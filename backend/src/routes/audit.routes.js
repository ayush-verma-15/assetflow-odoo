const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const {
  createAuditCycle,
  getAuditCycles,
  getAuditCycle,
  updateAuditCycle,
  verifyAsset,
  generateDiscrepancyReport,
  closeAuditCycle,
  getAuditStats,
} = require('../controllers/audit.controller');

router.post('/', auth, roleCheck('ADMIN'), createAuditCycle);
router.put('/:id', auth, roleCheck('ADMIN'), updateAuditCycle);
router.put('/:id/close', auth, roleCheck('ADMIN'), closeAuditCycle);

router.get('/', auth, getAuditCycles);
router.get('/stats', auth, getAuditStats);
router.get('/:id', auth, getAuditCycle);
router.get('/:id/report', auth, generateDiscrepancyReport);

router.put('/verify/:auditItemId', auth, verifyAsset);

module.exports = router;
