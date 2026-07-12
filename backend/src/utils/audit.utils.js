const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

exports.getComplianceRate = async (departmentId) => {
  const where = {};
  if (departmentId) where.departmentId = departmentId;

  const [total, verified] = await Promise.all([
    prisma.auditItem.count({ where }),
    prisma.auditItem.count({
      where: {
        ...where,
        status: 'VERIFIED',
      },
    }),
  ]);

  return {
    total,
    verified,
    complianceRate: total > 0 ? ((verified / total) * 100).toFixed(2) : 0,
  };
};

exports.getAssetAuditHistory = async (assetId) => {
  const auditItems = await prisma.auditItem.findMany({
    where: { assetId },
    include: {
      cycle: {
        select: {
          id: true,
          name: true,
          startDate: true,
          endDate: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return auditItems;
};
