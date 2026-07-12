const express = require('express');
const router = express.Router();
const { auth, roleCheck } = require('../middleware/auth');
const {
  createBooking,
  getBookings,
  getBooking,
  updateBooking,
  cancelBooking,
  completeBooking,
  getAvailableSlots,
  getMyBookings,
  updateBookingStatuses
} = require('../controllers/booking.controller');

// Public routes
router.get('/my-bookings', auth, getMyBookings);
router.get('/available-slots/:resourceId', auth, getAvailableSlots);
router.get('/', auth, getBookings);
router.get('/:id', auth, getBooking);

// Create booking (any authenticated user)
router.post('/', auth, createBooking);

// Update/Cancel booking (booker or admin)
router.put('/:id', auth, updateBooking);
router.put('/:id/cancel', auth, cancelBooking);
router.put('/:id/complete', auth, roleCheck('ADMIN', 'ASSET_MANAGER'), completeBooking);

// Admin only - update statuses (can be called via cron)
router.post('/update-statuses', auth, roleCheck('ADMIN'), updateBookingStatuses);

module.exports = router;
