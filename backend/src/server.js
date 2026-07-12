const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Import Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const departmentRoutes = require('./routes/department.routes');
const categoryRoutes = require('./routes/category.routes');
const assetRoutes = require('./routes/asset.routes');
const allocationRoutes = require('./routes/allocation.routes');
const bookingRoutes = require('./routes/booking.routes');
const maintenanceRoutes = require('./routes/maintenance.routes');
const auditRoutes = require('./routes/audit.routes');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/allocations', allocationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/maintenances', maintenanceRoutes);
app.use('/api/audits', auditRoutes);

app.get('/', (req, res) => {
  res.json({ message: 'AssetFlow API is running!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
