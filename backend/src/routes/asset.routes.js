const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const {
  registerAsset,
  getAssets,
  getAsset,
  getAssetByTag,
  updateAsset,
  updateAssetStatus,
  getAssetHistory,
  deleteAsset
} = require('../controllers/asset.controller');

// Public routes (authenticated users)
router.get('/', auth, getAssets);
router.get('/history/:id', auth, getAssetHistory);
router.get('/tag/:tag', auth, getAssetByTag);
router.get('/:id', auth, getAsset);

// Asset Manager & Admin routes
router.post('/', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), registerAsset);
router.put('/:id', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), updateAsset);
router.put('/:id/status', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), updateAssetStatus);
router.delete('/:id', auth, roleCheck('ADMIN'), deleteAsset);

module.exports = router;
