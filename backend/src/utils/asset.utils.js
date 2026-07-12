const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get asset statistics for dashboard
exports.getAssetStats = async () => {
  const [
    total,
    available,
    allocated,
    underMaintenance,
    lost,
    retired,
    disposed,
    totalBookable
  ] = await Promise.all([
    prisma.asset.count(),
    prisma.asset.count({ where: { status: 'AVAILABLE' } }),
    prisma.asset.count({ where: { status: 'ALLOCATED' } }),
    prisma.asset.count({ where: { status: 'UNDER_MAINTENANCE' } }),
    prisma.asset.count({ where: { status: 'LOST' } }),
    prisma.asset.count({ where: { status: 'RETIRED' } }),
    prisma.asset.count({ where: { status: 'DISPOSED' } }),
    prisma.asset.count({ where: { isBookable: true } })
  ]);

  return {
    total,
    available,
    allocated,
    underMaintenance,
    lost,
    retired,
    disposed,
    totalBookable,
    utilizationRate: total > 0 ? ((allocated / total) * 100).toFixed(2) : 0
  };
};

// Get assets due for maintenance (based on condition or date)
exports.getAssetsDueForMaintenance = async () => {
  // This is a simplified example - in real app, you'd track maintenance schedules
  const assets = await prisma.asset.findMany({
    where: {
      status: {
        in: ['AVAILABLE', 'ALLOCATED']
      }
    },
    include: {
      maintenances: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  // Filter assets where last maintenance was more than 6 months ago
  const dueAssets = assets.filter(asset => {
    if (asset.maintenances.length === 0) return true;
    const lastMaintenance = asset.maintenances[0];
    const daysSince = (Date.now() - new Date(lastMaintenance.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince > 180; // 6 months
  });

  return dueAssets;
};
