const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Raise Maintenance Request
exports.raiseRequest = async (req, res) => {
  try {
    const { assetId, issue, priority, notes, photo } = req.body;
    const raisedBy = req.userId;

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { currentHolder: true }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check if asset is already under maintenance
    if (asset.status === 'UNDER_MAINTENANCE') {
      return res.status(400).json({ 
        error: 'Asset is already under maintenance' 
      });
    }

    // Validate priority
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority' });
    }

    // Create maintenance request
    const maintenance = await prisma.maintenance.create({
      data: {
        assetId,
        raisedBy,
        issue,
        priority,
        status: 'PENDING',
        notes,
        photo
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
        raisedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Maintenance request raised successfully',
      maintenance
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get All Maintenance Requests
exports.getMaintenances = async (req, res) => {
  try {
    const { 
      status, 
      assetId, 
      priority,
      raisedBy,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};
    if (status) where.status = status;
    if (assetId) where.assetId = assetId;
    if (priority) where.priority = priority;
    if (raisedBy) where.raisedBy = raisedBy;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [maintenances, total] = await Promise.all([
      prisma.maintenance.findMany({
        where,
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
          raisedByUser: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          },
          approvedByUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          technicianUser: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.maintenance.count({ where })
    ]);

    res.json({
      maintenances,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Single Maintenance
exports.getMaintenance = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
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
            },
            allocations: {
              orderBy: { createdAt: 'desc' },
              take: 3,
              include: {
                employee: {
                  select: {
                    id: true,
                    name: true,
                    email: true
                  }
                }
              }
            }
          }
        },
        raisedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        technicianUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    res.json(maintenance);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve Maintenance Request
exports.approveMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { technicianId, notes } = req.body;
    const approvedBy = req.userId;

    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    if (maintenance.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Request already ${maintenance.status.toLowerCase()}` 
      });
    }

    // If technician provided, check if exists
    if (technicianId) {
      const technician = await prisma.user.findUnique({
        where: { id: technicianId }
      });
      if (!technician) {
        return res.status(404).json({ error: 'Technician not found' });
      }
    }

    // Update maintenance
    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy,
        technician: technicianId || null,
        notes: notes || maintenance.notes
      },
      include: {
        asset: {
          include: {
            category: true
          }
        },
        raisedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        technicianUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update asset status to UNDER_MAINTENANCE
    await prisma.asset.update({
      where: { id: maintenance.assetId },
      data: { status: 'UNDER_MAINTENANCE' }
    });

    res.json({
      message: 'Maintenance request approved',
      maintenance: updated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Reject Maintenance Request
exports.rejectMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const rejectedBy = req.userId;

    const maintenance = await prisma.maintenance.findUnique({
      where: { id }
    });

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    if (maintenance.status !== 'PENDING') {
      return res.status(400).json({ 
        error: `Request already ${maintenance.status.toLowerCase()}` 
      });
    }

    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedBy: rejectedBy,
        notes: notes || `Rejected: ${maintenance.notes}`
      },
      include: {
        asset: true,
        raisedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Maintenance request rejected',
      maintenance: updated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Start Maintenance (Technician assigned & started work)
exports.startMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const maintenance = await prisma.maintenance.findUnique({
      where: { id }
    });

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    if (maintenance.status !== 'APPROVED') {
      return res.status(400).json({ 
        error: 'Only approved requests can be started' 
      });
    }

    // Check if user is assigned technician
    if (maintenance.technician && maintenance.technician !== req.userId) {
      return res.status(403).json({ 
        error: 'You are not assigned as technician for this request' 
      });
    }

    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        notes: notes || maintenance.notes
      },
      include: {
        asset: {
          include: {
            category: true
          }
        },
        raisedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        technicianUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.json({
      message: 'Maintenance work started',
      maintenance: updated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Resolve Maintenance
exports.resolveMaintenance = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, condition } = req.body;

    const maintenance = await prisma.maintenance.findUnique({
      where: { id },
      include: { asset: true }
    });

    if (!maintenance) {
      return res.status(404).json({ error: 'Maintenance request not found' });
    }

    if (maintenance.status !== 'IN_PROGRESS') {
      return res.status(400).json({ 
        error: 'Only in-progress requests can be resolved' 
      });
    }

    // Update maintenance
    const updated = await prisma.maintenance.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        notes: notes || maintenance.notes
      },
      include: {
        asset: {
          include: {
            category: true
          }
        },
        raisedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        technicianUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Update asset status back to AVAILABLE
    await prisma.asset.update({
      where: { id: maintenance.assetId },
      data: {
        status: 'AVAILABLE',
        condition: condition || 'Good'
      }
    });

    res.json({
      message: 'Maintenance resolved successfully',
      maintenance: updated
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Maintenance Stats
exports.getMaintenanceStats = async (req, res) => {
  try {
    const [
      total,
      pending,
      approved,
      inProgress,
      resolved,
      rejected,
      urgentCount,
      highCount
    ] = await Promise.all([
      prisma.maintenance.count(),
      prisma.maintenance.count({ where: { status: 'PENDING' } }),
      prisma.maintenance.count({ where: { status: 'APPROVED' } }),
      prisma.maintenance.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.maintenance.count({ where: { status: 'RESOLVED' } }),
      prisma.maintenance.count({ where: { status: 'REJECTED' } }),
      prisma.maintenance.count({ where: { priority: 'URGENT', status: 'PENDING' } }),
      prisma.maintenance.count({ where: { priority: 'HIGH', status: 'PENDING' } })
    ]);

    res.json({
      total,
      pending,
      approved,
      inProgress,
      resolved,
      rejected,
      urgentPending: urgentCount,
      highPending: highCount,
      completionRate: total > 0 ? ((resolved / total) * 100).toFixed(2) : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Maintenance by Asset
exports.getMaintenanceByAsset = async (req, res) => {
  try {
    const { assetId } = req.params;

    const maintenances = await prisma.maintenance.findMany({
      where: { assetId },
      include: {
        raisedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        approvedByUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        technicianUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(maintenances);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
