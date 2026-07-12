const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

exports.createAuditCycle = async (req, res) => {
  try {
    const { name, departmentId, startDate, endDate, auditorIds } = req.body;

    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start >= end) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const auditCycle = await prisma.auditCycle.create({
      data: {
        name,
        departmentId: departmentId || null,
        startDate: start,
        endDate: end,
        status: 'OPEN',
        auditors: {
          connect: auditorIds?.map((id) => ({ id })) || [],
        },
      },
      include: {
        department: true,
        auditors: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            asset: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    const where = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const assets = await prisma.asset.findMany({
      where,
      select: { id: true },
    });

    await prisma.auditItem.createMany({
      data: assets.map((asset) => ({
        cycleId: auditCycle.id,
        assetId: asset.id,
        status: 'VERIFIED',
      })),
    });

    const updatedCycle = await prisma.auditCycle.findUnique({
      where: { id: auditCycle.id },
      include: {
        department: true,
        auditors: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            asset: {
              include: {
                category: true,
                currentHolder: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: 'Audit cycle created successfully',
      auditCycle: updatedCycle,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAuditCycles = async (req, res) => {
  try {
    const { status, departmentId, page = 1, limit = 20 } = req.query;

    const where = {};
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [auditCycles, total] = await Promise.all([
      prisma.auditCycle.findMany({
        where,
        include: {
          department: true,
          auditors: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          items: {
            include: {
              asset: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditCycle.count({ where }),
    ]);

    res.json({
      auditCycles,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAuditCycle = async (req, res) => {
  try {
    const { id } = req.params;

    const auditCycle = await prisma.auditCycle.findUnique({
      where: { id },
      include: {
        department: true,
        auditors: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true,
          },
        },
        items: {
          include: {
            asset: {
              include: {
                category: true,
                currentHolder: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
                department: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!auditCycle) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }

    res.json(auditCycle);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateAuditCycle = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, departmentId, startDate, endDate, auditorIds, status } = req.body;

    const auditCycle = await prisma.auditCycle.findUnique({
      where: { id },
    });

    if (!auditCycle) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }

    if (auditCycle.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot update closed audit cycle' });
    }

    const data = {};
    if (name) data.name = name;
    if (departmentId) data.departmentId = departmentId;
    if (startDate) data.startDate = new Date(startDate);
    if (endDate) data.endDate = new Date(endDate);
    if (status) data.status = status;

    if (auditorIds) {
      data.auditors = {
        set: auditorIds.map((id) => ({ id })),
      };
    }

    const updated = await prisma.auditCycle.update({
      where: { id },
      data,
      include: {
        department: true,
        auditors: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            asset: {
              include: {
                category: true,
              },
            },
          },
        },
      },
    });

    res.json({
      message: 'Audit cycle updated successfully',
      auditCycle: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.verifyAsset = async (req, res) => {
  try {
    const { auditItemId } = req.params;
    const { status, notes } = req.body;
    const auditorId = req.userId;

    const validStatuses = ['VERIFIED', 'MISSING', 'DAMAGED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const auditItem = await prisma.auditItem.findUnique({
      where: { id: auditItemId },
      include: {
        cycle: {
          include: {
            auditors: true,
          },
        },
        asset: true,
      },
    });

    if (!auditItem) {
      return res.status(404).json({ error: 'Audit item not found' });
    }

    const isAuditor = auditItem.cycle.auditors.some((a) => a.id === auditorId);
    if (!isAuditor && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: 'Only assigned auditors or admin can verify assets',
      });
    }

    if (auditItem.cycle.status === 'CLOSED') {
      return res.status(400).json({ error: 'Cannot verify assets in closed audit cycle' });
    }

    const updated = await prisma.auditItem.update({
      where: { id: auditItemId },
      data: {
        status,
        notes: notes || auditItem.notes,
        verifiedBy: auditorId,
        verifiedAt: new Date(),
      },
      include: {
        asset: {
          include: {
            category: true,
            currentHolder: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        cycle: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (status === 'MISSING') {
      await prisma.asset.update({
        where: { id: auditItem.assetId },
        data: { status: 'LOST' },
      });
    }

    if (status === 'DAMAGED') {
      await prisma.asset.update({
        where: { id: auditItem.assetId },
        data: { condition: 'Damaged - Needs Repair' },
      });
    }

    res.json({
      message: `Asset marked as ${status}`,
      auditItem: updated,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.generateDiscrepancyReport = async (req, res) => {
  try {
    const { id } = req.params;

    const auditCycle = await prisma.auditCycle.findUnique({
      where: { id },
      include: {
        department: true,
        auditors: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          where: {
            status: {
              in: ['MISSING', 'DAMAGED'],
            },
          },
          include: {
            asset: {
              include: {
                category: true,
                currentHolder: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    department: true,
                  },
                },
                department: true,
              },
            },
          },
        },
      },
    });

    if (!auditCycle) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }

    const report = {
      auditCycle: {
        id: auditCycle.id,
        name: auditCycle.name,
        startDate: auditCycle.startDate,
        endDate: auditCycle.endDate,
        status: auditCycle.status,
      },
      department: auditCycle.department,
      auditors: auditCycle.auditors,
      discrepancies: {
        total: auditCycle.items.length,
        missing: auditCycle.items.filter((i) => i.status === 'MISSING').length,
        damaged: auditCycle.items.filter((i) => i.status === 'DAMAGED').length,
        items: auditCycle.items.map((item) => ({
          asset: {
            id: item.asset.id,
            name: item.asset.name,
            tag: item.asset.tag,
            serialNo: item.asset.serialNo,
            category: item.asset.category,
            currentHolder: item.asset.currentHolder,
          },
          status: item.status,
          notes: item.notes,
          verifiedAt: item.verifiedAt,
          verifiedBy: item.verifiedBy,
        })),
      },
      generatedAt: new Date(),
      summary: {
        totalAssets: await prisma.asset.count({
          where: auditCycle.departmentId ? { departmentId: auditCycle.departmentId } : {},
        }),
        verifiedCount: await prisma.auditItem.count({
          where: {
            cycleId: id,
            status: 'VERIFIED',
          },
        }),
        discrepancyCount: auditCycle.items.length,
      },
    };

    res.json(report);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.closeAuditCycle = async (req, res) => {
  try {
    const { id } = req.params;

    const auditCycle = await prisma.auditCycle.findUnique({
      where: { id },
      include: {
        items: {
          where: {
            status: {
              in: ['MISSING', 'DAMAGED'],
            },
          },
          include: {
            asset: true,
          },
        },
      },
    });

    if (!auditCycle) {
      return res.status(404).json({ error: 'Audit cycle not found' });
    }

    if (auditCycle.status === 'CLOSED') {
      return res.status(400).json({ error: 'Audit cycle already closed' });
    }

    for (const item of auditCycle.items) {
      if (item.status === 'MISSING') {
        await prisma.asset.update({
          where: { id: item.assetId },
          data: { status: 'LOST' },
        });
      } else if (item.status === 'DAMAGED') {
        await prisma.asset.update({
          where: { id: item.assetId },
          data: { condition: 'Damaged - Needs Repair' },
        });
      }
    }

    const closed = await prisma.auditCycle.update({
      where: { id },
      data: { status: 'CLOSED' },
      include: {
        department: true,
        auditors: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            asset: {
              include: {
                category: true,
                currentHolder: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    res.json({
      message: 'Audit cycle closed successfully',
      auditCycle: closed,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getAuditStats = async (req, res) => {
  try {
    const [totalCycles, openCycles, closedCycles, totalItems, missingItems, damagedItems] = await Promise.all([
      prisma.auditCycle.count(),
      prisma.auditCycle.count({ where: { status: 'OPEN' } }),
      prisma.auditCycle.count({ where: { status: 'CLOSED' } }),
      prisma.auditItem.count(),
      prisma.auditItem.count({ where: { status: 'MISSING' } }),
      prisma.auditItem.count({ where: { status: 'DAMAGED' } }),
    ]);

    res.json({
      totalCycles,
      openCycles,
      closedCycles,
      totalItems,
      missingItems,
      damagedItems,
      discrepancyRate: totalItems > 0 ? (((missingItems + damagedItems) / totalItems) * 100).toFixed(2) : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
