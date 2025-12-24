# Product Requirements Document (PRD)
## Auto Workshop Website & Sales Management System

**Product Type:** Web Application  
**Prepared By:** Clifford Sarpong  
**Version:** 1.0  
**Status:** Final Client Requirements  
**Last Updated:** 2025-12-24  

---

## 1. Product Overview

The system consists of two connected components:

1. **Public Website**  
   A marketing website that displays services and allows customers to make booking requests.

2. **Internal Sales & Workshop System**  
   A secured web application used by staff to manage materials, sales, mechanic reports, and invoices.

Both components share the same backend, but access is restricted based on authentication and user roles.

---

## 2. Goals & Objectives

- Establish an online presence for the workshop
- Digitize material sales and inventory tracking
- Support real-time sales entry using an iPad
- Automatically calculate sales, stock, and profits
- Enable mechanics to report jobs and generate invoices

---

## 3. User Roles & Access Levels

### 3.1 Public Visitor
- View services
- View workshop information
- Submit booking requests

_No authentication required._

---

### 3.2 Admin

**Capabilities:**
- Login / Logout
- Add and manage materials:
  - Name
  - Cost price
  - Selling price
  - Quantity
- Update material prices and costs
- View low-stock (finishing) materials
- View sales reports:
  - Daily
  - Weekly
  - Monthly
- View profit calculations
- View mechanic job reports
- View invoices

---

### 3.3 Sales User

**Capabilities:**
- Login / Logout
- Sell materials via a simple, iPad-friendly interface
- Handle multiple customers consecutively
- For each customer:
  - Select materials
  - Enter quantities
  - View automatically calculated totals
- System automatically:
  - Updates remaining stock
  - Calculates daily, weekly, and monthly sales
  - Calculates profit per transaction

---

### 3.4 Mechanic User

**Capabilities:**
- Login / Logout
- Report car problems
- Enter client and car details
- List required items (“Things to Buy”)
- Generate invoices for clients
- View previous job records

---

## 4. Functional Requirements

### 4.1 Public Website Module
- Homepage
- Services page
- Booking request form
- Contact information

---

### 4.2 Authentication & Authorization
- Secure login and logout
- Role-based access control
- Users can only access features permitted by their role

---

### 4.3 Materials & Inventory Management
- Admin can add and update materials
- Each material includes:
  - Cost price
  - Selling price
  - Quantity
- System flags materials that are finishing (low stock)
- Stock updates automatically after each sale

---

### 4.4 Sales Module (iPad Optimized)
- Touch-friendly sales interface
- Support for multiple customers back-to-back
- Each sale generates:
  - Individual total
  - Timestamped record
- Automatic calculations:
  - Remaining stock
  - Total sales per day/week/month
  - Profit per sale and cumulative profit

---

### 4.5 Mechanic Job Reporting
- Record car problems and diagnostics
- Associate jobs with mechanics
- Attach “Things to Buy” list
- Track job status

---

### 4.6 Invoice Management
- Generate invoices from mechanic jobs
- Invoice includes:
  - Client details
  - Materials used
  - Labour charges
  - Total amount
- Printable invoice format

---

## 5. Non-Functional Requirements

- Web-based and responsive (desktop & iPad)
- Secure handling of user data
- Accurate and reliable calculations
- Easy-to-use interface for non-technical users
- Suitable performance for daily workshop operations

---

## 6. Out of Scope

The following features are explicitly excluded:
- Online payments
- Native mobile applications
- SMS or email notifications
- Third-party accounting integrations
- Hosting and server management

Any feature not listed in this document will be treated as a **change request**.

---

## 7. Assumptions & Constraints

- Client provides hosting and domain
- Users are trained internally
- Active internet connection is required
- iPad accesses the system via a web browser

---

## 8. Success Criteria

The project is considered successful when:
- Materials and inventory are accurately tracked
- Stock updates correctly after sales
- Admins can view clear sales and profit reports
- Mechanics can easily generate invoices
- Staff can use the system with minimal training

---

## 9. Change Management

- Any change or new feature request after PRD approval:
  - Must be documented
  - Will be costed separately
  - Requires explicit approval before implementation

---

## 10. Approval & Sign-Off

This document represents the final agreed requirements for the system.

**Client Name:** ___________________________  
**Signature:** ___________________________  
**Date:** ___________________________  
