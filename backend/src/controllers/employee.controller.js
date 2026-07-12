const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all employees with filters
exports.getEmployees = async (req, res) => {
  try {
    const { departmentId, role, status } = req.query;

    const where = {};
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;
    if (status) where.status = status;

    const employees = await prisma.user.findMany({
      where,
      include: {
        department: true,
        allocatedAssets: {
          include: {
            asset: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(employees);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Get single employee
exports.getEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        allocatedAssets: {
          include: {
            asset: true
          }
        },
        bookings: true,
        maintenanceRaised: true
      }
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Promote employee (Admin only)
exports.promoteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { role, departmentId } = req.body;

    // Validate role
    const validRoles = ['ADMIN', 'ASSET_MANAGER', 'DEPARTMENT_HEAD', 'EMPLOYEE'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // If promoting to DEPARTMENT_HEAD, check if department exists
    if (role === 'DEPARTMENT_HEAD' && departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId }
      });
      if (!department) {
        return res.status(404).json({ error: 'Department not found' });
      }
    }

    const employee = await prisma.user.update({
      where: { id },
      data: {
        role,
        departmentId: departmentId || undefined
      },
      include: {
        department: true
      }
    });

    // If promoting to DEPARTMENT_HEAD, update department head
    if (role === 'DEPARTMENT_HEAD' && departmentId) {
      await prisma.department.update({
        where: { id: departmentId },
        data: { headId: id }
      });
    }

    res.json({
      message: `Employee promoted to ${role}`,
      employee
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Update employee status (Active/Inactive)
exports.updateEmployeeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const employee = await prisma.user.update({
      where: { id },
      data: { status },
      include: {
        department: true
      }
    });

    res.json({
      message: `Employee status updated to ${status}`,
      employee
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

// Delete employee (soft delete - set inactive)
exports.deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if employee has allocated assets
    const assets = await prisma.asset.count({
      where: { currentHolderId: id }
    });

    if (assets > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete employee with allocated assets. Set inactive instead.' 
      });
    }

    await prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' }
    });

    res.json({ message: 'Employee deactivated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};