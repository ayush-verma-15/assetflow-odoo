const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ message: 'Allocation routes ready' });
});

module.exports = router;
