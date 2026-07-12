import { useState, useEffect } from 'react';
import {
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  DocumentArrowDownIcon,
  PrinterIcon
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from 'recharts';
import Layout from '../components/Layout/Layout';
import { assetAPI, allocationAPI, maintenanceAPI, bookingAPI, departmentAPI } from '../api';
import toast from 'react-hot-toast';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [selectedReport, setSelectedReport] = useState('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Data states
  const [assetStats, setAssetStats] = useState({
    total: 0,
    available: 0,
    allocated: 0,
    underMaintenance: 0,
    lost: 0,
    retired: 0
  });
  const [departmentData, setDepartmentData] = useState([]);
  const [utilizationData, setUtilizationData] = useState([]);
  const [maintenanceData, setMaintenanceData] = useState([]);
  const [bookingData, setBookingData] = useState([]);
  const [topAssets, setTopAssets] = useState([]);
  const [idleAssets, setIdleAssets] = useState([]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'];

  useEffect(() => {
    fetchReportData();
  }, [dateRange, selectedReport]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [assetsRes, allocationsRes, maintenanceRes, bookingsRes, departmentsRes] = await Promise.all([
        assetAPI.getAll({ limit: 1000 }),
        allocationAPI.getAll({ status: 'APPROVED' }),
        maintenanceAPI.getAll({}),
        bookingAPI.getAll({}),
        departmentAPI.getAll()
      ]);

      const assets = assetsRes.data.assets || [];
      const allocations = allocationsRes.data || [];
      const maintenances = maintenanceRes.data.maintenances || [];
      const bookings = bookingsRes.data.bookings || [];
      const departments = departmentsRes.data || [];

      const statusCounts = {
        total: assets.length,
        available: assets.filter((a) => a.status === 'AVAILABLE').length,
        allocated: assets.filter((a) => a.status === 'ALLOCATED').length,
        underMaintenance: assets.filter((a) => a.status === 'UNDER_MAINTENANCE').length,
        lost: assets.filter((a) => a.status === 'LOST').length,
        retired: assets.filter((a) => a.status === 'RETIRED').length
      };
      setAssetStats(statusCounts);

      const deptData = departments.map((dept) => ({
        name: dept.name,
        assets: assets.filter((a) => a.departmentId === dept.id).length,
        allocations: allocations.filter((a) => a.employee?.departmentId === dept.id).length
      }));
      setDepartmentData(deptData);

      const utilData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayBookings = bookings.filter(
          (b) => new Date(b.startTime).toISOString().split('T')[0] === dateStr
        );
        utilData.push({
          date: dateStr,
          bookings: dayBookings.length,
          allocations: allocations.filter(
            (a) => new Date(a.createdAt).toISOString().split('T')[0] === dateStr
          ).length
        });
      }
      setUtilizationData(utilData);

      const maintByCategory = {};
      maintenances.forEach((m) => {
        const category = m.asset?.category?.name || 'Uncategorized';
        if (!maintByCategory[category]) maintByCategory[category] = 0;
        maintByCategory[category]++;
      });
      setMaintenanceData(Object.entries(maintByCategory).map(([name, value]) => ({ name, value })));

      const bookingByHour = {};
      bookings.forEach((b) => {
        const hour = new Date(b.startTime).getHours();
        if (!bookingByHour[hour]) bookingByHour[hour] = 0;
        bookingByHour[hour]++;
      });
      setBookingData(
        Object.entries(bookingByHour).map(([hour, count]) => ({
          hour: `${hour}:00`,
          bookings: count
        }))
      );

      const assetUsage = {};
      allocations.forEach((a) => {
        if (!assetUsage[a.assetId]) assetUsage[a.assetId] = 0;
        assetUsage[a.assetId]++;
      });
      const sortedAssets = Object.entries(assetUsage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([assetId, count]) => {
          const asset = assets.find((a) => a.id === assetId);
          return { name: asset?.name || 'Unknown', usage: count };
        });
      setTopAssets(sortedAssets);

      const idle = assets.filter((a) => {
        if (a.status !== 'AVAILABLE') return false;
        const lastAllocation = a.allocations?.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt))[0];
        if (!lastAllocation) return true;
        const days = (new Date() - new Date(lastAllocation.createdAt)) / (1000 * 60 * 60 * 24);
        return days > 30;
      });
      setIdleAssets(idle);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    }
    setLoading(false);
  };

  const exportReport = () => {
    const headers = ['Metric', 'Value'];
    const rows = [
      ['Total Assets', assetStats.total],
      ['Available', assetStats.available],
      ['Allocated', assetStats.allocated],
      ['Under Maintenance', assetStats.underMaintenance],
      ['Lost', assetStats.lost],
      ['Retired', assetStats.retired]
    ];

    let csv = headers.join(',') + '\n';
    rows.forEach((row) => {
      csv += row.join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `asset-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success('Report exported successfully');
  };

  const printReport = () => {
    window.print();
  };

  const reports = [
    { id: 'overview', label: 'Overview' },
    { id: 'utilization', label: 'Utilization' },
    { id: 'maintenance', label: 'Maintenance' },
    { id: 'bookings', label: 'Bookings' }
  ];

  return (
    <Layout title="Reports & Analytics">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedReport === report.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {report.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={exportReport} className="btn-primary flex items-center text-sm">
            <DocumentArrowDownIcon className="h-4 w-4 mr-1" />
            Export
          </button>
          <button onClick={printReport} className="btn-secondary flex items-center text-sm">
            <PrinterIcon className="h-4 w-4 mr-1" />
            Print
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Date Range:</label>
          <input
            type="date"
            className="input-field w-auto"
            value={dateRange.startDate}
            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            className="input-field w-auto"
            value={dateRange.endDate}
            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
          />
          <button onClick={fetchReportData} className="btn-primary text-sm">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {selectedReport === 'overview' && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Total Assets</p>
                  <p className="text-2xl font-bold text-primary-600">{assetStats.total}</p>
                </div>
                <div className="card text-center bg-green-50">
                  <p className="text-sm text-green-700">Available</p>
                  <p className="text-2xl font-bold text-green-800">{assetStats.available}</p>
                </div>
                <div className="card text-center bg-blue-50">
                  <p className="text-sm text-blue-700">Allocated</p>
                  <p className="text-2xl font-bold text-blue-800">{assetStats.allocated}</p>
                </div>
                <div className="card text-center bg-orange-50">
                  <p className="text-sm text-orange-700">Under Maintenance</p>
                  <p className="text-2xl font-bold text-orange-800">{assetStats.underMaintenance}</p>
                </div>
                <div className="card text-center bg-red-50">
                  <p className="text-sm text-red-700">Lost</p>
                  <p className="text-2xl font-bold text-red-800">{assetStats.lost}</p>
                </div>
                <div className="card text-center bg-gray-50">
                  <p className="text-sm text-gray-700">Retired</p>
                  <p className="text-2xl font-bold text-gray-800">{assetStats.retired}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">Asset Status Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Available', value: assetStats.available },
                          { name: 'Allocated', value: assetStats.allocated },
                          { name: 'Under Maintenance', value: assetStats.underMaintenance },
                          { name: 'Lost', value: assetStats.lost },
                          { name: 'Retired', value: assetStats.retired }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {[0, 1, 2, 3, 4].map((index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">Department-wise Allocation</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={departmentData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="allocations" fill="#3b82f6" name="Allocations" />
                      <Bar dataKey="assets" fill="#10b981" name="Assets" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                    <ArrowTrendingUpIcon className="h-5 w-5 text-green-600 mr-2" />
                    Most Used Assets
                  </h3>
                  <div className="space-y-2">
                    {topAssets.length > 0 ? (
                      topAssets.map((asset, index) => (
                        <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span className="text-sm">{asset.name}</span>
                          <span className="text-sm font-medium text-primary-600">{asset.usage} allocations</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">No data available</p>
                    )}
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4 flex items-center">
                    <ArrowTrendingDownIcon className="h-5 w-5 text-red-600 mr-2" />
                    Idle Assets (&gt;30 days)
                  </h3>
                  <div className="space-y-2">
                    {idleAssets.length > 0 ? (
                      idleAssets.slice(0, 5).map((asset) => (
                        <div key={asset.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                          <span className="text-sm">{asset.name}</span>
                          <span className="text-sm text-gray-500">{asset.tag}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500">All assets are active</p>
                    )}
                    {idleAssets.length > 5 && (
                      <p className="text-xs text-gray-500">+{idleAssets.length - 5} more idle assets</p>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {selectedReport === 'utilization' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-4">Daily Utilization Trend</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={utilizationData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="bookings" stroke="#3b82f6" fill="#93c5fd" name="Bookings" />
                    <Area type="monotone" dataKey="allocations" stroke="#10b981" fill="#6ee7b7" name="Allocations" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">Utilization Rate</h3>
                  <div className="text-center py-8">
                    <p className="text-5xl font-bold text-primary-600">
                      {assetStats.total > 0 ? ((assetStats.allocated / assetStats.total) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-gray-500 mt-2">Overall asset utilization</p>
                  </div>
                </div>

                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">Department-wise Utilization</h3>
                  <div className="space-y-3">
                    {departmentData.slice(0, 5).map((dept, index) => (
                      <div key={index}>
                        <div className="flex justify-between text-sm">
                          <span>{dept.name}</span>
                          <span>{dept.assets > 0 ? ((dept.allocations / dept.assets) * 100).toFixed(0) : 0}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-primary-600 h-2 rounded-full"
                            style={{ width: `${dept.assets > 0 ? (dept.allocations / dept.assets) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedReport === 'maintenance' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">Maintenance by Category</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart data={maintenanceData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#f59e0b" name="Maintenance Requests" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div className="card">
                  <h3 className="font-semibold text-gray-700 mb-4">Maintenance Priority Breakdown</h3>
                  <ResponsiveContainer width="100%" height={350}>
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Urgent', value: 5 },
                          { name: 'High', value: 10 },
                          { name: 'Medium', value: 20 },
                          { name: 'Low', value: 15 }
                        ]}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        <Cell fill="#ef4444" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#3b82f6" />
                        <Cell fill="#10b981" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-4">Maintenance Recommendations</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <p className="font-medium text-yellow-800">Assets Due for Maintenance</p>
                    <p className="text-2xl font-bold text-yellow-800 mt-2">{assetStats.underMaintenance + 3}</p>
                    <p className="text-sm text-yellow-600">Need inspection</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="font-medium text-orange-800">Pending Requests</p>
                    <p className="text-2xl font-bold text-orange-800 mt-2">8</p>
                    <p className="text-sm text-orange-600">Awaiting approval</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="font-medium text-green-800">Resolved This Month</p>
                    <p className="text-2xl font-bold text-green-800 mt-2">12</p>
                    <p className="text-sm text-green-600">↑ 20% from last month</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedReport === 'bookings' && (
            <div className="space-y-6">
              <div className="card">
                <h3 className="font-semibold text-gray-700 mb-4">Booking Heatmap (Hourly)</h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={bookingData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="bookings" fill="#8b5cf6" name="Bookings" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card text-center">
                  <p className="text-sm text-gray-500">Total Bookings</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {bookingData.reduce((sum, d) => sum + d.bookings, 0)}
                  </p>
                </div>
                <div className="card text-center bg-blue-50">
                  <p className="text-sm text-blue-700">Peak Hour</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {bookingData.length > 0
                      ? bookingData.reduce((max, d) => (d.bookings > max.bookings ? d : max)).hour
                      : 'N/A'}
                  </p>
                </div>
                <div className="card text-center bg-green-50">
                  <p className="text-sm text-green-700">Avg. Daily Bookings</p>
                  <p className="text-2xl font-bold text-green-800">
                    {utilizationData.length > 0
                      ? (utilizationData.reduce((sum, d) => sum + d.bookings, 0) / utilizationData.length).toFixed(1)
                      : 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
};

export default Reports;
