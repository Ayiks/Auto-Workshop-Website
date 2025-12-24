# Auto Workshop Website & Sales Management System

A web-based platform designed to manage an auto workshop’s public presence, material sales, inventory tracking, mechanic job reporting, and invoice generation.

This system consists of a **public-facing website** and a **secured internal management system** with role-based access.

---

## 📌 Project Purpose

The goal of this project is to:
- Provide an online presence for the auto workshop
- Digitize material sales and inventory management
- Enable real-time sales entry via iPad
- Automatically calculate sales, stock levels, and profit
- Allow mechanics to report jobs and generate invoices

---

## 🧱 System Overview

The platform is divided into two main components:

### 1. Public Website
- Displays services offered
- Allows customers to submit booking requests
- Accessible without authentication

### 2. Internal Management System
Accessible only to authorized users:
- **Admin** – manages materials, pricing, reports, and oversight
- **Sales User** – handles material sales via iPad
- **Mechanic User** – reports car problems and generates invoices

Both components share a common backend and database but are separated by authentication and user roles.

---

## 📄 Documentation

The project is governed by the following core documents:

- **Product Requirements Document (PRD)**  
  Defines *what* the system should do and the agreed scope.  
  📄 `docs/PRD.md`

- **Engineering Design Document (EDD)**  
  Defines *how* the system is designed and implemented technically.  
  📄 `docs/EDD.md`

> ⚠️ Any feature or change not described in the PRD must be treated as a change request.

---

## 👥 User Roles

| Role | Description |
|-----|------------|
| Public Visitor | Views services and submits booking requests |
| Admin | Manages materials, pricing, stock, reports, and invoices |
| Sales User | Sells materials and records transactions |
| Mechanic User | Reports car problems and generates invoices |

---

## ⚙️ Core Features

- Role-based authentication and authorization
- Materials and inventory management
- Low-stock alerts for finishing materials
- iPad-optimized sales interface
- Automatic sales and profit calculations
- Mechanic job reporting
- Invoice generation and printing
- Daily, weekly, and monthly sales reports

---

## 🚫 Out of Scope

The following are **explicitly excluded** from this project:
- Online payment processing
- Native mobile applications
- SMS or email notifications
- Third-party accounting integrations
- Hosting and infrastructure management

---

## 🧪 Testing & Quality

- Unit tests for business logic (sales, profit, inventory)
- Integration tests for key workflows
- Manual usability testing (especially iPad sales flow)

Testing strategies are detailed in the **EDD**.

---

## 🛠 Repository Structure

```text
project-root/
│
├── docs/
│   ├── PRD.md        # Product Requirements Document
│   ├── EDD.md        # Engineering Design Document
│
├── frontend/         # Public website & internal UI
├── backend/          # API, business logic, authentication
└── README.md
