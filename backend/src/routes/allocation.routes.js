const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const {
  allocateAsset,
  requestTransfer,
  approveTransfer,
  returnAsset,
  getAllocations,
  getOverdueAllocations,
  getAssetAllocationHistory,
  getEmployeeAllocations
} = require('../controllers/allocation.controller');

// Public routes (authenticated users)
router.get('/', auth, getAllocations);
router.get('/overdue', auth, getOverdueAllocations);
router.get('/asset/:assetId', auth, getAssetAllocationHistory);
router.get('/employee/:employeeId', auth, getEmployeeAllocations);

// Asset Manager & Admin routes
router.post('/allocate', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), allocateAsset);
router.post('/transfer', auth, requestTransfer);
router.put('/transfer/:allocationId', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), approveTransfer);
router.put('/return/:assetId', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), returnAsset);

module.exports = router;
