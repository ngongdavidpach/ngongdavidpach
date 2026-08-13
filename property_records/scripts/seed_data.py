"""
Seed data for South Sudan Property Record Management System
"""
from datetime import datetime, timedelta
import random
from app import create_app
from models import db, User, Property, Owner, PropertyOwner, Document, Transaction, Dispute, AuditLog


def seed_data():
    """Create sample data for the system"""
    app = create_app('development')
    
    with app.app_context():
        # Clear existing data
        db.drop_all()
        db.create_all()
        
        # Create users
        print("Creating users...")
        users = [
            User(username='admin', email='admin@propertysouthsudan.gov.ss', 
                 first_name='System', last_name='Administrator',
                 phone='+211912345678', role='admin', state='Central Equatoria'),
            
            User(username='registrar', email='registrar@propertysouthsudan.gov.ss',
                 first_name='John', last_name='Madol',
                 phone='+211912345679', role='registrar', state='Central Equatoria'),
            
            User(username='clerk1', email='clerk1@propertysouthsudan.gov.ss',
                 first_name='Mary', last_name='Ayen',
                 phone='+211912345680', role='clerk', state='Jonglei'),
            
            User(username='clerk2', email='clerk2@propertysouthsudan.gov.ss',
                 first_name='Peter', last_name='Gatkuoth',
                 phone='+211912345681', role='clerk', state='Upper Nile'),
            
            User(username='viewer', email='viewer@propertysouthsudan.gov.ss',
                 first_name='Sarah', last_name='Deng',
                 phone='+211912345682', role='viewer', state='Lakes')
        ]
        
        for user in users:
            user.set_password('password123')
            db.session.add(user)
        
        db.session.commit()
        print(f"Created {len(users)} users")
        
        # Create owners
        print("Creating property owners...")
        owners = [
            Owner(owner_type='Individual', id_number='SSN-2001-001234',
                  first_name='James', last_name='Bol', name='James Bol',
                  phone='+211923456789', email='james.bol@email.com',
                  nationality='South Sudanese', gender='Male',
                  state='Central Equatoria', county='Juba'),
            
            Owner(owner_type='Individual', id_number='SSN-2001-001235',
                  first_name='Grace', last_name='Nyandeng', name='Grace Nyandeng',
                  phone='+211923456790', email='grace.nyandeng@email.com',
                  nationality='South Sudanese', gender='Female',
                  state='Central Equatoria', county='Juba'),
            
            Owner(owner_type='Organization', id_number='BR-2020-1234',
                  organization_name='Juba Construction Ltd', name='Juba Construction Ltd',
                  registration_number='BR-2020-1234', tax_id='TAX-2020-5678',
                  phone='+211923456791', email='info@jubaconstruct.com',
                  postal_address='P.O. Box 123, Juba',
                  state='Central Equatoria', county='Juba'),
            
            Owner(owner_type='Government', id_number='GOV-MIN-001',
                  organization_name='Ministry of Housing', name='Ministry of Housing',
                  registration_number='MIN-HSG-001',
                  phone='+211923456792', email='housing@gov.ss',
                  postal_address='P.O. Box 1, Juba',
                  state='Central Equatoria', county='Juba'),
            
            Owner(owner_type='Individual', id_number='SSN-2001-001236',
                  first_name='Daniel', last_name='Majok', name='Daniel Majok',
                  phone='+211923456793', email='daniel.majok@email.com',
                  nationality='South Sudanese', gender='Male',
                  state='Jonglei', county='Bor'),
            
            Owner(owner_type='Organization', id_number='BR-2021-5678',
                  organization_name='Nile Trading Company', name='Nile Trading Company',
                  registration_number='BR-2021-5678', tax_id='TAX-2021-9012',
                  phone='+211923456794', email='contact@niletrading.com',
                  postal_address='P.O. Box 456, Malakal',
                  state='Upper Nile', county='Malakal'),
            
            Owner(owner_type='Individual', id_number='SSN-2001-001237',
                  first_name='Rebecca', last_name='Garang', name='Rebecca Garang',
                  phone='+211923456795', email='rebecca.garang@email.com',
                  nationality='South Sudanese', gender='Female',
                  state='Lakes', county='Rumbek'),
            
            Owner(owner_type='Religious', id_number='CH-2019-001',
                  organization_name='St. Mary Cathedral', name='St. Mary Cathedral',
                  registration_number='CH-2019-001',
                  phone='+211923456796', email='stmary@catholic.ss',
                  postal_address='P.O. Box 789, Juba',
                  state='Central Equatoria', county='Juba')
        ]
        
        for owner in owners:
            db.session.add(owner)
        
        db.session.commit()
        print(f"Created {len(owners)} owners")
        
        # Create properties
        print("Creating properties...")
        states_counties = [
            ('Central Equatoria', 'Juba', 'Gudele', 'Kator'),
            ('Central Equatoria', 'Juba', 'Custom Area', 'New Site'),
            ('Central Equatoria', 'Juba', 'Hai Malakal', 'Block A'),
            ('Central Equatoria', 'Yei', 'Town Center', 'Market Street'),
            ('Jonglei', 'Bor', 'Town Center', 'Main Road'),
            ('Jonglei', 'Akobo', 'Market Area', 'River Side'),
            ('Upper Nile', 'Malakal', 'Port Area', 'Industrial Zone'),
            ('Upper Nile', 'Kodok', 'Historic Site', 'Palace Road'),
            ('Lakes', 'Rumbek', 'Town Center', 'Cathedral Road'),
            ('Unity', 'Bentiu', 'Oil Field Area', 'Company Town'),
            ('Northern Bahr el Ghazal', 'Aweil', 'Market Area', 'Trade Center'),
            ('Western Equatoria', 'Yambio', 'Agricultural Zone', 'Farm Road')
        ]
        
        property_types = ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Vacant Land']
        ownership_types = ['Freehold', 'Leasehold', 'Customary']
        
        properties = []
        for i in range(25):
            state, county, payam, boma = random.choice(states_counties)
            property_type = random.choice(property_types)
            ownership_type = random.choice(ownership_types)
            
            property = Property(
                property_number=f"SSPR-{i+1:06d}",
                title_number=f"TL-{state[:3].upper()}-{2020+i}-00{i+1:02d}",
                state=state,
                county=county,
                payam=payam,
                boma=boma,
                village=f"Village {i+1}",
                street=f"Street {chr(65+i)}",
                plot_number=f"PLOT-{i+1:03d}",
                block_number=f"BLK-{(i%10)+1:02d}",
                property_type=property_type,
                ownership_type=ownership_type,
                land_area_sqm=random.uniform(500, 5000),
                building_area_sqm=random.uniform(100, 1000) if property_type == 'Residential' else None,
                year_built=random.randint(1990, 2024) if property_type in ['Residential', 'Commercial'] else None,
                number_of_rooms=random.randint(2, 10) if property_type == 'Residential' else None,
                description=f"Sample property {i+1} in {county}",
                assessed_value=random.uniform(50000, 500000),
                market_value=random.uniform(100000, 1000000),
                annual_tax=random.uniform(5000, 50000),
                status=random.choice(['Active', 'Active', 'Active', 'Pending', 'Disputed']),
                latitude=random.uniform(4.0, 10.0),
                longitude=random.uniform(24.0, 36.0)
            )
            
            properties.append(property)
            db.session.add(property)
        
        db.session.commit()
        print(f"Created {len(properties)} properties")
        
        # Link owners to properties
        print("Linking owners to properties...")
        for i, property in enumerate(properties):
            # Assign 1-2 owners per property
            num_owners = random.randint(1, 2)
            selected_owners = random.sample(owners, min(num_owners, len(owners)))
            
            for j, owner in enumerate(selected_owners):
                share = 100.0 / len(selected_owners)
                property_owner = PropertyOwner(
                    property_id=property.id,
                    owner_id=owner.id,
                    ownership_share=share,
                    is_primary=(j == 0)
                )
                db.session.add(property_owner)
        
        db.session.commit()
        print("Created property-owner relationships")
        
        # Create transactions
        print("Creating transactions...")
        transaction_types = ['Sale', 'Transfer', 'Lease', 'Mortgage', 'Inheritance']
        statuses = ['Completed', 'Completed', 'Completed', 'Pending', 'Approved']
        
        for i in range(15):
            property = random.choice(properties)
            seller = random.choice(owners)
            buyer = random.choice([o for o in owners if o.id != seller.id])
            
            transaction = Transaction(
                transaction_number=f"TXN-{i+1:06d}",
                transaction_type=random.choice(transaction_types),
                property_id=property.id,
                seller_id=seller.id,
                buyer_id=buyer.id,
                transaction_date=datetime.utcnow() - timedelta(days=random.randint(1, 365)),
                transaction_amount=random.uniform(100000, 2000000),
                currency='SSP',
                payment_method=random.choice(['Cash', 'Bank Transfer', 'Mobile Money']),
                deed_number=f"DEED-{2020+i}-00{i+1:02d}",
                registration_date=datetime.utcnow() - timedelta(days=random.randint(1, 300)),
                stamp_duty_paid=random.uniform(5000, 50000),
                registration_fee=random.uniform(1000, 10000),
                status=random.choice(statuses),
                remarks=f"Transaction {i+1} remarks",
                created_by_id=random.choice(users).id
            )
            
            db.session.add(transaction)
        
        db.session.commit()
        print("Created 15 transactions")
        
        # Create disputes
        print("Creating disputes...")
        dispute_types = ['Boundary', 'Ownership', 'Inheritance', 'Fraud']
        dispute_statuses = ['Active', 'Pending', 'Resolved']
        
        for i in range(5):
            property = random.choice(properties)
            
            dispute = Dispute(
                case_number=f"DISP-{2023}-00{i+1:02d}",
                property_id=property.id,
                dispute_type=random.choice(dispute_types),
                description=f"Dispute case {i+1} regarding property {property.property_number}",
                filed_date=datetime.utcnow() - timedelta(days=random.randint(30, 200)),
                filed_by_id=random.choice(owners).id,
                complainant_id=random.choice(owners).id,
                respondent_id=random.choice([o for o in owners if o.id != random.choice(owners).id]).id if len(owners) > 1 else None,
                court_name=random.choice(['High Court - Central Equatoria', 'County Court - Jonglei', 'Customary Court']),
                court_case_number=f"CC-{2023}-00{i+1:02d}",
                hearing_date=datetime.utcnow() + timedelta(days=random.randint(10, 100)),
                status=random.choice(dispute_statuses),
                resolution="Case resolved through mediation" if random.random() > 0.5 else None
            )
            
            db.session.add(dispute)
        
        db.session.commit()
        print("Created 5 disputes")
        
        # Create documents
        print("Creating documents...")
        document_types = ['Title Deed', 'Survey Plan', 'Tax Certificate', 'Transfer Document']
        
        for i, property in enumerate(properties[:10]):
            doc = Document(
                document_number=f"DOC-{2024}-00{i+1:03d}",
                document_type=random.choice(document_types),
                property_id=property.id,
                file_name=f"document_{i+1}.pdf",
                file_size=random.randint(100000, 5000000),
                mime_type='application/pdf',
                description=f"Document for property {property.property_number}",
                issue_date=datetime.utcnow() - timedelta(days=random.randint(100, 500)),
                issuing_authority='Ministry of Justice',
                is_verified=random.choice([True, False]),
                uploaded_by_id=random.choice(users).id
            )
            
            db.session.add(doc)
        
        db.session.commit()
        print("Created documents")
        
        # Create audit logs
        print("Creating audit logs...")
        for i in range(20):
            audit = AuditLog(
                user_id=random.choice(users).id,
                action=random.choice(['CREATE', 'UPDATE', 'VIEW', 'LOGIN']),
                entity_type=random.choice(['Property', 'Owner', 'Transaction']),
                entity_id=random.randint(1, 25),
                ip_address=f"192.168.1.{random.randint(1, 254)}",
                user_agent='Mozilla/5.0'
            )
            db.session.add(audit)
        
        db.session.commit()
        print("Created audit logs")
        
        print("\n✅ Seed data created successfully!")
        print("\nDemo credentials:")
        print("  Username: admin | Password: password123")
        print("  Username: registrar | Password: password123")
        print("  Username: clerk1 | Password: password123")


if __name__ == '__main__':
    seed_data()
