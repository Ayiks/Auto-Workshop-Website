# Engineering Design Document (EDD)
## Auto Workshop Website & Sales Management System

**Version:** 1.0  
**Status:** Technical Specification  
**Prepared By:** Engineering Team  
**Date:** December 24, 2025  
**Based on PRD:** v1.0 by Clifford Sarpong

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Design](#3-database-design)
4. [API Design](#4-api-design)
5. [Security Architecture](#5-security-architecture)
6. [User Interface Design](#6-user-interface-design)
7. [Business Logic Implementation](#7-business-logic-implementation)
8. [Error Handling & Validation](#8-error-handling--validation)
9. [Performance Considerations](#9-performance-considerations)
10. [Deployment Architecture](#10-deployment-architecture)
11. [Testing Strategy](#11-testing-strategy)
12. [Monitoring & Maintenance](#12-monitoring--maintenance)
13. [Security Checklist](#13-security-checklist)
14. [Migration & Training Plan](#14-migration--training-plan)
15. [Risk Assessment & Mitigation](#15-risk-assessment--mitigation)
16. [Future Enhancements](#16-future-enhancements)
17. [Success Metrics](#17-success-metrics)
18. [Project Timeline](#18-project-timeline)
19. [Appendices](#19-appendices)

---

## 1. Executive Summary

This document outlines the technical architecture, system design, and implementation approach for the Auto Workshop Website & Sales Management System. The system comprises a public-facing marketing website and an authenticated internal management system for sales, inventory, and mechanic operations.

**Core Technical Goals:**
- Scalable web architecture supporting concurrent users
- Real-time inventory synchronization
- Role-based access control (RBAC)
- Touch-optimized interface for iPad usage
- Automated financial calculations with audit trail

---

## 2. System Architecture

### 2.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Desktop    │  │     iPad     │  │   Mobile     │      │
│  │   Browser    │  │   Browser    │  │   Browser    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Application Layer                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Web Application Server                     │   │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐     │   │
│  │  │   Public   │  │    Auth    │  │  Internal  │     │   │
│  │  │   Routes   │  │  Middleware│  │   Routes   │     │   │
│  │  └────────────┘  └────────────┘  └────────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Business Logic Layer                      │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐       │
│  │Material │  │  Sales  │  │Mechanic │  │ Invoice │       │
│  │ Service │  │ Service │  │ Service │  │ Service │       │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘       │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                     Data Layer                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │            Relational Database (PostgreSQL)           │   │
│  │  ┌────────┐  ┌────────┐  ┌────────┐  ┌────────┐     │   │
│  │  │ Users  │  │Materials│ │ Sales  │  │  Jobs  │     │   │
│  │  └────────┘  └────────┘  └────────┘  └────────┘     │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Technology Stack

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- Framework: React.js or Vue.js for dynamic UI
- UI Library: Tailwind CSS for responsive design
- State Management: Redux or Vuex
- Touch optimization: Hammer.js for iPad gestures

**Backend:**
- Runtime: Node.js with Express.js framework
- Alternative: Python with Django/Flask
- Authentication: JWT (JSON Web Tokens)
- Session Management: Redis for session storage

**Database:**
- Primary: PostgreSQL (relational data integrity)
- Caching: Redis for performance optimization

**Hosting Requirements:**
- Web Server: Nginx as reverse proxy
- Application Server: PM2 for Node.js process management
- SSL/TLS: Let's Encrypt certificates

---

## 3. Database Design

### 3.1 Entity Relationship Diagram

```
┌─────────────┐
│    Users    │
├─────────────┤
│ id (PK)     │
│ username    │
│ password    │
│ role        │
│ created_at  │
│ is_active   │
└─────────────┘
       │
       │ (creates)
       ▼
┌─────────────────┐
│   Materials     │
├─────────────────┤
│ id (PK)         │
│ name            │
│ cost_price      │
│ selling_price   │
│ quantity        │
│ low_stock_level │
│ created_by (FK) │
│ created_at      │
│ updated_at      │
└─────────────────┘
       │
       │ (used in)
       ▼
┌─────────────────────┐         ┌─────────────────┐
│   Sales             │         │   SaleItems     │
├─────────────────────┤         ├─────────────────┤
│ id (PK)             │────────>│ id (PK)         │
│ sale_date           │         │ sale_id (FK)    │
│ total_amount        │         │ material_id (FK)│
│ total_profit        │         │ quantity        │
│ sold_by (FK)        │         │ unit_price      │
│ created_at          │         │ cost_price      │
└─────────────────────┘         │ subtotal        │
                                 │ profit          │
                                 └─────────────────┘

┌─────────────────────┐         ┌─────────────────┐
│   Jobs              │         │ JobMaterials    │
├─────────────────────┤         ├─────────────────┤
│ id (PK)             │────────>│ id (PK)         │
│ client_name         │         │ job_id (FK)     │
│ client_phone        │         │ material_name   │
│ car_make            │         │ quantity        │
│ car_model           │         │ estimated_cost  │
│ car_reg_number      │         │ is_purchased    │
│ problem_description │         └─────────────────┘
│ status              │
│ mechanic_id (FK)    │
│ created_at          │
│ updated_at          │
└─────────────────────┘
       │
       │ (generates)
       ▼
┌─────────────────────┐
│   Invoices          │
├─────────────────────┤
│ id (PK)             │
│ job_id (FK)         │
│ invoice_number      │
│ materials_cost      │
│ labour_cost         │
│ total_amount        │
│ invoice_date        │
│ created_by (FK)     │
└─────────────────────┘

┌─────────────────────┐
│   Bookings          │
├─────────────────────┤
│ id (PK)             │
│ client_name         │
│ client_email        │
│ client_phone        │
│ service_type        │
│ preferred_date      │
│ message             │
│ status              │
│ created_at          │
└─────────────────────┘
```

### 3.2 Database Schema Details

**Users Table:**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'sales', 'mechanic')),
    full_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

**Materials Table:**
```sql
CREATE TABLE materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    selling_price DECIMAL(10,2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    low_stock_level INTEGER DEFAULT 10,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    CONSTRAINT positive_prices CHECK (cost_price >= 0 AND selling_price >= 0),
    CONSTRAINT positive_quantity CHECK (quantity >= 0)
);
```

**Sales & SaleItems Tables:**
```sql
CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    total_amount DECIMAL(10,2) NOT NULL,
    total_profit DECIMAL(10,2) NOT NULL,
    sold_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sale_items (
    id SERIAL PRIMARY KEY,
    sale_id INTEGER REFERENCES sales(id) ON DELETE CASCADE,
    material_id INTEGER REFERENCES materials(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    profit DECIMAL(10,2) NOT NULL,
    CONSTRAINT positive_sale_quantity CHECK (quantity > 0)
);
```

**Jobs & JobMaterials Tables:**
```sql
CREATE TABLE jobs (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    client_phone VARCHAR(20),
    client_email VARCHAR(100),
    car_make VARCHAR(50),
    car_model VARCHAR(50),
    car_reg_number VARCHAR(20),
    problem_description TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' 
        CHECK (status IN ('pending', 'in_progress', 'completed', 'invoiced')),
    mechanic_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE job_materials (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id) ON DELETE CASCADE,
    material_name VARCHAR(100) NOT NULL,
    quantity INTEGER NOT NULL,
    estimated_cost DECIMAL(10,2),
    is_purchased BOOLEAN DEFAULT false
);
```

**Invoices Table:**
```sql
CREATE TABLE invoices (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES jobs(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    materials_cost DECIMAL(10,2) DEFAULT 0,
    labour_cost DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) NOT NULL,
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INTEGER REFERENCES users(id),
    notes TEXT
);
```

**Bookings Table:**
```sql
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    client_name VARCHAR(100) NOT NULL,
    client_email VARCHAR(100),
    client_phone VARCHAR(20) NOT NULL,
    service_type VARCHAR(100),
    preferred_date DATE,
    message TEXT,
    status VARCHAR(20) DEFAULT 'new' 
        CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. API Design

### 4.1 Authentication Endpoints

```
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/verify
POST   /api/auth/refresh-token
```

**Example: Login Request**
```json
POST /api/auth/login
{
  "username": "admin",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "fullName": "John Doe"
  }
}
```

### 4.2 Materials Management Endpoints

```
GET    /api/materials              (List all materials)
POST   /api/materials              (Create material - Admin only)
GET    /api/materials/:id          (Get single material)
PUT    /api/materials/:id          (Update material - Admin only)
DELETE /api/materials/:id          (Soft delete - Admin only)
GET    /api/materials/low-stock    (Get low stock items - Admin only)
```

**Example: Create Material**
```json
POST /api/materials
Headers: { "Authorization": "Bearer <token>" }
{
  "name": "Engine Oil 5W-30",
  "costPrice": 45.00,
  "sellingPrice": 65.00,
  "quantity": 50,
  "lowStockLevel": 10
}

Response:
{
  "success": true,
  "material": {
    "id": 23,
    "name": "Engine Oil 5W-30",
    "costPrice": 45.00,
    "sellingPrice": 65.00,
    "quantity": 50,
    "lowStockLevel": 10,
    "createdAt": "2025-12-24T10:30:00Z"
  }
}
```

### 4.3 Sales Endpoints

```
POST   /api/sales                  (Create new sale - Sales user)
GET    /api/sales                  (List sales with filters - Admin)
GET    /api/sales/:id              (Get sale details)
GET    /api/sales/reports/daily    (Daily report - Admin)
GET    /api/sales/reports/weekly   (Weekly report - Admin)
GET    /api/sales/reports/monthly  (Monthly report - Admin)
```

**Example: Create Sale**
```json
POST /api/sales
Headers: { "Authorization": "Bearer <token>" }
{
  "items": [
    {
      "materialId": 23,
      "quantity": 2
    },
    {
      "materialId": 45,
      "quantity": 1
    }
  ]
}

Response:
{
  "success": true,
  "sale": {
    "id": 156,
    "saleDate": "2025-12-24T14:22:00Z",
    "totalAmount": 195.00,
    "totalProfit": 50.00,
    "items": [
      {
        "materialName": "Engine Oil 5W-30",
        "quantity": 2,
        "unitPrice": 65.00,
        "subtotal": 130.00,
        "profit": 40.00
      },
      {
        "materialName": "Air Filter",
        "quantity": 1,
        "unitPrice": 65.00,
        "subtotal": 65.00,
        "profit": 10.00
      }
    ]
  },
  "updatedStock": [
    { "materialId": 23, "newQuantity": 48 },
    { "materialId": 45, "newQuantity": 24 }
  ]
}
```

### 4.4 Jobs & Mechanic Endpoints

```
POST   /api/jobs                   (Create job - Mechanic)
GET    /api/jobs                   (List jobs - Mechanic/Admin)
GET    /api/jobs/:id               (Get job details)
PUT    /api/jobs/:id               (Update job - Mechanic)
POST   /api/jobs/:id/materials     (Add materials to buy)
```

### 4.5 Invoice Endpoints

```
POST   /api/invoices               (Generate invoice - Mechanic)
GET    /api/invoices               (List invoices - Admin/Mechanic)
GET    /api/invoices/:id           (Get invoice details)
GET    /api/invoices/:id/print     (Printable invoice)
```

### 4.6 Public Endpoints (No Auth Required)

```
GET    /api/public/services        (List services)
POST   /api/public/bookings        (Submit booking request)
GET    /api/public/contact         (Contact information)
```

---

## 5. Security Architecture

### 5.1 Authentication & Authorization

**JWT Token Structure:**
```json
{
  "userId": 1,
  "username": "admin",
  "role": "admin",
  "iat": 1703422800,
  "exp": 1703509200
}
```

**Token Lifecycle:**
- Access Token: 8 hours expiry
- Refresh Token: 7 days expiry
- Stored in httpOnly cookies (not localStorage for security)

**Role-Based Access Control Matrix:**

| Feature | Admin | Sales | Mechanic |
|---------|-------|-------|----------|
| View Materials | ✓ | ✓ | ✗ |
| Add/Edit Materials | ✓ | ✗ | ✗ |
| Process Sales | ✓ | ✓ | ✗ |
| View Sales Reports | ✓ | ✗ | ✗ |
| Create Jobs | ✓ | ✗ | ✓ |
| Generate Invoices | ✓ | ✗ | ✓ |
| View All Jobs | ✓ | ✗ | ✓ (own only) |

### 5.2 Data Security Measures

**Password Security:**
- Hashing: bcrypt with salt rounds = 12
- Minimum password length: 8 characters
- Password complexity requirements enforced

**SQL Injection Prevention:**
- Parameterized queries exclusively
- ORM usage (Sequelize or TypeORM)
- Input validation and sanitization

**XSS Prevention:**
- Content Security Policy headers
- Output encoding
- React/Vue automatic escaping

**CSRF Protection:**
- CSRF tokens for state-changing operations
- SameSite cookie attribute

---

## 6. User Interface Design

### 6.1 Public Website Structure

**Pages:**
1. Home (`/`)
   - Hero section with service highlights
   - Featured services
   - Call-to-action for booking

2. Services (`/services`)
   - Comprehensive service listing
   - Service descriptions and pricing (if applicable)

3. Booking (`/booking`)
   - Form with validation
   - Service selection dropdown
   - Date picker for preferred appointment

4. Contact (`/contact`)
   - Address, phone, email
   - Google Maps integration (optional)

### 6.2 Internal Dashboard Layout

**Admin Dashboard:**
```
┌─────────────────────────────────────────────────────┐
│  Auto Workshop Admin                    [Logout]    │
├─────────────────────────────────────────────────────┤
│  Dashboard | Materials | Sales | Reports | Jobs     │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│  │ Total Sales  │  │ Today Profit │  │ Low Stock│ │
│  │   $4,250     │  │    $850      │  │    5     │ │
│  └──────────────┘  └──────────────┘  └──────────┘ │
│                                                      │
│  Recent Sales                                        │
│  ┌────────────────────────────────────────────────┐│
│  │ Date       | Items | Amount | Profit | User    ││
│  │ Dec 24 2PM |   3   | $195   | $50    | John    ││
│  │ Dec 24 1PM |   5   | $320   | $85    | Sarah   ││
│  └────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────┘
```

**Sales Interface (iPad Optimized):**
```
┌─────────────────────────────────────────────────────┐
│  New Sale                               [Logout]    │
├─────────────────────────────────────────────────────┤
│                                                      │
│  Select Material:                                    │
│  ┌────────────────────────────────────────────────┐│
│  │ [Search materials...]                   🔍     ││
│  └────────────────────────────────────────────────┘│
│                                                      │
│  Cart:                                               │
│  ┌────────────────────────────────────────────────┐│
│  │ Engine Oil 5W-30     x2    $130.00     [x]    ││
│  │ Air Filter           x1    $65.00      [x]    ││
│  └────────────────────────────────────────────────┘│
│                                                      │
│  ┌────────────────────────────────────────────────┐│
│  │ TOTAL:                            $195.00      ││
│  │ PROFIT:                           $50.00       ││
│  └────────────────────────────────────────────────┘│
│                                                      │
│  [ Complete Sale ]        [ Clear Cart ]            │
└─────────────────────────────────────────────────────┘
```

### 6.3 Responsive Design Breakpoints

- Mobile: 320px - 767px
- Tablet/iPad: 768px - 1024px
- Desktop: 1025px+

### 6.4 Touch Optimization for iPad

- Minimum touch target: 44x44px
- Swipe gestures for navigation
- Large, easily tappable buttons
- Auto-complete for material search
- Number pad optimization for quantity input

---

## 7. Business Logic Implementation

### 7.1 Sales Processing Workflow

```
1. User selects materials and quantities
   ↓
2. System validates:
   - Material exists and is active
   - Sufficient stock available
   ↓
3. System calculates:
   - Line item totals (quantity × selling price)
   - Line item profits (quantity × (selling_price - cost_price))
   - Sale total
   - Sale total profit
   ↓
4. BEGIN TRANSACTION
   - Create sale record
   - Create sale_items records
   - Update material quantities (decrement)
   - Log transaction
5. COMMIT TRANSACTION
   ↓
6. Return success with updated stock levels
```

**Key Business Rules:**
- Stock cannot go negative
- Prices locked at time of sale (historical accuracy)
- All sales are logged with timestamp and user
- Profit calculated per item and aggregated

### 7.2 Inventory Management Logic

**Low Stock Detection:**
```javascript
function checkLowStock() {
  return materials.filter(m => m.quantity <= m.lowStockLevel);
}
```

**Stock Update Transaction:**
```sql
BEGIN TRANSACTION;

-- Decrement stock
UPDATE materials 
SET quantity = quantity - :soldQuantity,
    updated_at = CURRENT_TIMESTAMP
WHERE id = :materialId 
  AND quantity >= :soldQuantity;

-- Verify update succeeded
IF (ROWS_AFFECTED = 0) THEN
  ROLLBACK;
  RAISE EXCEPTION 'Insufficient stock';
END IF;

COMMIT;
```

### 7.3 Report Generation Logic

**Daily Sales Report:**
```sql
SELECT 
  DATE(s.sale_date) as date,
  COUNT(s.id) as transaction_count,
  SUM(s.total_amount) as total_sales,
  SUM(s.total_profit) as total_profit,
  AVG(s.total_amount) as avg_transaction
FROM sales s
WHERE DATE(s.sale_date) = :reportDate
GROUP BY DATE(s.sale_date);
```

**Weekly/Monthly Reports:**
- Aggregate by date ranges
- Include breakdown by material categories
- Track profit margins
- Identify top-selling items

### 7.4 Invoice Generation Logic

```
1. Retrieve job details
   ↓
2. Calculate materials cost:
   - Sum of job_materials.estimated_cost
   ↓
3. Input labour cost (manual entry by mechanic)
   ↓
4. Calculate total: materials_cost + labour_cost
   ↓
5. Generate unique invoice number:
   Format: INV-YYYYMMDD-XXXX
   ↓
6. Create invoice record
   ↓
7. Update job status to 'invoiced'
   ↓
8. Return printable invoice
```

---

## 8. Error Handling & Validation

### 8.1 Input Validation Rules

**Material Creation:**
- Name: Required, 3-100 characters
- Cost Price: Required, positive decimal
- Selling Price: Required, must be ≥ cost price
- Quantity: Required, non-negative integer
- Low Stock Level: Optional, default 10

**Sales Transaction:**
- Items array: Required, minimum 1 item
- Material ID: Must exist and be active
- Quantity: Positive integer, must not exceed stock

**Job Creation:**
- Client Name: Required, 3-100 characters
- Problem Description: Required, minimum 10 characters
- Car details: Optional but recommended

### 8.2 Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Cannot complete sale. Insufficient stock for Engine Oil 5W-30",
    "details": {
      "materialId": 23,
      "requested": 10,
      "available": 5
    }
  }
}
```

### 8.3 Common Error Codes

- `AUTH_REQUIRED`: Authentication token missing
- `AUTH_INVALID`: Invalid or expired token
- `ACCESS_DENIED`: Insufficient permissions
- `VALIDATION_ERROR`: Input validation failed
- `INSUFFICIENT_STOCK`: Stock quantity too low
- `RESOURCE_NOT_FOUND`: Requested resource doesn't exist
- `DUPLICATE_ENTRY`: Unique constraint violation
- `DATABASE_ERROR`: Database operation failed

---

## 9. Performance Considerations

### 9.1 Database Optimization

**Indexes:**
```sql
-- Users
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- Materials
CREATE INDEX idx_materials_active ON materials(is_active);
CREATE INDEX idx_materials_low_stock ON materials(quantity, low_stock_level);

-- Sales
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_sold_by ON sales(sold_by);

-- Sale Items
CREATE INDEX idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX idx_sale_items_material_id ON sale_items(material_id);

-- Jobs
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_mechanic ON jobs(mechanic_id);
CREATE INDEX idx_jobs_created ON jobs(created_at);
```

**Query Optimization:**
- Use database connection pooling
- Implement pagination for large result sets
- Cache frequently accessed data (material list)
- Use prepared statements

### 9.2 Caching Strategy

**Redis Caching:**
- Material list: 5 minute TTL
- User session data: Session lifetime
- Daily/weekly report data: 1 hour TTL

**Cache Invalidation:**
- Material updates → Clear material cache
- Sales transactions → Clear report cache
- User logout → Clear session cache

### 9.3 Expected Load & Scalability

**Assumptions:**
- 5-10 concurrent users (peak)
- 50-200 sales transactions per day
- 20-50 job records per day
- Database size: ~1GB annually

**Scalability Considerations:**
- Vertical scaling sufficient for initial deployment
- Horizontal scaling possible if needed (load balancer + multiple app servers)
- Database read replicas for reporting queries

---

## 10. Deployment Architecture

### 10.1 Server Requirements

**Minimum Server Specifications:**
- CPU: 2 cores
- RAM: 4GB
- Storage: 50GB SSD
- OS: Ubuntu 22.04 LTS or similar

**Software Stack:**
- Node.js 18+ or Python 3.10+
- PostgreSQL 14+
- Nginx 1.20+
- Redis 7+
- PM2 for process management

### 10.2 Deployment Process

```
1. Provision server and domain
   ↓
2. Install dependencies:
   - Node.js/Python
   - PostgreSQL
   - Nginx
   - Redis
   - SSL certificates
   ↓
3. Clone application repository
   ↓
4. Configure environment variables:
   - Database credentials
   - JWT secret
   - Port numbers
   ↓
5. Run database migrations
   ↓
6. Seed initial admin user
   ↓
7. Build frontend assets
   ↓
8. Configure Nginx reverse proxy
   ↓
9. Start application with PM2
   ↓
10. Verify deployment and run tests
```

### 10.3 Environment Configuration

**.env File Structure:**
```
# Application
NODE_ENV=production
PORT=3000
APP_URL=https://autoworkshop.example.com

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=workshop_db
DB_USER=workshop_user
DB_PASSWORD=secure_password

# Authentication
JWT_SECRET=your_very_secure_secret_key
JWT_EXPIRY=8h
REFRESH_TOKEN_EXPIRY=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW=15m
RATE_LIMIT_MAX_REQUESTS=100
```

### 10.4 Backup Strategy

**Database Backups:**
- Daily automated backups at 2:00 AM
- Retention: 30 days
- Backup location: Off-server storage

**Application Backups:**
- Version control (Git repository)
- Configuration files backed up
- Log files rotated and archived

---

## 11. Testing Strategy

### 11.1 Unit Testing

**Backend Unit Tests:**
- Service layer functions
- Business logic calculations
- Data validation functions
- Target coverage: 80%+

**Tools:** Jest (Node.js) or pytest (Python)

### 11.2 Integration Testing

**Test Scenarios:**
- Complete sales workflow
- Material stock updates
- Job creation and invoice generation
- User authentication flow
- Report generation accuracy

### 11.3 User Acceptance Testing (UAT)

**Test Cases by Role:**

**Admin:**
- [ ] Add new material with all fields
- [ ] Update material prices
- [ ] View low stock alerts
- [ ] Generate daily/weekly/monthly reports
- [ ] Verify profit calculations

**Sales User:**
- [ ] Log in on iPad
- [ ] Process single-item sale
- [ ] Process multi-item sale
- [ ] Handle insufficient stock scenario
- [ ] Verify stock updates after sale

**Mechanic:**
- [ ] Create new job record
- [ ] Add materials to buy list
- [ ] Generate invoice for job
- [ ] View previous job history

### 11.4 Performance Testing

- Load testing: Simulate 20 concurrent users
- Stress testing: Determine breaking point
- Response time targets:
  - Page load: < 2 seconds
  - API responses: < 500ms
  - Sales transaction: < 1 second

---

## 12. Monitoring & Maintenance

### 12.1 Logging Strategy

**Application Logs:**
- Error logs: All exceptions and errors
- Access logs: All API requests
- Audit logs: All data modifications
- Authentication logs: Login attempts

**Log Format (JSON):**
```json
{
  "timestamp": "2025-12-24T14:22:00Z",
  "level": "info",
  "userId": 5,
  "action": "CREATE_SALE",
  "details": {
    "saleId": 156,
    "amount": 195.00,
    "itemCount": 2
  }
}
```

### 12.2 Monitoring Metrics

**System Metrics:**
- CPU usage
- Memory usage
- Disk space
- Database connections

**Application Metrics:**
- API response times
- Error rates
- Sales transactions per hour
- Active user sessions

**Business Metrics:**
- Daily sales volume
- Profit margins
- Low stock items count
- Pending jobs count

### 12.3 Maintenance Schedule

**Daily:**
- Check error logs
- Verify backup completion
- Monitor system resources

**Weekly:**
- Review performance metrics
- Check for low stock materials
- Verify database integrity

**Monthly:**
- Update dependencies and security patches
- Review and optimize slow queries
- Archive old data if necessary

---

## 13. Security Checklist

- [ ] HTTPS enforced on all pages
- [ ] Password hashing with bcrypt
- [ ] JWT tokens in httpOnly cookies
- [ ] CSRF protection implemented
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] Rate limiting on authentication endpoints
- [ ] Input validation on all endpoints
- [ ] Role-based access control enforced
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Database credentials secured
- [ ] Regular security updates applied
- [ ] Audit logging for sensitive operations
- [ ] Session timeout configured
- [ ] Failed login attempt tracking

---

## 14. Migration & Training Plan

### 14.1 Data Migration (If Applicable)

If migrating from existing systems:
1. Export existing material inventory
2. Map data to new schema
3. Import using migration scripts
4. Verify data integrity
5. Run parallel systems briefly

### 14.2 User Training Plan

**Admin Training (2 hours):**
- System overview
- Material management
- Report generation
- User management
- Troubleshooting basics

**Sales User Training (1 hour):**
- Login process
- Processing sales on iPad
- Handling errors
- End-of-day procedures

**Mechanic Training (1.5 hours):**
- Job creation
- Materials list management
- Invoice generation
- Viewing job history

### 14.3 Documentation Deliverables

1. User Manual (per role)
2. Admin Guide
3. API Documentation
4. Troubleshooting Guide
5. FAQ Document

---

## 15. Risk Assessment & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Data loss | Low | High | Daily backups, database replication |
| Unauthorized access | Medium | High | Strong authentication, audit logging |
| Server downtime | Medium | Medium | Monitoring, quick recovery procedures |
| Stock calculation errors | Low | High | Thorough testing, transaction integrity |
| iPad connectivity issues | Medium | Medium | Offline mode consideration, error handling |
| User adoption resistance | Medium | Medium | Training, simple UI design |

---

## 16. Future Enhancements (Post-MVP)

**Phase 2 Considerations:**
- SMS notifications for booking confirmations
- Email invoicing
- Mobile app (native)
- Barcode scanning for materials
- Customer portal for job status
- Integration with accounting software
- Multi-location support
- Advanced analytics dashboard
- Appointment scheduling system
- Customer loyalty program

---

## 17. Success Metrics

**Technical Metrics:**
- System uptime: > 99%
- API response time: < 500ms
- Zero data loss incidents
- < 5 critical bugs in first month

**Business Metrics:**
- Staff can complete sales transaction in < 30 seconds
- Report generation in < 5 seconds
- All staff trained within 2 weeks
- Positive user feedback score (> 4/5)

**Adoption Metrics:**
- 100% of sales recorded in system after launch
- Daily active users meets expected count
- Reduced manual record-keeping

---

## 18. Project Timeline Estimate

**Phase 1: Setup & Foundation (2 weeks)**
- Database design and setup
- Authentication system
- Basic UI framework

**Phase 2: Core Features (4 weeks)**
- Materials management
- Sales processing
- Inventory tracking

**Phase 3: Extended Features (3 weeks)**
- Job management
- Invoice generation
- Reporting system

**Phase 4: Testing & Refinement (2 weeks)**
- Integration testing
- UAT with client
- Bug fixes and optimization

**Phase 5: Deployment & Training (1 week)**
- Server setup
- Data migration (if needed)
- User training

**Total: 12 weeks (3 months)**

---

## 19. Appendices

### Appendix A: Glossary

- **Material**: Physical items sold or used in the workshop
- **Sale**: Transaction recording the sale of materials to customers
- **Job**: Work order for vehicle repair or service
- **Invoice**: Billing document generated for completed jobs
- **Low Stock**: Material quantity at or below defined threshold

### Appendix B: References

- PostgreSQL Documentation: https://www.postgresql.org/docs/
- JWT Best Practices: https://jwt.io/introduction
- OWASP Security Guidelines: https://owasp.org/
- React Documentation: https://react.dev/

### Appendix C: Contact Information

**Project Stakeholders:**
- Product Owner: Clifford Sarpong
- Technical Lead: [To be assigned]
- QA Lead: [To be assigned]

---

**Document Control:**
- Version: 1.0
- Status: Draft for Review
- Next Review Date: [To be scheduled]
- Change Log: Initial creation

_________________________
Development Team Lead
