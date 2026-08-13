# South Sudan Government Property Record Management System

A comprehensive full-stack web application for managing government property records in the Republic of South Sudan.

## Features

- **Property Registration**: Register and manage properties across all 10 states of South Sudan
- **Owner Management**: Track individual, organizational, and government property owners
- **Transaction Recording**: Record sales, transfers, leases, mortgages, and other property transactions
- **Dispute Management**: Track and manage property disputes and legal cases
- **Reporting & Analytics**: Generate reports on property distribution, transactions, and valuations
- **Audit Trail**: Complete audit logging of all system activities
- **Role-Based Access**: Admin, Registrar, Clerk, and Viewer roles with appropriate permissions

## Technology Stack

- **Backend**: Python Flask
- **Database**: SQLite (development) / PostgreSQL (production)
- **Frontend**: HTML5, Tailwind CSS, JavaScript
- **Authentication**: Flask-Login

## Installation

### Prerequisites

- Python 3.8+
- pip

### Setup

1. Navigate to the project directory:
   ```bash
   cd property_records
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Initialize the database with sample data:
   ```bash
   python scripts/seed_data.py
   ```

4. Run the application:
   ```bash
   python run.py
   ```

5. Access the application at: http://localhost:5000

## Demo Credentials

| Username   | Password     | Role      |
|------------|--------------|-----------|
| admin      | password123  | Admin     |
| registrar  | password123  | Registrar |
| clerk1     | password123  | Clerk     |
| viewer     | password123  | Viewer    |

## Administrative Structure

The system supports all states of South Sudan:
- Central Equatoria
- Eastern Equatoria
- Jonglei
- Lakes
- Northern Bahr el Ghazal
- Unity
- Upper Nile
- Warrap
- Western Bahr el Ghazal
- Western Equatoria

## Property Types Supported

- Residential
- Commercial
- Industrial
- Agricultural
- Government
- Religious
- Educational
- Healthcare
- Vacant Land

## Ownership Types

- Freehold
- Leasehold
- Customary
- Government Owned
- Joint Ownership

## Transaction Types

- Sale
- Purchase
- Transfer
- Lease
- Mortgage
- Subdivision
- Consolidation
- Inheritance
- Gift
- Government Allocation

## API Endpoints

- `/api/properties` - Get property data
- `/api/owners` - Get owner data

## Project Structure

```
property_records/
├── app.py              # Main application
├── config.py           # Configuration settings
├── models.py           # Database models
├── run.py              # Application entry point
├── requirements.txt    # Python dependencies
├── templates/          # HTML templates
│   ├── base.html
│   ├── login.html
│   ├── dashboard.html
│   ├── properties.html
│   ├── property_detail.html
│   ├── property_form.html
│   ├── owners.html
│   ├── owner_detail.html
│   ├── transactions.html
│   ├── transaction_form.html
│   ├── transaction_detail.html
│   ├── disputes.html
│   ├── reports.html
│   └── error.html
└── scripts/
    └── seed_data.py    # Database seeding script
```

## Security Features

- Password hashing using Werkzeug
- CSRF protection
- Role-based access control
- Audit logging of all actions
- Session management

## License

Republic of South Sudan Government - Ministry of Housing and Physical Planning

## Support

For technical support, contact the IT Department, Ministry of Housing and Physical Planning.
