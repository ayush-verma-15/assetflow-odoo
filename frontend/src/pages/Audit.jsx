import { useState, useEffect } from 'react';
import {
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  ClipboardDocumentCheckIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import { auditAPI, departmentAPI, employeeAPI } from '../api';
import toast from 'react-hot-toast';

const Audit = () => {
  const [auditCycles, setAuditCycles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [stats, setStats] = useState({});

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    departmentId: ''
  });

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    departmentId: '',
    startDate: '',
    endDate: '',
    auditorIds: []
  });

  useEffect(() => {
    fetchAuditCycles();
    fetchDepartments();
    fetchEmployees();
    fetchStats();
  }, [filters]);

  const fetchAuditCycles = async () => {
    setLoading(true);
    try {
      const res = await auditAPI.getAll(filters);
      setAuditCycles(res.data.auditCycles || []);
    } catch (error) {
      console.error('Error fetching audit cycles:', error);
    }
    setLoading(false);
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getAll();
      setDepartments(res.data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
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

  const fetchStats = async () => {
    try {
      const res = await auditAPI.getStats();
      setStats(res.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await auditAPI.create(formData);
      toast.success('Audit cycle created successfully');
      fetchAuditCycles();
      fetchStats();
      setShowModal(false);
      setFormData({ name: '', departmentId: '', startDate: '', endDate: '', auditorIds: [] });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleVerify = async (itemId, status) => {
    const notes = prompt(`Enter notes for marking as ${status}:`);
    if (notes === null) return;
    try {
      await auditAPI.verify(itemId, { status, notes });
      toast.success(`Asset marked as ${status}`);
      fetchAuditCycles();
      if (selectedCycle) {
        const res = await auditAPI.getOne(selectedCycle.id);
        setSelectedCycle(res.data);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleCloseCycle = async (id) => {
    if (!window.confirm('Are you sure you want to close this audit cycle? This action cannot be undone.')) return;
    try {
      await auditAPI.close(id);
      toast.success('Audit cycle closed');
      fetchAuditCycles();
      fetchStats();
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewReport = async (id) => {
    try {
      const res = await auditAPI.getReport(id);
      setReportData(res.data);
      setShowReportModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleViewDetails = async (id) => {
    try {
      const res = await auditAPI.getOne(id);
      setSelectedCycle(res.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  const statusOptions = ['OPEN', 'IN_PROGRESS', 'CLOSED'];

  return (
    <Layout title="Asset Audit">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total Cycles</p>
          <p className="text-2xl font-bold">{stats.totalCycles || 0}</p>
        </div>
        <div className="card bg-green-50">
          <p className="text-sm text-green-700">Open</p>
          <p className="text-2xl font-bold text-green-800">{stats.openCycles || 0}</p>
        </div>
        <div className="card bg-gray-50">
          <p className="text-sm text-gray-700">Closed</p>
          <p className="text-2xl font-bold text-gray-800">{stats.closedCycles || 0}</p>
        </div>
        <div className="card bg-red-50">
          <p className="text-sm text-red-700">Discrepancies</p>
          <p className="text-2xl font-bold text-red-800">{stats.missingItems || 0}</p>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold">Audit Cycles</h2>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Audit
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
            {statusOptions.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            className="input-field w-auto"
            value={filters.departmentId}
            onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <button onClick={() => setFilters({ status: '', departmentId: '' })} className="btn-secondary">
            Clear
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : auditCycles.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No audit cycles found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {auditCycles.map((cycle) => (
            <div key={cycle.id} className="card hover:shadow-md transition-shadow">
              <div className="flex flex-wrap justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <ClipboardDocumentCheckIcon className="h-5 w-5 text-gray-400" />
                    <span className="font-semibold">{cycle.name}</span>
                    <StatusBadge status={cycle.status} />
                  </div>
                  <div className="text-sm text-gray-600">
                    <div className="flex flex-wrap gap-4">
                      {cycle.department && <span>Department: {cycle.department.name}</span>}
                      <span>
                        <CalendarIcon className="h-4 w-4 inline mr-1" />
                        {new Date(cycle.startDate).toLocaleDateString()} - {new Date(cycle.endDate).toLocaleDateString()}
                      </span>
                      <span>Auditors: {cycle.auditors?.length || 0}</span>
                      <span>Items: {cycle.items?.length || 0}</span>
                      {cycle.items && (
                        <span className="text-red-600">
                          Discrepancies: {cycle.items.filter((i) => i.status === 'MISSING' || i.status === 'DAMAGED').length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
                  <button
                    onClick={() => handleViewDetails(cycle.id)}
                    className="px-3 py-1.5 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
                  >
                    <EyeIcon className="h-4 w-4 inline mr-1" />
                    View
                  </button>
                  <button
                    onClick={() => handleViewReport(cycle.id)}
                    className="px-3 py-1.5 text-sm bg-primary-50 text-primary-700 rounded hover:bg-primary-100"
                  >
                    <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                    Report
                  </button>
                  {cycle.status !== 'CLOSED' && (
                    <button
                      onClick={() => handleCloseCycle(cycle.id)}
                      className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
                    >
                      Close Cycle
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Audit Modal */}
      {showModal && (
        <Modal
          title="Create Audit Cycle"
          onClose={() => {
            setShowModal(false);
            setFormData({ name: '', departmentId: '', startDate: '', endDate: '', auditorIds: [] });
          }}
        >
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="label">Audit Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Q4 2024 Asset Audit"
                  required
                />
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  className="input-field"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                >
                  <option value="">All Departments</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="label">End Date *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="label">Select Auditors</label>
                <select
                  className="input-field"
                  multiple
                  value={formData.auditorIds}
                  onChange={(e) => {
                    const options = e.target.options;
                    const values = [];
                    for (let i = 0; i < options.length; i++) {
                      if (options[i].selected) {
                        values.push(options[i].value);
                      }
                    }
                    setFormData({ ...formData, auditorIds: values });
                  }}
                  size={4}
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} - {emp.department?.name || 'No Department'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple</p>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Creating...' : 'Create Audit'}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Audit Details Modal */}
      {showDetailModal && selectedCycle && (
        <Modal
          title={`Audit: ${selectedCycle.name}`}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedCycle(null);
          }}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <StatusBadge status={selectedCycle.status} />
                  <p className="text-sm text-gray-500 mt-1">{selectedCycle.department?.name || 'All Departments'}</p>
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(selectedCycle.startDate).toLocaleDateString()} - {new Date(selectedCycle.endDate).toLocaleDateString()}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Auditors</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedCycle.auditors?.map((a) => (
                    <span key={a.id} className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {a.name}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Assets to Verify</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedCycle.items?.map((item) => (
                    <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                      <div>
                        <p className="text-sm font-medium">{item.asset?.name}</p>
                        <p className="text-xs text-gray-500">{item.asset?.tag}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={item.status} />
                        {selectedCycle.status !== 'CLOSED' && (
                          <>
                            <button
                              onClick={() => handleVerify(item.id, 'VERIFIED')}
                              className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              ✓
                            </button>
                            <button
                              onClick={() => handleVerify(item.id, 'MISSING')}
                              className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                            >
                              ✗
                            </button>
                            <button
                              onClick={() => handleVerify(item.id, 'DAMAGED')}
                              className="px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                            >
                              ⚠
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedCycle.status === 'CLOSED' && (
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-600">✅ Audit cycle closed</p>
                  <button
                    onClick={() => handleViewReport(selectedCycle.id)}
                    className="mt-2 text-primary-600 text-sm hover:underline"
                  >
                    View Full Report →
                  </button>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Report Modal */}
      {showReportModal && reportData && (
        <Modal
          title={`Discrepancy Report - ${reportData.auditCycle?.name}`}
          onClose={() => {
            setShowReportModal(false);
            setReportData(null);
          }}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-green-50 p-3 rounded text-center">
                  <p className="text-sm text-green-700">Verified</p>
                  <p className="text-xl font-bold text-green-800">{reportData.summary?.verifiedCount || 0}</p>
                </div>
                <div className="bg-red-50 p-3 rounded text-center">
                  <p className="text-sm text-red-700">Missing</p>
                  <p className="text-xl font-bold text-red-800">{reportData.discrepancies?.missing || 0}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded text-center">
                  <p className="text-sm text-orange-700">Damaged</p>
                  <p className="text-xl font-bold text-orange-800">{reportData.discrepancies?.damaged || 0}</p>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-sm mb-2">Discrepancy Items ({reportData.discrepancies?.items?.length || 0})</h4>
                <div className="space-y-2">
                  {reportData.discrepancies?.items?.map((item, index) => (
                    <div key={index} className="bg-gray-50 p-2 rounded text-sm">
                      <div className="flex justify-between">
                        <span className="font-medium">{item.asset?.name}</span>
                        <StatusBadge status={item.status} />
                      </div>
                      <p className="text-xs text-gray-500">Tag: {item.asset?.tag} | Holder: {item.asset?.currentHolder?.name || 'None'}</p>
                      {item.notes && <p className="text-xs text-gray-400 mt-1">Note: {item.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded text-xs text-gray-500">
                <p>Generated: {new Date(reportData.generatedAt).toLocaleString()}</p>
                <p>Auditors: {reportData.auditors?.map((a) => a.name).join(', ') || 'None'}</p>
              </div>
            </div>
          </div>
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
        <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
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

export default Audit;
