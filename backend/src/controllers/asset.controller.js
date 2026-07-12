const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Generate Asset Tag
const generateAssetTag = async () => {
  const lastAsset = await prisma.asset.findFirst({
    orderBy: { tag: 'desc' }
  });

  if (!lastAsset) {
    return 'AF-0001';
  }

  const lastNumber = parseInt(lastAsset.tag.split('-')[1]);
  const newNumber = String(lastNumber + 1).padStart(4, '0');
  return `AF-${newNumber}`;
};

// Register Asset
exports.registerAsset = async (req, res) => {
  try {
    const {
      name,
      serialNo,
      categoryId,
      acquisitionDate,
      cost,
      condition,
      location,
      photo,
      documents,
      isBookable,
      departmentId
    } = req.body;

    // Check if category exists
    const category = await prisma.assetCategory.findUnique({
      where: { id: categoryId }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // Generate unique asset tag
    const tag = await generateAssetTag();

    // Check if serial number already exists
    if (serialNo) {
      const existing = await prisma.asset.findFirst({
        where: { serialNo }
      });

      if (existing) {
        return res.status(400).json({ error: 'Serial number already exists' });
      }
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        tag,
        serialNo,
        categoryId,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        cost: cost ? parseFloat(cost) : null,
        condition,
        location,
        photo,
        documents,
        isBookable: isBookable || false,
        departmentId: departmentId || null,
        status: 'AVAILABLE'
      },
      include: {
        category: true,
        department: true,
        currentHolder: true
      }
    });

    res.status(201).json({
      message: 'Asset registered successfully',
      asset
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get all assets with filters
exports.getAssets = async (req, res) => {
  try {
    const {
      search,
      categoryId,
      status,
      departmentId,
      location,
      isBookable,
      page = 1,
      limit = 20
    } = req.query;

    const where = {};

    // Search by tag, serial number, or name
    if (search) {
      where.OR = [
        { tag: { contains: search, mode: 'insensitive' } },
        { serialNo: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (departmentId) where.departmentId = departmentId;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (isBookable !== undefined) where.isBookable = isBookable === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [assets, total] = await Promise.all([
      prisma.asset.findMany({
        where,
        include: {
          category: true,
          department: true,
          currentHolder: {
            select: {
              id: true,
              name: true,
              email: true,
              department: true
            }
          },
          allocations: {
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            }
          },
          maintenances: {
            orderBy: { createdAt: 'desc' },
            take: 5
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' }
      }),
      prisma.asset.count({ where })
    ]);

    res.json({
      assets,
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

// Get single asset with full history
exports.getAsset = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        category: true,
        department: true,
        currentHolder: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        },
        allocations: {
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true,
                department: true
              }
            }
          }
        },
        maintenances: {
          orderBy: { createdAt: 'desc' },
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
          }
        },
        bookings: {
          where: {
            status: {
              in: ['UPCOMING', 'ONGOING']
            }
          },
          include: {
            bookedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        auditItems: {
          include: {
            cycle: {
              select: {
                id: true,
                name: true,
                status: true
              }
            }
          }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update Asset
exports.updateAsset = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      serialNo,
      categoryId,
      acquisitionDate,
      cost,
      condition,
      location,
      photo,
      documents,
      isBookable,
      departmentId,
      status
    } = req.body;

    // Check if asset exists
    const existingAsset = await prisma.asset.findUnique({
      where: { id }
    });

    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    // If updating serial number, check uniqueness
    if (serialNo && serialNo !== existingAsset.serialNo) {
      const duplicate = await prisma.asset.findFirst({
        where: { serialNo }
      });

      if (duplicate) {
        return res.status(400).json({ error: 'Serial number already exists' });
      }
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        name,
        serialNo,
        categoryId,
        acquisitionDate: acquisitionDate ? new Date(acquisitionDate) : null,
        cost: cost ? parseFloat(cost) : null,
        condition,
        location,
        photo,
        documents,
        isBookable: isBookable !== undefined ? isBookable : existingAsset.isBookable,
        departmentId: departmentId || null,
        status: status || existingAsset.status
      },
      include: {
        category: true,
        department: true,
        currentHolder: true
      }
    });

    res.json({
      message: 'Asset updated successfully',
      asset
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Update Asset Status
exports.updateAssetStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = ['AVAILABLE', 'ALLOCATED', 'RESERVED', 'UNDER_MAINTENANCE', 'LOST', 'RETIRED', 'DISPOSED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const asset = await prisma.asset.update({
      where: { id },
      data: { 
        status,
        // If marking as AVAILABLE, remove current holder
        ...(status === 'AVAILABLE' ? { currentHolderId: null } : {})
      },
      include: {
        category: true,
        currentHolder: true
      }
    });

    res.json({
      message: `Asset status updated to ${status}`,
      asset
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get asset history
exports.getAssetHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        tag: true,
        allocations: {
          orderBy: { createdAt: 'desc' },
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        maintenances: {
          orderBy: { createdAt: 'desc' },
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
            }
          }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Get asset by QR/Barcode (for scanning)
exports.getAssetByTag = async (req, res) => {
  try {
    const { tag } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { tag },
      include: {
        category: true,
        department: true,
        currentHolder: {
          select: {
            id: true,
            name: true,
            email: true,
            department: true
          }
        }
      }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Asset not found' });
    }

    res.json(asset);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete Asset (only if no allocations)
exports.deleteAsset = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if asset has any allocations
    const allocations = await prisma.allocation.count({
      where: { assetId: id }
    });

    if (allocations > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete asset with allocation history. Mark as retired/disposed instead.' 
      });
    }

    await prisma.asset.delete({
      where: { id }
    });

    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};
