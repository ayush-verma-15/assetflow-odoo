import { useState, useEffect } from 'react';
import {
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  WrenchScrewdriverIcon,
  UserIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import { maintenanceAPI, assetAPI, employeeAPI } from '../api';
import toast from 'react-hot-toast';

const Maintenance = () => {
  const [maintenances, setMaintenances] = useState([]);
  const [assets, setAssets] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({});
  const [showModal, setShowModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    assetId: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    assetId: '',
    issue: '',
    priority: 'MEDIUM',
    notes: '',
    photo: ''
  });

  // Approve form
  const [approveData, setApproveData] = useState({
    technicianId: '',
    notes: ''
  });

  useEffect(() => {
    fetchMaintenances();
    fetchAssets();
    fetchTechnicians();
    fetchStats();
  }, [filters]);

  const fetchMaintenances = async () => {
    setLoading(true);
    try {
      const res = await maintenanceAPI.getAll(filters);
      setMaintenances(res.data.maintenances || []);
    } catch (error) {
      console.error('Error fetching maintenances:', error);
    }
    setLoading(false);
  };

  const fetchAssets = async () => {
    try {
      const res = await assetAPI.getAll({ limit: 1000 });
      setAssets(res.data.assets || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    }
  };

  const fetchTechnicians = async () => {
    try {
      const res = await employeeAPI.getAll({ role: 'EMPLOYEE', status: 'ACTIVE' });
      setTechnicians(res.data || []);
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await maintenanceAPI.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await maintenanceAPI.raise(formData);
      toast.success('Maintenance request raised');
      fetchMaintenances();
      fetchStats();
      setShowModal(false);
      setFormData({ assetId: '', issue: '', priority: 'MEDIUM', notes: '', photo: '' });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleApprove = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await maintenanceAPI.approve(selectedMaintenance.id, approveData);
      toast.success('Maintenance approved');
      fetchMaintenances();
      fetchStats();
      setShowApproveModal(false);
      setSelectedMaintenance(null);
      setApproveData({ technicianId: '', notes: '' });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleReject = async (id) => {
    if (!window.confirm('Are you sure you want to reject this request?')) return;
    const notes = prompt('Reason for rejection:');
    if (notes === null) return;
    try {
      await maintenanceAPI.reject(id, { notes });
      toast.success('Request rejected');
      fetchMaintenances();
      fetchStats();
    } catch (error) {
      console.error(error);
    }
  };

  const handleStart = async (id) => {
    const notes = prompt('Enter start notes:');
    if (notes === null) return;
    try {
      await maintenanceAPI.start(id, { notes });
      toast.success('Maintenance started');
      fetchMaintenances();
    } catch (error) {
      console.error(error);
    }
  };

  const handleResolve = async (id) => {
    const notes = prompt('Resolution notes:');
    if (notes === null) return;
    const condition = prompt('Asset condition (Excellent/Good/Fair/Poor):');
    if (!condition) return;
    try {
      await maintenanceAPI.resolve(id, { notes, condition });
      toast.success('Maintenance resolved');
      fetchMaintenances();
      fetchStats();
    } catch (error) {
      console.error(error);
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      LOW: 'bg-gray-100 text-gray-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      HIGH: 'bg-orange-100 text-orange-800',
      URGENT: 'bg-red-100 text-red-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const priorityOptions = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  const statusOptions = ['PENDING', 'APPROVED', 'REJECTED', 'IN_PROGRESS', 'RESOLVED'];

  return (
    <Layout title="Maintenance Management">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{stats.total || 0}</p>
        </div>
        <div className="card bg-yellow-50">
          <p className="text-sm text-yellow-700">Pending</p>
          <p className="text-2xl font-bold text-yellow-800">{stats.pending || 0}</p>
        </div>
        <div className="card bg-red-50">
          <p className="text-sm text-red-700">Urgent</p>
          <p className="text-2xl font-bold text-red-800">{stats.urgentPending || 0}</p>
        </div>
        <div className="card bg-green-50">
          <p className="text-sm text-green-700">Resolved</p>
          <p className="text-2xl font-bold text-green-800">{stats.resolved || 0}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold">Maintenance Requests</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Raise Request
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            className="input-field w-auto"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            className="input-field w-auto"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          >
            <option value="">All Priority</option>
            {priorityOptions.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
          <select
            className="input-field w-auto"
            value={filters.assetId}
            onChange={(e) => setFilters({ ...filters, assetId: e.target.value })}
          >
            <option value="">All Assets</option>
            {assets.map(asset => (
              <option key={asset.id} value={asset.id}>{asset.name} ({asset.tag})</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ status: '', priority: '', assetId: '' })}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : maintenances.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No maintenance requests found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {maintenances.map((maint) => (
            <div key={maint.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-wrap justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <WrenchScrewdriverIcon className="h-5 w-5 text-gray-400" />
                    <span className="font-semibold">{maint.asset?.name}</span>
                    <span className="text-sm text-gray-500">({maint.asset?.tag})</span>
                    <StatusBadge status={maint.status} />
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(maint.priority)}`}>
                      {maint.priority}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p className="mb-1">{maint.issue}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <span>Raised by: {maint.raisedByUser?.name}</span>
                      <span>Date: {new Date(maint.createdAt).toLocaleDateString()}</span>
                      {maint.technicianUser && (
                        <span>Technician: {maint.technicianUser.name}</span>
                      )}
                      {maint.resolvedAt && (
                        <span>Resolved: {new Date(maint.resolvedAt).toLocaleDateString()}</span>
                      )}
                    </div>
                    {maint.notes && (
                      <p className="text-xs text-gray-400 mt-1">Note: {maint.notes}</p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                  {maint.status === 'PENDING' && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedMaintenance(maint);
                          setShowApproveModal(true);
                        }}
                        className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                      >
                        <CheckIcon className="h-4 w-4 inline mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(maint.id)}
                        className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                      >
                        <XMarkIcon className="h-4 w-4 inline mr-1" />
                        Reject
                      </button>
                    </>
                  )}
                  {maint.status === 'APPROVED' && (
                    <button
                      onClick={() => handleStart(maint.id)}
                      className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                    >
                      Start Work
                    </button>
                  )}
                  {maint.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleResolve(maint.id)}
                      className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Raise Request Modal */}
      {showModal && (
        <Modal
          title="Raise Maintenance Request"
          onClose={() => {
            setShowModal(false);
            setFormData({ assetId: '', issue: '', priority: 'MEDIUM', notes: '', photo: '' });
          }}
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label className="label">Select Asset *</label>
                <select
                  className="input-field"
                  value={formData.assetId}
                  onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
                  required
                >
                  <option value="">Select Asset</option>
                  {assets.map(asset => (
                    <option key={asset.id} value={asset.id}>
                      {asset.name} ({asset.tag}) - {asset.location}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Issue Description *</label>
                <textarea
                  className="input-field"
                  rows="3"
                  value={formData.issue}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  placeholder="Describe the issue..."
                  required
                />
              </div>
              <div>
                <label className="label">Priority *</label>
                <select
                  className="input-field"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  required
                >
                  {priorityOptions.map(priority => (
                    <option key={priority} value={priority}>{priority}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
              <div>
                <label className="label">Photo URL</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.photo}
                  onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Raising...' : 'Raise Request'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedMaintenance && (
        <Modal
          title="Approve Maintenance"
          onClose={() => {
            setShowApproveModal(false);
            setSelectedMaintenance(null);
            setApproveData({ technicianId: '', notes: '' });
          }}
        >
          <form onSubmit={handleApprove}>
            <div className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="text-sm font-medium">{selectedMaintenance.asset?.name}</p>
                <p className="text-sm text-gray-600">{selectedMaintenance.issue}</p>
                <p className="text-xs text-gray-500">Priority: {selectedMaintenance.priority}</p>
              </div>
              <div>
                <label className="label">Assign Technician</label>
                <select
                  className="input-field"
                  value={approveData.technicianId}
                  onChange={(e) => setApproveData({ ...approveData, technicianId: e.target.value })}
                >
                  <option value="">Select Technician</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name} - {tech.department?.name || 'No Department'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Approval Notes</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={approveData.notes}
                  onChange={(e) => setApproveData({ ...approveData, notes: e.target.value })}
                  placeholder="Additional notes..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Approving...' : 'Approve'}
              </button>
              <button type="button" onClick={() => setShowApproveModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}
    </Layout>
  );
};

// ============ Modal Component ============
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

export default Maintenance;
