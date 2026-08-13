#!/usr/bin/env python3
"""
South Sudan Government Property Record Management System
Run script
"""
from app import create_app

app = create_app('development')

if __name__ == '__main__':
    print("=" * 60)
    print("South Sudan Government Property Record Management System")
    print("=" * 60)
    print("\nStarting development server...")
    print("Access the application at: http://localhost:5000")
    print("\nDemo credentials:")
    print("  Username: admin      Password: password123")
    print("  Username: registrar  Password: password123")
    print("  Username: clerk1     Password: password123")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
