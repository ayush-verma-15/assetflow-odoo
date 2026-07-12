import { useState, useEffect } from 'react';
import {
  CalendarIcon,
  PlusIcon,
  CheckIcon,
  ClockIcon,
  UserIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import { bookingAPI, assetAPI } from '../api';
import toast from 'react-hot-toast';

const Booking = () => {
  const [bookings, setBookings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showSlots, setShowSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [filters, setFilters] = useState({
    status: '',
    resourceId: ''
  });

  const [formData, setFormData] = useState({
    resourceId: '',
    startTime: '',
    endTime: ''
  });

  useEffect(() => {
    fetchBookings();
    fetchMyBookings();
    fetchResources();
  }, [filters]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await bookingAPI.getAll(filters);
      setBookings(res.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error);
      toast.error('Failed to fetch bookings');
    }
    setLoading(false);
  };

  const fetchMyBookings = async () => {
    try {
      const res = await bookingAPI.getMyBookings();
      setMyBookings(res.data || []);
    } catch (error) {
      console.error('Error fetching my bookings:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const res = await assetAPI.getAll({ isBookable: true, limit: 1000 });
      setResources(res.data.assets || []);
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const fetchAvailableSlots = async (resourceId, date) => {
    try {
      const res = await bookingAPI.getAvailableSlots(resourceId, date);
      setAvailableSlots(res.data.slots || []);
      setShowSlots(true);
    } catch (error) {
      console.error('Error fetching slots:', error);
      toast.error('Failed to fetch available slots');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await bookingAPI.create(formData);
      toast.success('Booking created successfully');
      fetchBookings();
      fetchMyBookings();
      setShowModal(false);
      setShowSlots(false);
      setFormData({ resourceId: '', startTime: '', endTime: '' });
    } catch (error) {
      console.error(error);
      toast.error('Failed to create booking');
    }
    setLoading(false);
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await bookingAPI.cancel(id);
      toast.success('Booking cancelled');
      fetchBookings();
      fetchMyBookings();
    } catch (error) {
      console.error(error);
      toast.error('Failed to cancel booking');
    }
  };

  const handleComplete = async (id) => {
    try {
      await bookingAPI.complete(id);
      toast.success('Booking completed');
      fetchBookings();
      fetchMyBookings();
    } catch (error) {
      console.error(error);
      toast.error('Failed to complete booking');
    }
  };

  const selectSlot = (slot) => {
    if (!slot.available) return;
    setFormData({
      ...formData,
      startTime: slot.start,
      endTime: slot.end
    });
    setShowSlots(false);
    setShowModal(true);
  };

  const statusOptions = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

  const groupBookingsByDate = (bookings) => {
    const groups = {};
    bookings.forEach((booking) => {
      const date = new Date(booking.startTime).toLocaleDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(booking);
    });
    return groups;
  };

  const groupedBookings = groupBookingsByDate(bookings);

  return (
    <Layout title="Resource Booking">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold">Book Resources</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          New Booking
        </button>
      </div>

      {myBookings.length > 0 && (
        <div className="card mb-6">
          <h3 className="font-semibold text-lg mb-3">🔔 My Upcoming Bookings</h3>
          <div className="space-y-2">
            {myBookings.slice(0, 3).map((booking) => (
              <div key={booking.id} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                <div>
                  <p className="font-medium">{booking.resource?.name}</p>
                  <p className="text-sm text-gray-500">
                    {new Date(booking.startTime).toLocaleString()} - {new Date(booking.endTime).toLocaleTimeString()}
                  </p>
                </div>
                <StatusBadge status={booking.status} />
              </div>
            ))}
            {myBookings.length > 3 && (
              <p className="text-sm text-gray-500">+{myBookings.length - 3} more bookings</p>
            )}
          </div>
        </div>
      )}

      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            className="input-field w-auto"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            className="input-field w-auto"
            value={filters.resourceId}
            onChange={(e) => setFilters({ ...filters, resourceId: e.target.value })}
          >
            <option value="">All Resources</option>
            {resources.map((res) => (
              <option key={res.id} value={res.id}>{res.name} ({res.tag})</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ status: '', resourceId: '' })}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No bookings found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedBookings).map(([date, dayBookings]) => (
            <div key={date} className="card">
              <h3 className="font-semibold text-gray-700 mb-3">{date}</h3>
              <div className="space-y-3">
                {dayBookings.map((booking) => (
                  <div key={booking.id} className="flex flex-wrap justify-between items-start border-b pb-3 last:border-0">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <CubeIcon className="h-5 w-5 text-gray-400" />
                        <span className="font-medium">{booking.resource?.name}</span>
                        <span className="text-sm text-gray-500">({booking.resource?.tag})</span>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div className="mt-1 flex flex-wrap gap-4 text-sm text-gray-600">
                        <span className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {new Date(booking.startTime).toLocaleTimeString()} - {new Date(booking.endTime).toLocaleTimeString()}
                        </span>
                        <span className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-1" />
                          {booking.bookedBy?.name}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-2 md:mt-0">
                      {booking.status === 'UPCOMING' && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      )}
                      {booking.status === 'ONGOING' && (
                        <button
                          onClick={() => handleComplete(booking.id)}
                          className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                        >
                          <CheckIcon className="h-4 w-4 inline mr-1" />
                          Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal
          title="Create Booking"
          onClose={() => {
            setShowModal(false);
            setFormData({ resourceId: '', startTime: '', endTime: '' });
            setShowSlots(false);
          }}
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="label">Select Resource *</label>
                <select
                  className="input-field"
                  value={formData.resourceId}
                  onChange={(e) => {
                    setFormData({ ...formData, resourceId: e.target.value });
                    if (e.target.value) {
                      fetchAvailableSlots(e.target.value, selectedDate);
                    }
                  }}
                  required
                >
                  <option value="">Select Resource</option>
                  {resources.map((res) => (
                    <option key={res.id} value={res.id}>
                      {res.name} ({res.tag}) - {res.location}
                    </option>
                  ))}
                </select>
              </div>

              {formData.resourceId && (
                <div>
                  <label className="label">Select Date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      fetchAvailableSlots(formData.resourceId, e.target.value);
                    }}
                  />
                </div>
              )}

              {showSlots && (
                <div>
                  <label className="label">Available Time Slots</label>
                  <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                    {availableSlots.map((slot, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => selectSlot(slot)}
                        disabled={!slot.available}
                        className={`p-2 text-sm rounded border ${
                          slot.available
                            ? 'border-green-300 hover:bg-green-50 cursor-pointer'
                            : 'border-red-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {new Date(slot.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {slot.available ? ' ✅' : ' ❌'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click on available slot to select</p>
                </div>
              )}

              {!showSlots && formData.resourceId && (
                <button
                  type="button"
                  onClick={() => fetchAvailableSlots(formData.resourceId, selectedDate)}
                  className="text-primary-600 text-sm hover:underline"
                >
                  Show available slots
                </button>
              )}

              {formData.startTime && formData.endTime && (
                <div className="bg-green-50 p-3 rounded">
                  <p className="text-sm text-green-800">
                    Selected: {new Date(formData.startTime).toLocaleString()} - {new Date(formData.endTime).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>
            <div className="flex space-x-3 mt-6">
              <button
                type="submit"
                className="btn-primary flex-1"
                disabled={loading || !formData.startTime || !formData.endTime}
              >
                {loading ? 'Creating...' : 'Book Now'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowModal(false);
                  setFormData({ resourceId: '', startTime: '', endTime: '' });
                  setShowSlots(false);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
};

const Modal = ({ title, children, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">{title}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Booking;
