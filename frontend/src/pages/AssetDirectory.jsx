import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  MagnifyingGlassIcon,
  PencilIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import { assetAPI, categoryAPI, departmentAPI } from '../api';
import toast from 'react-hot-toast';

const AssetDirectory = () => {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ total: 0, page: 1, pages: 1 });
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);

  const [filters, setFilters] = useState({
    search: '',
    categoryId: '',
    status: '',
    departmentId: '',
    location: ''
  });

  const [formData, setFormData] = useState({
    name: '',
    serialNo: '',
    categoryId: '',
    acquisitionDate: '',
    cost: '',
    condition: 'Good',
    location: '',
    photo: '',
    documents: '',
    isBookable: false,
    departmentId: ''
  });

  useEffect(() => {
    fetchAssets();
    fetchCategories();
    fetchDepartments();
  }, [filters, pagination.page]);

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: 20,
        ...filters
      };
      const res = await assetAPI.getAll(params);
      setAssets(res.data.assets || []);
      setPagination(res.data.pagination || { total: 0, page: 1, pages: 1 });
    } catch (error) {
      console.error('Error fetching assets:', error);
      toast.error('Failed to load assets');
    }
    setLoading(false);
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getAll();
      setDepartments(res.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPagination((prev) => ({ ...prev, page: 1 }));
    fetchAssets();
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value });
    setPagination({ ...pagination, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.pages) return;
    setPagination({ ...pagination, page: newPage });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingAsset) {
        await assetAPI.update(editingAsset.id, formData);
        toast.success('Asset updated successfully');
      } else {
        await assetAPI.create(formData);
        toast.success('Asset registered successfully');
      }
      fetchAssets();
      setShowModal(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error('Failed to save asset');
    }
    setLoading(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;
    try {
      await assetAPI.delete(id);
      toast.success('Asset deleted successfully');
      fetchAssets();
    } catch (error) {
      console.error(error);
      toast.error('Failed to delete asset');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await assetAPI.updateStatus(id, { status });
      toast.success(`Asset status updated to ${status}`);
      fetchAssets();
    } catch (error) {
      console.error(error);
      toast.error('Failed to update status');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      serialNo: '',
      categoryId: '',
      acquisitionDate: '',
      cost: '',
      condition: 'Good',
      location: '',
      photo: '',
      documents: '',
      isBookable: false,
      departmentId: ''
    });
    setEditingAsset(null);
  };

  const openModal = (asset = null) => {
    if (asset) {
      setEditingAsset(asset);
      setFormData({
        name: asset.name,
        serialNo: asset.serialNo || '',
        categoryId: asset.categoryId || '',
        acquisitionDate: asset.acquisitionDate?.split('T')[0] || '',
        cost: asset.cost || '',
        condition: asset.condition || 'Good',
        location: asset.location || '',
        photo: asset.photo || '',
        documents: asset.documents || '',
        isBookable: asset.isBookable || false,
        departmentId: asset.departmentId || ''
      });
    } else {
      resetForm();
    }
    setShowModal(true);
  };

  const viewAssetDetails = async (id) => {
    try {
      const res = await assetAPI.getOne(id);
      setSelectedAsset(res.data);
      setShowDetails(true);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load asset details');
    }
  };

  const statusOptions = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
  const conditionOptions = ['Excellent', 'Good', 'Fair', 'Poor', 'Damaged'];

  return (
    <Layout title="Asset Directory">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h2 className="text-lg font-semibold">Manage Assets</h2>
        <button onClick={() => openModal()} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Register Asset
        </button>
      </div>

      <div className="card mb-6">
        <form onSubmit={handleSearch} className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                className="input-field pl-10"
                placeholder="Search by name, tag, or serial..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
              />
            </div>
          </div>
          <select
            className="input-field w-auto"
            value={filters.categoryId}
            onChange={(e) => handleFilterChange('categoryId', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
          <select
            className="input-field w-auto"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Status</option>
            {statusOptions.map(status => (
              <option key={status} value={status}>{status.replace('_', ' ')}</option>
            ))}
          </select>
          <select
            className="input-field w-auto"
            value={filters.departmentId}
            onChange={(e) => handleFilterChange('departmentId', e.target.value)}
          >
            <option value="">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <button type="submit" className="btn-primary">
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ search: '', categoryId: '', status: '', departmentId: '', location: '' });
              setPagination({ ...pagination, page: 1 });
            }}
            className="btn-secondary"
          >
            Clear
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="card hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-800 truncate">{asset.name}</h3>
                <p className="text-sm text-gray-500">{asset.tag}</p>
              </div>
              <StatusBadge status={asset.status} />
            </div>
            
            <div className="mt-3 space-y-1 text-sm">
              <p className="text-gray-600">
                <span className="font-medium">Category:</span> {asset.category?.name}
              </p>
              <p className="text-gray-600">
                <span className="font-medium">Location:</span> {asset.location}
              </p>
              {asset.currentHolder && (
                <p className="text-gray-600">
                  <span className="font-medium">Holder:</span> {asset.currentHolder.name}
                </p>
              )}
              {asset.isBookable && (
                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                  Bookable
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t">
              <button
                onClick={() => viewAssetDetails(asset.id)}
                className="flex-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded hover:bg-blue-100 flex items-center justify-center"
              >
                <EyeIcon className="h-4 w-4 mr-1" />
                View
              </button>
              <button
                onClick={() => openModal(asset)}
                className="flex-1 px-3 py-1.5 text-sm bg-primary-50 text-primary-600 rounded hover:bg-primary-100 flex items-center justify-center"
              >
                <PencilIcon className="h-4 w-4 mr-1" />
                Edit
              </button>
              <button
                onClick={() => handleDelete(asset.id)}
                className="flex-1 px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center justify-center"
              >
                <TrashIcon className="h-4 w-4 mr-1" />
                Delete
              </button>
            </div>

            <div className="mt-2">
              <select
                className="w-full text-sm border border-gray-200 rounded px-2 py-1"
                value={asset.status}
                onChange={(e) => handleStatusChange(asset.id, e.target.value)}
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>

      {assets.length === 0 && !loading && (
        <div className="text-center py-12">
          <p className="text-gray-500">No assets found. Register your first asset!</p>
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      )}

      {pagination.pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {pagination.page} of {pagination.pages}
          </span>
          <button
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === pagination.pages}
            className="px-4 py-2 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {showModal && (
        <Modal
          title={editingAsset ? 'Edit Asset' : 'Register Asset'}
          onClose={() => setShowModal(false)}
        >
          <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Asset Name *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label">Serial Number</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.serialNo}
                  onChange={(e) => setFormData({ ...formData, serialNo: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Category *</label>
                <select
                  className="input-field"
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Department</label>
                <select
                  className="input-field"
                  value={formData.departmentId}
                  onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Acquisition Date</label>
                <input
                  type="date"
                  className="input-field"
                  value={formData.acquisitionDate}
                  onChange={(e) => setFormData({ ...formData, acquisitionDate: e.target.value })}
                />
              </div>
              <div>
                <label className="label">Cost</label>
                <input
                  type="number"
                  className="input-field"
                  value={formData.cost}
                  onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                  step="0.01"
                />
              </div>
              <div>
                <label className="label">Condition *</label>
                <select
                  className="input-field"
                  value={formData.condition}
                  onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                  required
                >
                  {conditionOptions.map(cond => (
                    <option key={cond} value={cond}>{cond}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Location *</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Photo URL</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.photo}
                  onChange={(e) => setFormData({ ...formData, photo: e.target.value })}
                  placeholder="https://example.com/photo.jpg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="label">Documents URL</label>
                <input
                  type="text"
                  className="input-field"
                  value={formData.documents}
                  onChange={(e) => setFormData({ ...formData, documents: e.target.value })}
                  placeholder="https://example.com/document.pdf"
                />
              </div>
              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.isBookable}
                    onChange={(e) => setFormData({ ...formData, isBookable: e.target.checked })}
                    className="h-4 w-4 text-primary-600 rounded"
                  />
                  <span className="text-sm font-medium text-gray-700">This asset is bookable/shared resource</span>
                </label>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button type="submit" className="btn-primary flex-1" disabled={loading}>
                {loading ? 'Saving...' : (editingAsset ? 'Update' : 'Register')}
              </button>
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showDetails && selectedAsset && (
        <Modal
          title={`Asset Details - ${selectedAsset.tag}`}
          onClose={() => { setShowDetails(false); setSelectedAsset(null); }}
        >
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-semibold">{selectedAsset.name}</h3>
                  <p className="text-sm text-gray-500">{selectedAsset.tag}</p>
                </div>
                <StatusBadge status={selectedAsset.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-medium">{selectedAsset.category?.name}</p>
                </div>
                <div>
                  <p className="text-gray-500">Serial Number</p>
                  <p className="font-medium">{selectedAsset.serialNo || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium">{selectedAsset.location}</p>
                </div>
                <div>
                  <p className="text-gray-500">Condition</p>
                  <p className="font-medium">{selectedAsset.condition}</p>
                </div>
                <div>
                  <p className="text-gray-500">Department</p>
                  <p className="font-medium">{selectedAsset.department?.name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Bookable</p>
                  <p className="font-medium">{selectedAsset.isBookable ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Acquisition Date</p>
                  <p className="font-medium">{selectedAsset.acquisitionDate ? new Date(selectedAsset.acquisitionDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Cost</p>
                  <p className="font-medium">{selectedAsset.cost ? `$${selectedAsset.cost}` : 'N/A'}</p>
                </div>
              </div>

              {selectedAsset.currentHolder && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-2">Current Holder</h4>
                  <p>{selectedAsset.currentHolder.name} ({selectedAsset.currentHolder.email})</p>
                </div>
              )}

              {selectedAsset.allocations && selectedAsset.allocations.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-2">Allocation History</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedAsset.allocations.map((alloc) => (
                      <div key={alloc.id} className="text-sm bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span>{alloc.employee?.name}</span>
                          <StatusBadge status={alloc.status} />
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(alloc.createdAt).toLocaleDateString()}
                          {alloc.expectedReturn && ` → Expected: ${new Date(alloc.expectedReturn).toLocaleDateString()}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedAsset.maintenances && selectedAsset.maintenances.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-sm mb-2">Maintenance History</h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {selectedAsset.maintenances.map((maint) => (
                      <div key={maint.id} className="text-sm bg-gray-50 p-2 rounded">
                        <div className="flex justify-between">
                          <span>{maint.issue}</span>
                          <StatusBadge status={maint.status} />
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(maint.createdAt).toLocaleDateString()}
                          {maint.priority && ` | Priority: ${maint.priority}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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

export default AssetDirectory;
