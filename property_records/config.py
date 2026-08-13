"""
Configuration for South Sudan Government Property Record Management System
"""
import os

class Config:
    """Base configuration"""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'ss-property-record-2024')
    
    # Database
    DATABASE_URL = os.environ.get('DATABASE_URL', 'sqlite:///property_records.db')
    
    # Application
    PROPERTY_RECORD_PREFIX = 'SSPR'
    COUNTRY = 'South Sudan'
    CURRENCY = 'SSP'
    
    # States/Regions of South Sudan
    STATES = [
        'Central Equatoria',
        'Eastern Equatoria', 
        'Jonglei',
        'Lakes',
        'Northern Bahr el Ghazal',
        'Unity',
        'Upper Nile',
        'Warrap',
        'Western Bahr el Ghazal',
        'Western Equatoria'
    ]
    
    # Property Types
    PROPERTY_TYPES = [
        'Residential',
        'Commercial',
        'Industrial',
        'Agricultural',
        'Government',
        'Religious',
        'Educational',
        'Healthcare',
        'Vacant Land'
    ]
    
    # Ownership Types
    OWNERSHIP_TYPES = [
        'Freehold',
        'Leasehold',
        'Customary',
        'Government Owned',
        'Joint Ownership'
    ]
    
    # Document Types
    DOCUMENT_TYPES = [
        'Title Deed',
        'Lease Agreement',
        'Survey Plan',
        'Tax Certificate',
        'Transfer Document',
        'Mortgage Document',
        'Court Order',
        'Inheritance Document'
    ]
    
    # Transaction Types
    TRANSACTION_TYPES = [
        'Sale',
        'Purchase',
        'Transfer',
        'Lease',
        'Mortgage',
        'Subdivision',
        'Consolidation',
        'Inheritance',
        'Gift',
        'Government Allocation'
    ]
    
    # Pagination
    ITEMS_PER_PAGE = 20
    
    # File Upload
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER', 'uploads')
    ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'doc', 'docx'}


class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    DATABASE_URL = os.environ.get('DEV_DATABASE_URL', 'sqlite:///dev_property_records.db')


class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    DATABASE_URL = os.environ.get('DATABASE_URL')


class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DATABASE_URL = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False


config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
