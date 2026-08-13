"""
Database Models for South Sudan Government Property Record Management System
"""
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    """User model for system access"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), default='clerk', nullable=False)  # admin, registrar, clerk, viewer
    state = db.Column(db.String(50))  # Assigned state/region
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    
    # Relationships
    transactions_created = db.relationship('Transaction', backref='created_by', lazy='dynamic', foreign_keys='Transaction.created_by_id')
    audit_logs = db.relationship('AuditLog', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone': self.phone,
            'role': self.role,
            'state': self.state,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    def __repr__(self):
        return f'<User {self.username}>'


class Property(db.Model):
    """Property record model"""
    __tablename__ = 'properties'
    
    id = db.Column(db.Integer, primary_key=True)
    property_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    title_number = db.Column(db.String(50), unique=True, index=True)
    
    # Location Information
    state = db.Column(db.String(50), nullable=False, index=True)
    county = db.Column(db.String(50), nullable=False, index=True)
    payam = db.Column(db.String(50))
    boma = db.Column(db.String(50))
    village = db.Column(db.String(50))
    street = db.Column(db.String(100))
    plot_number = db.Column(db.String(30))
    block_number = db.Column(db.String(30))
    
    # Property Details
    property_type = db.Column(db.String(50), nullable=False)
    ownership_type = db.Column(db.String(50), nullable=False)
    land_area_sqm = db.Column(db.Float)
    building_area_sqm = db.Column(db.Float)
    year_built = db.Column(db.Integer)
    number_of_rooms = db.Column(db.Integer)
    description = db.Column(db.Text)
    
    # Valuation
    assessed_value = db.Column(db.Numeric(12, 2))
    market_value = db.Column(db.Numeric(12, 2))
    annual_tax = db.Column(db.Numeric(12, 2))
    
    # Status
    status = db.Column(db.String(20), default='Active', nullable=False)  # Active, Disputed, Inactive, Pending
    
    # Coordinates (for GIS integration)
    latitude = db.Column(db.Numeric(10, 8))
    longitude = db.Column(db.Numeric(11, 8))
    
    # Timestamps
    registered_date = db.Column(db.DateTime, default=datetime.utcnow)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    updated_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # Relationships
    owners = db.relationship('PropertyOwner', backref='property', lazy='dynamic', cascade='all, delete-orphan')
    documents = db.relationship('Document', backref='property', lazy='dynamic', cascade='all, delete-orphan')
    transactions = db.relationship('Transaction', backref='property', lazy='dynamic', cascade='all, delete-orphan')
    disputes = db.relationship('Dispute', backref='property', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_number': self.property_number,
            'title_number': self.title_number,
            'state': self.state,
            'county': self.county,
            'payam': self.payam,
            'boma': self.boma,
            'village': self.village,
            'street': self.street,
            'plot_number': self.plot_number,
            'block_number': self.block_number,
            'property_type': self.property_type,
            'ownership_type': self.ownership_type,
            'land_area_sqm': self.land_area_sqm,
            'building_area_sqm': self.building_area_sqm,
            'year_built': self.year_built,
            'number_of_rooms': self.number_of_rooms,
            'description': self.description,
            'assessed_value': float(self.assessed_value) if self.assessed_value else None,
            'market_value': float(self.market_value) if self.market_value else None,
            'annual_tax': float(self.annual_tax) if self.annual_tax else None,
            'status': self.status,
            'latitude': float(self.latitude) if self.latitude else None,
            'longitude': float(self.longitude) if self.longitude else None,
            'registered_date': self.registered_date.isoformat() if self.registered_date else None
        }
    
    def __repr__(self):
        return f'<Property {self.property_number}>'


class Owner(db.Model):
    """Property owner (individual or organization)"""
    __tablename__ = 'owners'
    
    id = db.Column(db.Integer, primary_key=True)
    owner_type = db.Column(db.String(20), nullable=False)  # Individual, Organization, Government
    id_number = db.Column(db.String(50), index=True)  # National ID, Passport, Business Registration
    name = db.Column(db.String(200), nullable=False, index=True)
    
    # For individuals
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    date_of_birth = db.Column(db.Date)
    gender = db.Column(db.String(10))
    nationality = db.Column(db.String(50))
    
    # For organizations
    organization_name = db.Column(db.String(200))
    registration_number = db.Column(db.String(50))
    tax_id = db.Column(db.String(50))
    
    # Contact Information
    phone = db.Column(db.String(20))
    email = db.Column(db.String(120))
    postal_address = db.Column(db.String(200))
    state = db.Column(db.String(50))
    county = db.Column(db.String(50))
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    properties = db.relationship('PropertyOwner', backref='owner', lazy='dynamic', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'owner_type': self.owner_type,
            'id_number': self.id_number,
            'name': self.name,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'gender': self.gender,
            'nationality': self.nationality,
            'organization_name': self.organization_name,
            'registration_number': self.registration_number,
            'tax_id': self.tax_id,
            'phone': self.phone,
            'email': self.email,
            'postal_address': self.postal_address,
            'state': self.state,
            'county': self.county
        }
    
    def __repr__(self):
        return f'<Owner {self.name}>'


class PropertyOwner(db.Model):
    """Many-to-many relationship between Property and Owner with ownership details"""
    __tablename__ = 'property_owners'
    
    id = db.Column(db.Integer, primary_key=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), nullable=False)
    owner_id = db.Column(db.Integer, db.ForeignKey('owners.id'), nullable=False)
    ownership_share = db.Column(db.Numeric(5, 2), default=100.00)  # Percentage
    ownership_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_primary = db.Column(db.Boolean, default=False)
    notes = db.Column(db.Text)
    
    __table_args__ = (
        db.UniqueConstraint('property_id', 'owner_id', name='unique_property_owner'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'property_id': self.property_id,
            'owner_id': self.owner_id,
            'ownership_share': float(self.ownership_share) if self.ownership_share else None,
            'ownership_date': self.ownership_date.isoformat() if self.ownership_date else None,
            'is_primary': self.is_primary,
            'notes': self.notes
        }
    
    def __repr__(self):
        return f'<PropertyOwner Property:{self.property_id} Owner:{self.owner_id}>'


class Document(db.Model):
    """Documents related to property"""
    __tablename__ = 'documents'
    
    id = db.Column(db.Integer, primary_key=True)
    document_number = db.Column(db.String(50), unique=True, nullable=False)
    document_type = db.Column(db.String(50), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), nullable=False)
    file_path = db.Column(db.String(500))
    file_name = db.Column(db.String(200))
    file_size = db.Column(db.Integer)
    mime_type = db.Column(db.String(100))
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    uploaded_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    description = db.Column(db.Text)
    issue_date = db.Column(db.Date)
    expiry_date = db.Column(db.Date)
    issuing_authority = db.Column(db.String(100))
    is_verified = db.Column(db.Boolean, default=False)
    verified_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    verified_date = db.Column(db.DateTime)
    
    # Relationships
    verifier = db.relationship('User', foreign_keys=[verified_by_id])
    uploader = db.relationship('User', foreign_keys=[uploaded_by_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'document_number': self.document_number,
            'document_type': self.document_type,
            'property_id': self.property_id,
            'file_name': self.file_name,
            'file_size': self.file_size,
            'upload_date': self.upload_date.isoformat() if self.upload_date else None,
            'description': self.description,
            'issue_date': self.issue_date.isoformat() if self.issue_date else None,
            'expiry_date': self.expiry_date.isoformat() if self.expiry_date else None,
            'issuing_authority': self.issuing_authority,
            'is_verified': self.is_verified,
            'verified_date': self.verified_date.isoformat() if self.verified_date else None
        }
    
    def __repr__(self):
        return f'<Document {self.document_number}>'


class Transaction(db.Model):
    """Property transactions (sales, transfers, mortgages, etc.)"""
    __tablename__ = 'transactions'
    
    id = db.Column(db.Integer, primary_key=True)
    transaction_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    transaction_type = db.Column(db.String(50), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), nullable=False)
    
    # Parties involved
    seller_id = db.Column(db.Integer, db.ForeignKey('owners.id'))
    buyer_id = db.Column(db.Integer, db.ForeignKey('owners.id'))
    
    # Transaction Details
    transaction_date = db.Column(db.DateTime, default=datetime.utcnow)
    transaction_amount = db.Column(db.Numeric(12, 2))
    currency = db.Column(db.String(10), default='SSP')
    payment_method = db.Column(db.String(50))
    
    # Legal Details
    deed_number = db.Column(db.String(50))
    registration_date = db.Column(db.DateTime)
    stamp_duty_paid = db.Column(db.Numeric(12, 2))
    registration_fee = db.Column(db.Numeric(12, 2))
    
    # Status
    status = db.Column(db.String(20), default='Pending', nullable=False)  # Pending, Approved, Rejected, Completed
    remarks = db.Column(db.Text)
    
    # Audit
    created_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_by_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    approved_date = db.Column(db.DateTime)
    
    # Relationships
    seller = db.relationship('Owner', foreign_keys=[seller_id], backref='sales')
    buyer = db.relationship('Owner', foreign_keys=[buyer_id], backref='purchases')
    
    def to_dict(self):
        return {
            'id': self.id,
            'transaction_number': self.transaction_number,
            'transaction_type': self.transaction_type,
            'property_id': self.property_id,
            'seller_id': self.seller_id,
            'buyer_id': self.buyer_id,
            'transaction_date': self.transaction_date.isoformat() if self.transaction_date else None,
            'transaction_amount': float(self.transaction_amount) if self.transaction_amount else None,
            'currency': self.currency,
            'payment_method': self.payment_method,
            'deed_number': self.deed_number,
            'registration_date': self.registration_date.isoformat() if self.registration_date else None,
            'stamp_duty_paid': float(self.stamp_duty_paid) if self.stamp_duty_paid else None,
            'registration_fee': float(self.registration_fee) if self.registration_fee else None,
            'status': self.status,
            'remarks': self.remarks,
            'approved_date': self.approved_date.isoformat() if self.approved_date else None
        }
    
    def __repr__(self):
        return f'<Transaction {self.transaction_number}>'


class Dispute(db.Model):
    """Property disputes and legal cases"""
    __tablename__ = 'disputes'
    
    id = db.Column(db.Integer, primary_key=True)
    case_number = db.Column(db.String(50), unique=True, nullable=False, index=True)
    property_id = db.Column(db.Integer, db.ForeignKey('properties.id'), nullable=False)
    
    # Dispute Details
    dispute_type = db.Column(db.String(50), nullable=False)  # Boundary, Ownership, Inheritance, Fraud, etc.
    description = db.Column(db.Text, nullable=False)
    filed_date = db.Column(db.DateTime, default=datetime.utcnow)
    filed_by_id = db.Column(db.Integer, db.ForeignKey('owners.id'))
    
    # Parties
    complainant_id = db.Column(db.Integer, db.ForeignKey('owners.id'))
    respondent_id = db.Column(db.Integer, db.ForeignKey('owners.id'))
    
    # Court/Legal Details
    court_name = db.Column(db.String(100))
    court_case_number = db.Column(db.String(50))
    hearing_date = db.Column(db.DateTime)
    judgment_date = db.Column(db.DateTime)
    judgment_details = db.Column(db.Text)
    
    # Status
    status = db.Column(db.String(20), default='Active', nullable=False)  # Active, Resolved, Dismissed, Pending
    resolution = db.Column(db.Text)
    resolved_date = db.Column(db.DateTime)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    filed_by = db.relationship('Owner', foreign_keys=[filed_by_id], backref='filed_disputes')
    complainant = db.relationship('Owner', foreign_keys=[complainant_id], backref='complaints')
    respondent = db.relationship('Owner', foreign_keys=[respondent_id], backref='responses')
    
    def to_dict(self):
        return {
            'id': self.id,
            'case_number': self.case_number,
            'property_id': self.property_id,
            'dispute_type': self.dispute_type,
            'description': self.description,
            'filed_date': self.filed_date.isoformat() if self.filed_date else None,
            'filed_by_id': self.filed_by_id,
            'complainant_id': self.complainant_id,
            'respondent_id': self.respondent_id,
            'court_name': self.court_name,
            'court_case_number': self.court_case_number,
            'hearing_date': self.hearing_date.isoformat() if self.hearing_date else None,
            'judgment_date': self.judgment_date.isoformat() if self.judgment_date else None,
            'judgment_details': self.judgment_details,
            'status': self.status,
            'resolution': self.resolution,
            'resolved_date': self.resolved_date.isoformat() if self.resolved_date else None
        }
    
    def __repr__(self):
        return f'<Dispute {self.case_number}>'


class AuditLog(db.Model):
    """Audit trail for all system changes"""
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    action = db.Column(db.String(50), nullable=False)  # CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT
    entity_type = db.Column(db.String(50), nullable=False)  # Property, Owner, Transaction, etc.
    entity_id = db.Column(db.Integer)
    old_values = db.Column(db.Text)  # JSON of old values
    new_values = db.Column(db.Text)  # JSON of new values
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(200))
    
    def to_dict(self):
        return {
            'id': self.id,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None,
            'user_id': self.user_id,
            'action': self.action,
            'entity_type': self.entity_type,
            'entity_id': self.entity_id,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'ip_address': self.ip_address
        }
    
    def __repr__(self):
        return f'<AuditLog {self.action} {self.entity_type}:{self.entity_id}>'


class SearchHistory(db.Model):
    """Track search queries for analytics"""
    __tablename__ = 'search_history'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    query = db.Column(db.Text, nullable=False)
    filters = db.Column(db.Text)  # JSON of applied filters
    results_count = db.Column(db.Integer)
    searched_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'query': self.query,
            'filters': self.filters,
            'results_count': self.results_count,
            'searched_at': self.searched_at.isoformat() if self.searched_at else None
        }
    
    def __repr__(self):
        return f'<SearchHistory {self.query[:50]}>'
