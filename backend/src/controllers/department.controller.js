const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

exports.createDepartment = async (req, res) => {
  try {
    const { name, parentId, headId } = req.body;

    const existing = await prisma.department.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({ error: 'Department already exists' });
    }

    if (headId) {
      const user = await prisma.user.findUnique({
        where: { id: headId }
      });
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
    }

    const department = await prisma.department.create({
      data: {
        name,
        parentId: parentId || null,
        headId: headId || null
      },
      include: {
        parent: true,
        head: true,
        members: true
      }
    });

    if (headId) {
      await prisma.user.update({
        where: { id: headId },
        data: {
          departmentId: department.id,
          role: 'DEPARTMENT_HEAD'
        }
      });
    }

    res.status(201).json(department);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: {
        parent: true,
        head: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        members: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        assets: true,
        auditCycles: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        parent: true,
        head: true,
        members: true,
        assets: true
      }
    });

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parentId, headId, status } = req.body;

    const department = await prisma.department.update({
      where: { id },
      data: {
        name,
        parentId: parentId || null,
        headId: headId || null,
        status
      },
      include: {
        head: true,
        parent: true
      }
    });

    if (headId) {
      await prisma.user.update({
        where: { id: headId },
        data: {
          departmentId: id,
          role: 'DEPARTMENT_HEAD'
        }
      });
    }

    res.json(department);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const assets = await prisma.asset.count({
      where: { departmentId: id }
    });

    if (assets > 0) {
      return res.status(400).json({
        error: 'Cannot delete department with assets. Deactivate instead.'
      });
    }

    await prisma.department.delete({
      where: { id }
    });

    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
