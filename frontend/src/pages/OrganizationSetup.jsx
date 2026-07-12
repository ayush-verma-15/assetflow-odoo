import { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserPlusIcon,
  UserGroupIcon,
  TagIcon,
  UsersIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout/Layout';
import StatusBadge from '../components/common/StatusBadge';
import { departmentAPI, categoryAPI, employeeAPI } from '../api';
import toast from 'react-hot-toast';

const OrganizationSetup = () => {
  const [activeTab, setActiveTab] = useState('departments');
  const [loading, setLoading] = useState(false);
  
  // Department state
  const [departments, setDepartments] = useState([]);
  const [deptModal, setDeptModal] = useState({ open: false, data: null });
  const [deptForm, setDeptForm] = useState({ name: '', parentId: '', headId: '' });
  
  // Category state
  const [categories, setCategories] = useState([]);
  const [catModal, setCatModal] = useState({ open: false, data: null });
  const [catForm, setCatForm] = useState({ name: '', customFields: '' });
  
  // Employee state
  const [employees, setEmployees] = useState([]);
  const [employeeFilters, setEmployeeFilters] = useState({ departmentId: '', role: '', status: '' });
  const [promoteModal, setPromoteModal] = useState({ open: false, employee: null });

  // Fetch data
  useEffect(() => {
    fetchDepartments();
    fetchCategories();
    fetchEmployees();
  }, []);

  const fetchDepartments = async () => {
    try {
      const res = await departmentAPI.getAll();
      setDepartments(res.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await categoryAPI.getAll();
      setCategories(res.data);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await employeeAPI.getAll(employeeFilters);
      setEmployees(res.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    }
  };

  // Department CRUD
  const handleDeptSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (deptModal.data) {
        await departmentAPI.update(deptModal.data.id, deptForm);
        toast.success('Department updated successfully');
      } else {
        await departmentAPI.create(deptForm);
        toast.success('Department created successfully');
      }
      fetchDepartments();
      setDeptModal({ open: false, data: null });
      setDeptForm({ name: '', parentId: '', headId: '' });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleDeptDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentAPI.delete(id);
      toast.success('Department deleted successfully');
      fetchDepartments();
    } catch (error) {
      console.error(error);
    }
  };

  // Category CRUD
  const handleCatSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = {
        ...catForm,
        customFields: catForm.customFields ? JSON.parse(catForm.customFields) : {}
      };
      if (catModal.data) {
        await categoryAPI.update(catModal.data.id, data);
        toast.success('Category updated successfully');
      } else {
        await categoryAPI.create(data);
        toast.success('Category created successfully');
      }
      fetchCategories();
      setCatModal({ open: false, data: null });
      setCatForm({ name: '', customFields: '' });
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleCatDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await categoryAPI.delete(id);
      toast.success('Category deleted successfully');
      fetchCategories();
    } catch (error) {
      console.error(error);
    }
  };

  // Employee Management
  const handlePromote = async (employeeId, role, departmentId) => {
    try {
      await employeeAPI.promote(employeeId, { role, departmentId });
      toast.success(`Employee promoted to ${role}`);
      fetchEmployees();
      setPromoteModal({ open: false, employee: null });
    } catch (error) {
      console.error(error);
    }
  };

  const handleStatusToggle = async (employeeId, currentStatus) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await employeeAPI.updateStatus(employeeId, { status: newStatus });
      toast.success(`Employee ${newStatus.toLowerCase()}`);
      fetchEmployees();
    } catch (error) {
      console.error(error);
    }
  };

  // Tabs
  const tabs = [
    { id: 'departments', label: 'Departments', icon: UserGroupIcon },
    { id: 'categories', label: 'Categories', icon: TagIcon },
    { id: 'employees', label: 'Employees', icon: UsersIcon },
  ];

  return (
    <Layout title="Organization Setup">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                flex items-center px-1 py-4 border-b-2 font-medium text-sm
                ${activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'departments' && (
          <DepartmentTab
            departments={departments}
            onAdd={() => setDeptModal({ open: true, data: null })}
            onEdit={(dept) => {
              setDeptForm(dept);
              setDeptModal({ open: true, data: dept });
            }}
            onDelete={handleDeptDelete}
            deptForm={deptForm}
            setDeptForm={setDeptForm}
            deptModal={deptModal}
            setDeptModal={setDeptModal}
            onSubmit={handleDeptSubmit}
            loading={loading}
          />
        )}

        {activeTab === 'categories' && (
          <CategoryTab
            categories={categories}
            onAdd={() => setCatModal({ open: true, data: null })}
            onEdit={(cat) => {
              setCatForm({
                name: cat.name,
                customFields: JSON.stringify(cat.customFields, null, 2)
              });
              setCatModal({ open: true, data: cat });
            }}
            onDelete={handleCatDelete}
            catForm={catForm}
            setCatForm={setCatForm}
            catModal={catModal}
            setCatModal={setCatModal}
            onSubmit={handleCatSubmit}
            loading={loading}
          />
        )}

        {activeTab === 'employees' && (
          <EmployeeTab
            employees={employees}
            filters={employeeFilters}
            setFilters={setEmployeeFilters}
            onPromote={(emp) => setPromoteModal({ open: true, employee: emp })}
            onStatusToggle={handleStatusToggle}
            promoteModal={promoteModal}
            setPromoteModal={setPromoteModal}
            onPromoteSubmit={handlePromote}
            departments={departments}
          />
        )}
      </div>
    </Layout>
  );
};

// ============ Department Tab ============
const DepartmentTab = ({ 
  departments, onAdd, onEdit, onDelete,
  deptForm, setDeptForm, deptModal, setDeptModal, onSubmit, loading
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Departments</h2>
        <button onClick={onAdd} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Department
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept) => (
          <div key={dept.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-800">{dept.name}</h3>
                {dept.head && (
                  <p className="text-sm text-gray-500">Head: {dept.head.name}</p>
                )}
                {dept.parent && (
                  <p className="text-sm text-gray-500">Parent: {dept.parent.name}</p>
                )}
                <StatusBadge status={dept.status} />
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(dept)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onDelete(dept.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {deptModal.open && (
        <Modal
          title={deptModal.data ? 'Edit Department' : 'Add Department'}
          onClose={() => setDeptModal({ open: false, data: null })}
        >
          <form onSubmit={onSubmit}>
            <div className="mb-4">
              <label className="label">Department Name</label>
              <input
                type="text"
                className="input-field"
                value={deptForm.name}
                onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                required
              />
            </div>
            <div className="mb-4">
              <label className="label">Parent Department (Optional)</label>
              <select
                className="input-field"
                value={deptForm.parentId}
                onChange={(e) => setDeptForm({ ...deptForm, parentId: e.target.value })}
              >
                <option value="">None</option>
                {departments
                  .filter(d => d.id !== deptModal.data?.id)
                  .map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="label">Department Head (Optional)</label>
              <input
                type="text"
                className="input-field"
                placeholder="User ID"
                value={deptForm.headId}
                onChange={(e) => setDeptForm({ ...deptForm, headId: e.target.value })}
              />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ============ Category Tab ============
const CategoryTab = ({
  categories, onAdd, onEdit, onDelete,
  catForm, setCatForm, catModal, setCatModal, onSubmit, loading
}) => {
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Asset Categories</h2>
        <button onClick={onAdd} className="btn-primary flex items-center">
          <PlusIcon className="h-5 w-5 mr-2" />
          Add Category
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="card">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-gray-800">{cat.name}</h3>
                <p className="text-sm text-gray-500">
                  Assets: {cat.assets?.length || 0}
                </p>
                {cat.customFields && (
                  <pre className="text-xs bg-gray-50 p-2 rounded mt-2">
                    {JSON.stringify(cat.customFields, null, 2)}
                  </pre>
                )}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => onEdit(cat)}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                >
                  <PencilIcon className="h-5 w-5" />
                </button>
                <button
                  onClick={() => onDelete(cat.id)}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                >
                  <TrashIcon className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {catModal.open && (
        <Modal
          title={catModal.data ? 'Edit Category' : 'Add Category'}
          onClose={() => setCatModal({ open: false, data: null })}
        >
          <form onSubmit={onSubmit}>
            <div className="mb-4">
              <label className="label">Category Name</label>
              <input
                type="text"
                className="input-field"
                value={catForm.name}
                onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
                required
              />
            </div>
            <div className="mb-4">
              <label className="label">Custom Fields (JSON)</label>
              <textarea
                className="input-field"
                rows="4"
                placeholder='{"warrantyPeriod": "12 months", "voltage": "220V"}'
                value={catForm.customFields}
                onChange={(e) => setCatForm({ ...catForm, customFields: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Enter valid JSON format</p>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
          </form>
        </Modal>
      )}
    </div>
  );
};

// ============ Employee Tab ============
const EmployeeTab = ({
  employees, filters, setFilters,
  onPromote, onStatusToggle,
  promoteModal, setPromoteModal, onPromoteSubmit,
  departments
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            className="input-field"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="input-field w-auto"
          value={filters.role}
          onChange={(e) => setFilters({ ...filters, role: e.target.value })}
        >
          <option value="">All Roles</option>
          <option value="ADMIN">Admin</option>
          <option value="ASSET_MANAGER">Asset Manager</option>
          <option value="DEPARTMENT_HEAD">Department Head</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
        <select
          className="input-field w-auto"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="pb-3">Name</th>
              <th className="pb-3">Email</th>
              <th className="pb-3">Department</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.map((emp) => (
              <tr key={emp.id} className="border-b hover:bg-gray-50">
                <td className="py-3 font-medium">{emp.name}</td>
                <td className="py-3 text-sm">{emp.email}</td>
                <td className="py-3 text-sm">{emp.department?.name || '-'}</td>
                <td className="py-3">
                  <StatusBadge status={emp.role} />
                </td>
                <td className="py-3">
                  <StatusBadge status={emp.status} />
                </td>
                <td className="py-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onPromote(emp)}
                      className="px-3 py-1 text-sm bg-primary-50 text-primary-600 rounded hover:bg-primary-100"
                    >
                      Promote
                    </button>
                    <button
                      onClick={() => onStatusToggle(emp.id, emp.status)}
                      className={`px-3 py-1 text-sm rounded ${
                        emp.status === 'ACTIVE'
                          ? 'bg-red-50 text-red-600 hover:bg-red-100'
                          : 'bg-green-50 text-green-600 hover:bg-green-100'
                      }`}
                    >
                      {emp.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Promote Modal */}
      {promoteModal.open && (
        <Modal
          title={`Promote ${promoteModal.employee?.name}`}
          onClose={() => setPromoteModal({ open: false, employee: null })}
        >
          <PromoteForm
            employee={promoteModal.employee}
            departments={departments}
            onSubmit={onPromoteSubmit}
            onClose={() => setPromoteModal({ open: false, employee: null })}
          />
        </Modal>
      )}
    </div>
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

// ============ Promote Form ============
const PromoteForm = ({ employee, departments, onSubmit, onClose }) => {
  const [form, setForm] = useState({
    role: 'DEPARTMENT_HEAD',
    departmentId: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(employee.id, form.role, form.departmentId);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label className="label">Select Role</label>
        <select
          className="input-field"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
        >
          <option value="DEPARTMENT_HEAD">Department Head</option>
          <option value="ASSET_MANAGER">Asset Manager</option>
          <option value="EMPLOYEE">Employee</option>
        </select>
      </div>
      {form.role === 'DEPARTMENT_HEAD' && (
        <div className="mb-4">
          <label className="label">Select Department</label>
          <select
            className="input-field"
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            required
          >
            <option value="">Select Department</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      )}
      <div className="flex space-x-3">
        <button type="submit" className="btn-primary flex-1">
          Promote
        </button>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">
          Cancel
        </button>
      </div>
    </form>
  );
};

export default OrganizationSetup;
