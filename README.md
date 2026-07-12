# 🚀 AssetFlow - Enterprise Asset & Resource Management System

## 📌 Overview

AssetFlow is a modern Enterprise Asset & Resource Management System built for the Odoo Hackathon. It helps organizations efficiently manage physical assets, shared resources, maintenance workflows, audit cycles, and employee allocations through a centralized ERP platform.

The application eliminates manual asset tracking by providing real-time visibility, secure role-based access, structured approval workflows, and insightful dashboards.

---

# 🎯 Problem Statement

Organizations often rely on spreadsheets or paper records to manage assets, resulting in:

- Duplicate asset allocation
- Resource booking conflicts
- Lack of asset visibility
- Manual maintenance tracking
- Inefficient audit processes

AssetFlow solves these challenges with a scalable ERP solution that provides a complete lifecycle management system for assets and shared resources.

---

# ✨ Key Features

- 🔐 Secure Authentication & Role-Based Access
- 🏢 Organization Setup (Departments, Categories, Employees)
- 📦 Asset Registration & Lifecycle Tracking
- 👨‍💼 Employee Asset Allocation
- 🔄 Asset Transfer Workflow
- 📅 Resource Booking with Conflict Detection
- 🛠 Maintenance Approval Workflow
- 📋 Asset Audit Management
- 📊 Dashboard & Analytics
- 🔔 Notifications & Activity Logs
- 📈 Reports & Export

---

# 🛠 Tech Stack

## Frontend

- React.js
- Tailwind CSS
- React Router
- Axios
- React Query

## Backend

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT Authentication

## Tools

- Git & GitHub
- Postman
- VS Code

---

# 📁 Project Structure

```text
AssetFlow/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── constants/
│   │   ├── controllers/
│   │   ├── middlewares/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── app.js
│   │   └── server.js
│   │
│   ├── uploads/
│   ├── package.json
│   └── .env
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   ├── layouts/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── docs/
├── screenshots/
├── README.md
└── .gitignore
```

---

# 👥 User Roles

| Role | Responsibilities |
|------|------------------|
| **Admin** | Manage organization, departments, categories, employees, reports and audit cycles |
| **Asset Manager** | Register assets, allocate assets, approve transfers, maintenance requests and returns |
| **Department Head** | View department assets, approve department requests and book resources |
| **Employee** | View allocated assets, book shared resources, raise maintenance requests and request transfers/returns |

---

# 🏗 Development Workflow

## Phase 1

Project Setup

- Repository Setup
- Backend Initialization
- Frontend Initialization
- Database Design

---

## Phase 2

Authentication

- Login
- Signup
- JWT
- Protected Routes

---

## Phase 3

Organization Module

- Departments
- Asset Categories
- Employee Directory

---

## Phase 4

Asset Module

- Register Asset
- Asset Directory
- Search & Filters
- Asset History

---

## Phase 5

Allocation Module

- Allocate Asset
- Return Asset
- Transfer Workflow

---

## Phase 6

Booking Module

- Calendar Booking
- Conflict Validation
- Booking History

---

## Phase 7

Maintenance Module

- Raise Request
- Approval Workflow
- Resolution Tracking

---

## Phase 8

Audit Module

- Audit Cycle
- Verification
- Discrepancy Reports

---

## Phase 9

Reports & Dashboard

- KPI Dashboard
- Analytics
- Reports
- Notifications

---

# 📱 Screen-wise Implementation Plan

| Screen | Owner | Backend APIs | Frontend |
|---------|--------|--------------|----------|
| Authentication | Ayush | `/auth/*` | Login, Signup |
| Dashboard | Ayush | `/dashboard/*` | Dashboard |
| Organization Setup | Anuj | `/departments`, `/categories`, `/employees` | Organization |
| Asset Directory | Rohan | `/assets/*` | Asset Directory |
| Allocation & Transfer | Vaibhav | `/allocations`, `/transfers` | Allocation |
| Resource Booking | Rohan | `/bookings/*` | Booking |
| Maintenance | Anuj | `/maintenance/*` | Maintenance |
| Audit | Ayush | `/audit/*` | Audit |
| Reports | Vaibhav | `/reports/*` | Reports |
| Notifications | Vaibhav | `/notifications`, `/logs` | Notifications |

---

# 👨‍💻 Team Responsibilities

## Ayush Verma(Team Lead)

- Project Architecture
- Authentication
- Dashboard
- Audit Module
- API Integration

---

## Nishankh Nehewal

- Organization Setup
- Departments
- Employees
- Maintenance Module

---

## Rohan

- Asset Management
- Resource Booking
- Search & Filters

---

## Vaibhav Upadhyay

- Asset Allocation
- Transfers
- Reports
- Notifications
- Deployment

---

# 🚀 Future Enhancements

- QR Code Asset Tracking
- AI Asset Assistant
- Predictive Maintenance
- Email Notifications
- Mobile Responsive PWA
- Barcode Scanner
- Real-time Notifications

---

# 📄 License

This project was developed for the **Odoo Hackathon** as an educational and demonstration ERP solution.

---

# ❤️ Team AssetFlow

Built with dedication for the Odoo Hackathon.
