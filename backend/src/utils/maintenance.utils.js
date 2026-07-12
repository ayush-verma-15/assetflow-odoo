const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get maintenance frequency by asset
exports.getMaintenanceFrequency = async () => {
  const maintenances = await prisma.maintenance.groupBy({
    by: ['assetId'],
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 10
  });

  const assets = await prisma.asset.findMany({
    where: {
      id: {
        in: maintenances.map(m => m.assetId)
      }
    },
    select: {
      id: true,
      name: true,
      tag: true
    }
  });

  return maintenances.map(m => ({
    asset: assets.find(a => a.id === m.assetId),
    count: m._count.id
  }));
};

// Get maintenance cost/trends (simplified)
exports.getMaintenanceTrends = async (days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const maintenances = await prisma.maintenance.findMany({
    where: {
      createdAt: { gte: startDate },
      status: 'RESOLVED'
    },
    select: {
      createdAt: true,
      priority: true
    }
  });

  // Group by day
  const trends = {};
  maintenances.forEach(m => {
    const date = m.createdAt.toISOString().split('T')[0];
    if (!trends[date]) {
      trends[date] = { total: 0, urgent: 0, high: 0, medium: 0, low: 0 };
    }
    trends[date].total++;
    trends[date][m.priority.toLowerCase()]++;
  });

  return trends;
};
