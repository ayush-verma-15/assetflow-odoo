const statusColors = {
  AVAILABLE: 'bg-green-100 text-green-800',
  ALLOCATED: 'bg-blue-100 text-blue-800',
  RESERVED: 'bg-yellow-100 text-yellow-800',
  UNDER_MAINTENANCE: 'bg-orange-100 text-orange-800',
  LOST: 'bg-red-100 text-red-800',
  RETIRED: 'bg-gray-100 text-gray-800',
  DISPOSED: 'bg-gray-100 text-gray-800',
  PENDING: 'bg-yellow-100 text-yellow-800',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  RESOLVED: 'bg-green-100 text-green-800',
  UPCOMING: 'bg-blue-100 text-blue-800',
  ONGOING: 'bg-green-100 text-green-800',
  COMPLETED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
  OPEN: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800',
  VERIFIED: 'bg-green-100 text-green-800',
  MISSING: 'bg-red-100 text-red-800',
  DAMAGED: 'bg-orange-100 text-orange-800',
  ACTIVE: 'bg-green-100 text-green-800',
  INACTIVE: 'bg-gray-100 text-gray-800',
};

const StatusBadge = ({ status }) => {
  const color = statusColors[status] || 'bg-gray-100 text-gray-800';
  const display = status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${color}`}>
      {display}
    </span>
  );
};

export default StatusBadge;
