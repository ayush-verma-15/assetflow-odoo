const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Allocate Asset to Employee
exports.allocateAsset = async (req, res) => {
  try {
    const { assetId, employeeId, expectedReturn, notes } = req.body;

    // Check if asset exists
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { currentHolder: true }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // Check if asset is already allocated
    if (asset.status === 'ALLOCATED' || asset.status === 'RESERVED') {
      return res.status(400).json({
        error: `Asset is currently ${asset.status.toLowerCase()} by ${asset.currentHolder?.name || 'someone'}`,
        currentHolder: asset.currentHolder
      });
    }

    // Check if asset is under maintenance
    if (asset.status === 'UNDER_MAINTENANCE') {
      return res.status(400).json({
        error: 'Asset is under maintenance and cannot be allocated'
      });
    }

    // Check if employee exists
    const employee = await prisma.user.findUnique({
      where: { id: employeeId }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    // Create allocation
    const allocation = await prisma.allocation.create({
      data: {
        assetId,
        employeeId,
        expectedReturn: expectedReturn ? new Date(expectedReturn) : null,
        notes,
        status: 'APPROVED' // Auto-approve for direct allocation
      },
      include: {
        asset: {
          include: {
            category: true
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
      }
    });

    // Update asset status and current holder
    await prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'ALLOCATED',
        currentHolderId: employeeId,
        departmentId: employee.departmentId
      }
    });

    res.status(201).json({
      message: 'Asset allocated successfully',
      allocation
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Request Transfer (Employee → Asset Manager)
exports.requestTransfer = async (req, res) => {
  try {
    const { assetId, targetEmployeeId, reason } = req.body;
    const requesterId = req.userId;

    // Check if asset exists and is allocated
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        currentHolder: true,
        allocations: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.status !== 'ALLOCATED') {
      return res.status(400).json({ error: 'Asset is not currently allocated' });
    }

    // Check if requester is the current holder or department head
    const isHolder = asset.currentHolderId === requesterId;
    const user = await prisma.user.findUnique({
      where: { id: requesterId },
      include: { department: true }
    });

    const isDeptHead = user.role === 'DEPARTMENT_HEAD' &&
                       user.departmentId === asset.currentHolder?.departmentId;

    if (!isHolder && !isDeptHead) {
      return res.status(403).json({ 
        error: 'Only the current holder or department head can request transfer' 
      });
    }

    // Check if target employee exists
    const targetEmployee = await prisma.user.findUnique({
      where: { id: targetEmployeeId }
    });

    if (!targetEmployee) {
      return res.status(404).json({ error: 'Target employee not found' });
    }

    // Create transfer request (as a new allocation with REQUESTED status)
    const transferRequest = await prisma.allocation.create({
      data: {
        assetId,
        employeeId: targetEmployeeId,
        notes: `Transfer request from ${user.name}: ${reason || 'No reason provided'}`,
        status: 'REQUESTED',
        expectedReturn: asset.allocations[0]?.expectedReturn || null
      },
      include: {
        asset: {
          include: {
            category: true
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
      }
    });

    res.status(201).json({
      message: 'Transfer request submitted for approval',
      transferRequest
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Approve Transfer
exports.approveTransfer = async (req, res) => {
  try {
    const { allocationId } = req.params;
    const { action } = req.body; // 'APPROVED' or 'REJECTED'

    const allocation = await prisma.allocation.findUnique({
      where: { id: allocationId },
      include: {
        asset: true,
        employee: true
      }
    });

    if (!allocation) {
      return res.status(404).json({ error: 'Allocation not found' });
    }

    if (allocation.status !== 'REQUESTED') {
      return res.status(400).json({ error: 'Only requested allocations can be approved' });
    }

    if (action === 'REJECTED') {
      // Reject the transfer
      const updated = await prisma.allocation.update({
        where: { id: allocationId },
        data: { status: 'REJECTED' }
      });

      return res.json({
        message: 'Transfer request rejected',
        allocation: updated
      });
    }

    // APPROVED - Complete the transfer
    // 1. Mark old allocation as RETURNED (if exists)
    const oldAllocation = await prisma.allocation.findFirst({
      where: {
        assetId: allocation.assetId,
        status: 'APPROVED'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (oldAllocation) {
      await prisma.allocation.update({
        where: { id: oldAllocation.id },
        data: {
          status: 'RETURNED',
          returnedAt: new Date(),
          notes: `Transferred to ${allocation.employee.name} on ${new Date().toLocaleDateString()}`
        }
      });
    }

    // 2. Update new allocation to APPROVED
    const updatedAllocation = await prisma.allocation.update({
      where: { id: allocationId },
      data: {
        status: 'APPROVED'
      },
      include: {
        asset: {
          include: {
            category: true
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
      }
    });

    // 3. Update asset holder
    await prisma.asset.update({
      where: { id: allocation.assetId },
      data: {
        currentHolderId: allocation.employeeId,
        departmentId: allocation.employee.departmentId,
        status: 'ALLOCATED'
      }
    });

    res.json({
      message: 'Transfer approved and completed',
      allocation: updatedAllocation
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Return Asset
exports.returnAsset = async (req, res) => {
  try {
    const { assetId } = req.params;
    const { condition, notes } = req.body;

    // Check if asset exists and is allocated
    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: { currentHolder: true }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    if (asset.status !== 'ALLOCATED') {
      return res.status(400).json({ error: 'Asset is not currently allocated' });
    }

    // Find current allocation
    const currentAllocation = await prisma.allocation.findFirst({
      where: {
        assetId,
        status: 'APPROVED'
      },
      orderBy: { createdAt: 'desc' }
    });

    if (currentAllocation) {
      // Update allocation to RETURNED
      await prisma.allocation.update({
        where: { id: currentAllocation.id },
        data: {
          status: 'RETURNED',
          returnedAt: new Date(),
          notes: notes || `Returned. Condition: ${condition || 'Not specified'}`
        }
      });
    }

    // Update asset
    const updatedAsset = await prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'AVAILABLE',
        currentHolderId: null,
        condition: condition || asset.condition
      },
      include: {
        category: true,
        department: true
      }
    });

    res.json({
      message: 'Asset returned successfully',
      asset: updatedAsset
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get All Allocations
exports.getAllocations = async (req, res) => {
  try {
    const { status, assetId, employeeId, departmentId } = req.query;

    const where = {};
    if (status) where.status = status;
    if (assetId) where.assetId = assetId;
    if (employeeId) where.employeeId = employeeId;
    if (departmentId) where.employee = { departmentId };

    const allocations = await prisma.allocation.findMany({
      where,
      include: {
        asset: {
          include: {
            category: true
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
      orderBy: { createdAt: 'desc' }
    });

    res.json(allocations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Overdue Allocations
exports.getOverdueAllocations = async (req, res) => {
  try {
    const today = new Date();

    const overdue = await prisma.allocation.findMany({
      where: {
        status: 'APPROVED',
        expectedReturn: {
          lt: today
        }
      },
      include: {
        asset: {
          include: {
            category: true
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
      orderBy: { expectedReturn: 'asc' }
    });

    res.json(overdue);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Asset Allocation History
exports.getAssetAllocationHistory = async (req, res) => {
  try {
    const { assetId } = req.params;

    const allocations = await prisma.allocation.findMany({
      where: { assetId },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(allocations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get Employee Allocations
exports.getEmployeeAllocations = async (req, res) => {
  try {
    const { employeeId } = req.params;

    const allocations = await prisma.allocation.findMany({
      where: { 
        employeeId,
        status: {
          in: ['APPROVED', 'REQUESTED']
        }
      },
      include: {
        asset: {
          include: {
            category: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(allocations);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
