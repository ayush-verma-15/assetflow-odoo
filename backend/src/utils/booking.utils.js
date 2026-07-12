const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get booking statistics
exports.getBookingStats = async () => {
  const now = new Date();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    totalBookings,
    upcomingBookings,
    ongoingBookings,
    completedBookings,
    cancelledBookings,
    todayBookings
  ] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.count({ where: { status: 'UPCOMING' } }),
    prisma.booking.count({ where: { status: 'ONGOING' } }),
    prisma.booking.count({ where: { status: 'COMPLETED' } }),
    prisma.booking.count({ where: { status: 'CANCELLED' } }),
    prisma.booking.count({
      where: {
        startTime: { gte: today },
        status: { in: ['UPCOMING', 'ONGOING'] }
      }
    })
  ]);

  return {
    totalBookings,
    upcomingBookings,
    ongoingBookings,
    completedBookings,
    cancelledBookings,
    todayBookings
  };
};

// Get resource utilization heatmap data
exports.getResourceUtilization = async (resourceId, startDate, endDate) => {
  const bookings = await prisma.booking.findMany({
    where: {
      resourceId,
      status: { in: ['UPCOMING', 'ONGOING', 'COMPLETED'] },
      startTime: { gte: new Date(startDate) },
      endTime: { lte: new Date(endDate) }
    }
  });

  // Group by hour/day
  const utilization = {};
  bookings.forEach(booking => {
    const hour = new Date(booking.startTime).getHours();
    const day = new Date(booking.startTime).toISOString().split('T')[0];
    const key = `${day}-${hour}`;
    utilization[key] = (utilization[key] || 0) + 1;
  });

  return utilization;
};
