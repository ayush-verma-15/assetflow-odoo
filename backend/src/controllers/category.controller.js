const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.createCategory = async (req, res) => {
  try {
    const { name, customFields } = req.body;

    const existing = await prisma.assetCategory.findUnique({
      where: { name }
    });

    if (existing) {
      return res.status(400).json({ error: 'Category already exists' });
    }

    const category = await prisma.assetCategory.create({
      data: {
        name,
        customFields: customFields || {}
      }
    });

    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany({
      include: {
        assets: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json(categories);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await prisma.assetCategory.findUnique({
      where: { id },
      include: {
        assets: true
      }
    });

    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, customFields } = req.body;

    const category = await prisma.assetCategory.update({
      where: { id },
      data: {
        name,
        customFields
      }
    });

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category has assets
    const assets = await prisma.asset.count({
      where: { categoryId: id }
    });

    if (assets > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete category with assets' 
      });
    }

    await prisma.assetCategory.delete({
      where: { id }
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
};
