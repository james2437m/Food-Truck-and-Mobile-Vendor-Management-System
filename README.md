# Food Truck and Mobile Vendor Management System

A comprehensive blockchain-based management system for food trucks and mobile vendors built on the Stacks blockchain using Clarity smart contracts.

## Overview

This system provides a decentralized platform for managing food truck operations, including permit tracking, health inspections, menu management, customer ordering, and event coordination. All data is stored on-chain ensuring transparency and immutability.

## Features

### Core Vendor Management
- Vendor registration and profile management
- Business license and permit tracking
- Location-based operations management
- Revenue and transaction tracking

### Permit and Location System
- Digital permit issuance and renewal
- Location scheduling and conflict resolution
- Geofenced operating zones
- Time-based location reservations

### Health Inspection Tracking
- Digital inspection records
- Food safety compliance monitoring
- Violation tracking and resolution
- Inspector certification verification

### Menu and Ordering System
- Dynamic menu management with real-time updates
- Inventory tracking and availability
- Customer pre-ordering system
- Payment processing and escrow

### Event Coordination
- Festival and event registration
- Vendor slot allocation
- Event-specific menu coordination
- Revenue sharing for event organizers

## Smart Contracts

The system consists of five main smart contracts:

1. **vendor-management.clar** - Core vendor registration and profile management
2. **permit-location.clar** - Permit tracking and location scheduling
3. **health-inspection.clar** - Health inspection records and compliance
4. **menu-ordering.clar** - Menu management and customer ordering
5. **event-coordination.clar** - Event management and vendor coordination

## Architecture

### Data Types
- **Vendor**: Business information, owner, status, ratings
- **Permit**: Type, expiration, issuing authority, compliance status
- **Location**: Coordinates, availability, restrictions, pricing
- **Inspection**: Date, inspector, violations, resolution status
- **Menu Item**: Name, price, availability, ingredients, allergens
- **Order**: Customer, items, total, status, pickup time
- **Event**: Name, date, location, vendor slots, revenue terms

### Key Functions
- Vendor registration and verification
- Permit application and renewal
- Location booking and scheduling
- Health inspection recording
- Menu item management
- Order placement and fulfillment
- Event creation and participation

## Security Features

- Multi-signature requirements for critical operations
- Role-based access control (vendors, inspectors, administrators)
- Escrow system for payments
- Dispute resolution mechanisms
- Audit trails for all transactions

## Getting Started

### Prerequisites
- Clarinet CLI installed
- Node.js and npm for testing
- Stacks wallet for deployment

### Installation
\`\`\`bash
git clone <repository-url>
cd food-truck-management
npm install
clarinet check
\`\`\`

### Testing
\`\`\`bash
npm test
\`\`\`

### Deployment
\`\`\`bash
clarinet deploy --testnet
\`\`\`

## Usage Examples

### Register a New Vendor
```clarity
(contract-call? .vendor-management register-vendor 
  "Tasty Tacos Truck" 
  "Best tacos in the city" 
  "123 Main St" 
  "contact@tastytacos.com")
