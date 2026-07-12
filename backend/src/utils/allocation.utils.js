const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Check if asset is available for allocation
exports.isAssetAvailable = async (assetId) => {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId }
  });

  return asset && (asset.status === 'AVAILABLE' || asset.status === 'RESERVED');
};

// Get pending transfer requests for a department
exports.getPendingTransferRequests = async (departmentId) => {
  const requests = await prisma.allocation.findMany({
    where: {
      status: 'REQUESTED',
      employee: {
        departmentId
      }
    },
    include: {
      asset: {
        include: {
          category: true,
          currentHolder: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      },
      employee: {
        select: {
          id: true,
          name: true,
          email: true,
          department: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  return requests;
};

// Get allocation statistics
exports.getAllocationStats = async () => {
  const [
    totalAllocations,
    activeAllocations,
    pendingTransfers,
    overdueReturns
  ] = await Promise.all([
    prisma.allocation.count(),
    prisma.allocation.count({ where: { status: 'APPROVED' } }),
    prisma.allocation.count({ where: { status: 'REQUESTED' } }),
    prisma.allocation.count({
      where: {
        status: 'APPROVED',
        expectedReturn: {
          lt: new Date()
        }
      }
    })
  ]);

  return {
    totalAllocations,
    activeAllocations,
    pendingTransfers,
    overdueReturns
  };
};
