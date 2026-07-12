import { useState, useEffect } from 'react';
import {
  PlusIcon,
  ArrowPathIcon,
  ArrowLeftOnRectangleIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  UserIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import { allocationAPI, assetAPI, employeeAPI } from '../api';
import toast from 'react-hot-toast';

const Allocation = () => {
  const [allocations, setAllocations] = useState([]);
  const [assets, setAssets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedAllocation, setSelectedAllocation] = useState(null);
  const [showOverdue, setShowOverdue] = useState(false);
  const [overdueList, setOverdueList] = useState([]);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    assetId: '',
    employeeId: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    assetId: '',
    employeeId: '',
    expectedReturn: '',
    notes: ''
  });

  // Transfer form
  const [transferData, setTransferData] = useState({
    assetId: '',
    targetEmployeeId: '',
    reason: ''
  });

  useEffect(() => {
    fetchAllocations();
    fetchAssets();
    fetchEmployees();
    fetchOverdue();
  }, [filters]);

  const fetchAllocations = async () => {
    setLoading(true);
    try {
      const res = await allocationAPI.getAll(filters);
      setAllocations(res.data || []);
    } catch (error) {
      console.error('Error fetching allocations:', error);
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

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll({ status: 'ACTIVE' });
      setEmployees(res.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  const fetchOverdue = async () => {
    try {
      const res = await allocationAPI.getOverdue();
      setOverdueList(res.data || []);
    } catch (error) {
      console.error('Error fetching overdue:', error);
    }
  };

  const handleAllocate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await allocationAPI.allocate(formData);
      toast.success('Asset allocated successfully');
      fetchAllocations();
      setShowModal(false);
      setFormData({ assetId: '', employeeId: '', expectedReturn: '', notes: '' });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await allocationAPI.requestTransfer(transferData);
      toast.success('Transfer request submitted');
      fetchAllocations();
      setShowTransferModal(false);
      setTransferData({ assetId: '', targetEmployeeId: '', reason: '' });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleApproveTransfer = async (allocationId, action) => {
    try {
      await allocationAPI.approveTransfer(allocationId, { action });
      toast.success(`Transfer ${action.toLowerCase()}`);
      fetchAllocations();
    } catch (error) {
      console.error(error);
    }
  };

  const handleReturn = async (assetId) => {
    if (!window.confirm('Mark this asset as returned?')) return;
    const condition = prompt('Enter asset condition (Excellent/Good/Fair/Poor):');
    if (!condition) return;
    try {
      await allocationAPI.returnAsset(assetId, { condition, notes: 'Returned via system' });
      toast.success('Asset returned successfully');
      fetchAllocations();
      fetchOverdue();
    } catch (error) {
      console.error(error);
    }
  };

  const getAssetStatusColor = (status) => {
    const colors = {
      REQUESTED: 'bg-yellow-100 text-yellow-800',
      APPROVED: 'bg-green-100 text-green-800',
      REJECTED: 'bg-red-100 text-red-800',
      RETURNED: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const statusOptions = ['REQUESTED', 'APPROVED', 'REJECTED', 'RETURNED'];

  return (
    <Layout title="Asset Allocation">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold">Manage Allocations</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowOverdue(!showOverdue)}
            className={`btn-${showOverdue ? 'secondary' : 'primary'} flex items-center`}
          >
            <ClockIcon className="h-5 w-5 mr-2" />
            Overdue ({overdueList.length})
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
            <PlusIcon className="h-5 w-5 mr-2" />
            Allocate Asset
          </button>
        </div>
      </div>

      {/* Overdue Alert */}
      {showOverdue && overdueList.length > 0 && (
        <div className="card bg-red-50 border border-red-200 mb-6">
          <h3 className="font-semibold text-red-800 mb-3">⚠️ Overdue Returns</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-red-700">
                  <th className="pb-2">Asset</th>
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Expected Return</th>
                  <th className="pb-2">Days Overdue</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {overdueList.map((allocation) => {
                  const daysOverdue = Math.ceil(
                    (new Date() - new Date(allocation.expectedReturn)) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <tr key={allocation.id} className="border-t border-red-100">
                      <td className="py-2">{allocation.asset?.name}</td>
                      <td className="py-2">{allocation.employee?.name}</td>
                      <td className="py-2">{new Date(allocation.expectedReturn).toLocaleDateString()}</td>
                      <td className="py-2 text-red-600 font-medium">{daysOverdue} days</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleReturn(allocation.assetId)}
                          className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Mark Returned
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Filters */}
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
            value={filters.assetId}
            onChange={(e) => setFilters({ ...filters, assetId: e.target.value })}
          >
            <option value="">All Assets</option>
            {assets.map((asset) => (
              <option key={asset.id} value={asset.id}>{asset.name} ({asset.tag})</option>
            ))}
          </select>
          <select
            className="input-field w-auto"
            value={filters.employeeId}
            onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>{emp.name}</option>
            ))}
          </select>
          <button
            onClick={() => setFilters({ status: '', assetId: '', employeeId: '' })}
            className="btn-secondary"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Allocations List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : allocations.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No allocations found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {allocations.map((allocation) => (
            <div key={allocation.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-wrap justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <CubeIcon className="h-5 w-5 text-gray-400" />
                    <span className="font-semibold">{allocation.asset?.name}</span>
                    <span className="text-sm text-gray-500">({allocation.asset?.tag})</span>
                    <StatusBadge status={allocation.status} />
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center">
                      <UserIcon className="h-4 w-4 mr-1" />
                      {allocation.employee?.name}
                    </div>
                    {allocation.expectedReturn && (
                      <div>
                        <span className="font-medium">Expected Return:</span>{' '}
                        {new Date(allocation.expectedReturn).toLocaleDateString()}
                      </div>
                    )}
                    {allocation.returnedAt && (
                      <div>
                        <span className="font-medium">Returned:</span>{' '}
                        {new Date(allocation.returnedAt).toLocaleDateString()}
                      </div>
                    )}
                    {allocation.notes && (
                      <div className="text-gray-500 text-xs">{allocation.notes}</div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-2 md:mt-0">
                  {allocation.status === 'APPROVED' && (
                    <button
                      onClick={() => handleReturn(allocation.assetId)}
                      className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 flex items-center"
                    >
                      <ArrowLeftOnRectangleIcon className="h-4 w-4 mr-1" />
                      Return
                    </button>
                  )}
                  {allocation.status === 'REQUESTED' && (
                    <>
                      <button
                        onClick={() => handleApproveTransfer(allocation.id, 'APPROVED')}
                        className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100 flex items-center"
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleApproveTransfer(allocation.id, 'REJECTED')}
                        className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100 flex items-center"
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Allocate Modal */}
      {showModal && (
        <Modal
          title="Allocate Asset"
          onClose={() => {
            setShowModal(false);
            setFormData({ assetId: '', employeeId: '', expectedReturn: '', notes: '' });
          }}
        >
          <form onSubmit={handleAllocate}>
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
                  {assets
                    .filter((a) => a.status === 'AVAILABLE' || a.status === 'RESERVED')
                    .map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} ({asset.tag}) - {asset.location}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label">Select Employee *</label>
                <select
                  className="input-field"
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department?.name || 'No Department'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Expected Return Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.expectedReturn}
                  onChange={(e) => setFormData({ ...formData, expectedReturn: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Optional notes..."
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Allocating...' : 'Allocate'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <Modal
          title="Request Transfer"
          onClose={() => {
            setShowTransferModal(false);
            setTransferData({ assetId: '', targetEmployeeId: '', reason: '' });
          }}
        >
          <form onSubmit={handleTransfer}>
            <div className="space-y-4">
              <div>
                <label className="label">Select Asset to Transfer *</label>
                <select
                  className="input-field"
                  value={transferData.assetId}
                  onChange={(e) => setTransferData({ ...transferData, assetId: e.target.value })}
                  required
                >
                  <option value="">Select Asset</option>
                  {allocations
                    .filter((a) => a.status === 'APPROVED')
                    .map((a) => (
                      <option key={a.assetId} value={a.assetId}>
                        {a.asset?.name} ({a.asset?.tag}) - Currently with {a.employee?.name}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="label">Transfer To Employee *</label>
                <select
                  className="input-field"
                  value={transferData.targetEmployeeId}
                  onChange={(e) => setTransferData({ ...transferData, targetEmployeeId: e.target.value })}
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department?.name || 'No Department'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Reason for Transfer</label>
                <textarea
                  className="input-field"
                  rows="2"
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  placeholder="Why is this transfer needed?"
                />
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Submitting...' : 'Request Transfer'}
              </button>
              <button type="button" onClick={() => setShowTransferModal(false)} className="btn-secondary flex-1">
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

export default Allocation;
