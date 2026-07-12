import { useEffect, useState } from 'react';
import { 
  CubeIcon, 
  UserGroupIcon, 
  CalendarIcon,
  ExclamationTriangleIcon,
  ArrowTrendingUpIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import Layout from '../components/Layout/Layout';
import KpiCard from '../components/common/KpiCard';
import { assetAPI, allocationAPI, bookingAPI, maintenanceAPI } from '../api';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAssets: 0,
    availableAssets: 0,
    allocatedAssets: 0,
    activeBookings: 0,
    pendingMaintenance: 0,
    overdueReturns: 0,
  });
  const [loading, setLoading] = useState(true);
  const [overdueAllocations, setOverdueAllocations] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [assetsRes, allocationsRes, bookingsRes, maintenanceRes, overdueRes] = await Promise.all([
        assetAPI.getAll({ limit: 1 }),
        allocationAPI.getAll({ status: 'APPROVED' }),
        bookingAPI.getAll({ status: 'UPCOMING' }),
        maintenanceAPI.getAll({ status: 'PENDING' }),
        allocationAPI.getOverdue(),
      ]);

      setStats({
        totalAssets: assetsRes.data.pagination?.total || 0,
        availableAssets: assetsRes.data.assets?.filter(a => a.status === 'AVAILABLE').length || 0,
        allocatedAssets: allocationsRes.data?.length || 0,
        activeBookings: bookingsRes.data?.bookings?.length || 0,
        pendingMaintenance: maintenanceRes.data?.maintenances?.length || 0,
        overdueReturns: overdueRes.data?.length || 0,
      });
      setOverdueAllocations(overdueRes.data || []);
      setLoading(false);
    } catch (error) {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <KpiCard
          title="Total Assets"
          value={stats.totalAssets}
          icon={CubeIcon}
          color="primary"
        />
        <KpiCard
          title="Available Assets"
          value={stats.availableAssets}
          icon={CubeIcon}
          color="green"
        />
        <KpiCard
          title="Active Allocations"
          value={stats.allocatedAssets}
          icon={UserGroupIcon}
          color="blue"
        />
        <KpiCard
          title="Active Bookings"
          value={stats.activeBookings}
          icon={CalendarIcon}
          color="yellow"
        />
        <KpiCard
          title="Pending Maintenance"
          value={stats.pendingMaintenance}
          icon={ExclamationTriangleIcon}
          color="red"
        />
        <KpiCard
          title="Overdue Returns"
          value={stats.overdueReturns}
          icon={ClockIcon}
          color="red"
        />
        <KpiCard
          title="Utilization Rate"
          value={`${stats.totalAssets > 0 ? ((stats.allocatedAssets / stats.totalAssets) * 100).toFixed(1) : 0}%`}
          icon={ArrowTrendingUpIcon}
          color="blue"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <button className="btn-primary">+ Register Asset</button>
        <button className="btn-primary">+ Book Resource</button>
        <button className="btn-primary">+ Raise Maintenance</button>
      </div>

      {/* Overdue Returns */}
      {overdueAllocations.length > 0 && (
        <div className="card">
          <h2 className="text-lg font-semibold text-red-600 mb-4">⚠️ Overdue Returns</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500">
                  <th className="pb-2">Asset</th>
                  <th className="pb-2">Employee</th>
                  <th className="pb-2">Expected Return</th>
                  <th className="pb-2">Days Overdue</th>
                </tr>
              </thead>
              <tbody>
                {overdueAllocations.map((allocation) => {
                  const daysOverdue = Math.ceil(
                    (new Date() - new Date(allocation.expectedReturn)) / (1000 * 60 * 60 * 24)
                  );
                  return (
                    <tr key={allocation.id} className="border-t">
                      <td className="py-2">{allocation.asset?.name}</td>
                      <td className="py-2">{allocation.employee?.name}</td>
                      <td className="py-2">
                        {new Date(allocation.expectedReturn).toLocaleDateString()}
                      </td>
                      <td className="py-2 text-red-600 font-medium">{daysOverdue} days</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Dashboard;
