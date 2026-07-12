const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

exports.promoteToDepartmentHead = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role, departmentId } = req.body;

    if (!role || !departmentId) {
      return res.status(400).json({
        success: false,
        message: 'Role and departmentId are required',
      });
    }

    if (role !== 'DEPARTMENT_HEAD') {
      return res.status(400).json({
        success: false,
        message: 'Only DEPARTMENT_HEAD role is supported for this endpoint',
      });
    }

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: 'Department not found',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'DEPARTMENT_HEAD',
        departmentId,
      },
    });

    return res.status(200).json({
      success: true,
      message: 'User promoted to department head',
      data: updatedUser,
    });
  } catch (error) {
    console.error('promoteToDepartmentHead error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to promote user',
      error: error.message,
    });
  }
};
