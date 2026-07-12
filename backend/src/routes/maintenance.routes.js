const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const {
  raiseRequest,
  getMaintenances,
  getMaintenance,
  approveMaintenance,
  rejectMaintenance,
  startMaintenance,
  resolveMaintenance,
  getMaintenanceStats,
  getMaintenanceByAsset
} = require('../controllers/maintenance.controller');

// Public routes (authenticated users)
router.get('/', auth, getMaintenances);
router.get('/stats', auth, getMaintenanceStats);
router.get('/asset/:assetId', auth, getMaintenanceByAsset);
router.get('/:id', auth, getMaintenance);

// Raise request (any authenticated user)
router.post('/', auth, raiseRequest);

// Asset Manager & Admin routes
router.put('/:id/approve', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), approveMaintenance);
router.put('/:id/reject', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), rejectMaintenance);

// Technician routes
router.put('/:id/start', auth, startMaintenance);
router.put('/:id/resolve', auth, resolveMaintenance);

module.exports = router;
