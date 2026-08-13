"""
South Sudan Government Property Record Management System
Main Application Factory
"""
import os
from datetime import datetime
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify, session
from flask_login import LoginManager, UserMixin, login_user, logout_user, login_required, current_user
from config import config
from models import db, User, Property, Owner, PropertyOwner, Document, Transaction, Dispute, AuditLog


def create_app(config_name='development'):
    """Application factory"""
    app = Flask(__name__, 
                template_folder='templates',
                static_folder='static')
    
    # Load configuration
    app.config.from_object(config[config_name])
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    
    # Ensure database URI is set
    if not app.config.get('SQLALCHEMY_DATABASE_URI'):
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///property_records.db'
    
    # Initialize extensions
    db.init_app(app)
    
    # Setup Flask-Login
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'login'
    login_manager.login_message = 'Please log in to access this page.'
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    # Register routes
    register_routes(app)
    
    return app


def register_routes(app):
    """Register all application routes"""
    
    @app.route('/')
    @login_required
    def index():
        """Dashboard"""
        # Statistics
        total_properties = Property.query.count()
        total_owners = Owner.query.count()
        pending_transactions = Transaction.query.filter_by(status='Pending').count()
        active_disputes = Dispute.query.filter_by(status='Active').count()
        
        # Recent properties
        recent_properties = Property.query.order_by(Property.registered_date.desc()).limit(5).all()
        
        # Recent transactions
        recent_transactions = Transaction.query.order_by(Transaction.transaction_date.desc()).limit(5).all()
        
        return render_template('dashboard.html',
                             total_properties=total_properties,
                             total_owners=total_owners,
                             pending_transactions=pending_transactions,
                             active_disputes=active_disputes,
                             recent_properties=recent_properties,
                             recent_transactions=recent_transactions)
    
    @app.route('/login', methods=['GET', 'POST'])
    def login():
        """User login"""
        if request.method == 'POST':
            username = request.form.get('username')
            password = request.form.get('password')
            
            user = User.query.filter_by(username=username).first()
            
            if user and user.check_password(password) and user.is_active:
                login_user(user)
                user.last_login = datetime.utcnow()
                db.session.commit()
                
                # Log login
                audit_log = AuditLog(
                    user_id=user.id,
                    action='LOGIN',
                    entity_type='User',
                    entity_id=user.id,
                    ip_address=request.remote_addr
                )
                db.session.add(audit_log)
                
                next_page = request.args.get('next')
                return redirect(next_page or url_for('index'))
            else:
                flash('Invalid username or password', 'error')
        
        return render_template('login.html')
    
    @app.route('/logout')
    @login_required
    def logout():
        """User logout"""
        audit_log = AuditLog(
            user_id=current_user.id,
            action='LOGOUT',
            entity_type='User',
            entity_id=current_user.id,
            ip_address=request.remote_addr
        )
        db.session.add(audit_log)
        db.session.commit()
        
        logout_user()
        return redirect(url_for('login'))
    
    @app.route('/properties')
    @login_required
    def properties():
        """List all properties with search and filters"""
        # Get query parameters
        state = request.args.get('state')
        county = request.args.get('county')
        property_type = request.args.get('property_type')
        status = request.args.get('status')
        search = request.args.get('search')
        page = request.args.get('page', 1, type=int)
        
        # Build query
        query = Property.query
        
        if state:
            query = query.filter_by(state=state)
        if county:
            query = query.filter_by(county=county)
        if property_type:
            query = query.filter_by(property_type=property_type)
        if status:
            query = query.filter_by(status=status)
        if search:
            query = query.filter(
                (Property.property_number.ilike(f'%{search}%')) |
                (Property.title_number.ilike(f'%{search}%')) |
                (Property.description.ilike(f'%{search}%')) |
                (Property.street.ilike(f'%{search}%'))
            )
        
        # Order and paginate
        query = query.order_by(Property.property_number)
        pagination = query.paginate(page=page, per_page=20, error_out=False)
        properties = pagination.items
        
        return render_template('properties.html',
                             properties=properties,
                             pagination=pagination,
                             states=app.config['STATES'],
                             property_types=app.config['PROPERTY_TYPES'],
                             current_filters={
                                 'state': state,
                                 'county': county,
                                 'property_type': property_type,
                                 'status': status,
                                 'search': search
                             })
    
    @app.route('/property/<int:property_id>')
    @login_required
    def property_detail(property_id):
        """View property details"""
        property = Property.query.get_or_404(property_id)
        
        # Get owners
        owners = PropertyOwner.query.filter_by(property_id=property_id).all()
        
        # Get documents
        documents = Document.query.filter_by(property_id=property_id).all()
        
        # Get transactions
        transactions = Transaction.query.filter_by(property_id=property_id).order_by(Transaction.transaction_date.desc()).all()
        
        # Get disputes
        disputes = Dispute.query.filter_by(property_id=property_id).all()
        
        return render_template('property_detail.html',
                             property=property,
                             owners=owners,
                             documents=documents,
                             transactions=transactions,
                             disputes=disputes)
    
    @app.route('/property/new', methods=['GET', 'POST'])
    @login_required
    def new_property():
        """Register new property"""
        if request.method == 'POST':
            try:
                # Generate property number
                last_property = Property.query.order_by(Property.id.desc()).first()
                next_num = (last_property.id + 1) if last_property else 1
                property_number = f"{app.config['PROPERTY_RECORD_PREFIX']}-{next_num:06d}"
                
                property = Property(
                    property_number=property_number,
                    title_number=request.form.get('title_number'),
                    state=request.form.get('state'),
                    county=request.form.get('county'),
                    payam=request.form.get('payam'),
                    boma=request.form.get('boma'),
                    village=request.form.get('village'),
                    street=request.form.get('street'),
                    plot_number=request.form.get('plot_number'),
                    block_number=request.form.get('block_number'),
                    property_type=request.form.get('property_type'),
                    ownership_type=request.form.get('ownership_type'),
                    land_area_sqm=float(request.form.get('land_area_sqm') or 0),
                    building_area_sqm=float(request.form.get('building_area_sqm') or 0),
                    year_built=int(request.form.get('year_built') or 0),
                    number_of_rooms=int(request.form.get('number_of_rooms') or 0),
                    description=request.form.get('description'),
                    assessed_value=float(request.form.get('assessed_value') or 0),
                    market_value=float(request.form.get('market_value') or 0),
                    annual_tax=float(request.form.get('annual_tax') or 0),
                    latitude=float(request.form.get('latitude') or 0),
                    longitude=float(request.form.get('longitude') or 0),
                    updated_by_id=current_user.id
                )
                
                db.session.add(property)
                db.session.commit()
                
                # Audit log
                audit_log = AuditLog(
                    user_id=current_user.id,
                    action='CREATE',
                    entity_type='Property',
                    entity_id=property.id,
                    new_values=str(property.to_dict()),
                    ip_address=request.remote_addr
                )
                db.session.add(audit_log)
                db.session.commit()
                
                flash(f'Property {property_number} registered successfully!', 'success')
                return redirect(url_for('property_detail', property_id=property.id))
                
            except Exception as e:
                db.session.rollback()
                flash(f'Error registering property: {str(e)}', 'error')
        
        return render_template('property_form.html',
                             states=app.config['STATES'],
                             property_types=app.config['PROPERTY_TYPES'],
                             ownership_types=app.config['OWNERSHIP_TYPES'])
    
    @app.route('/owners')
    @login_required
    def owners():
        """List all property owners"""
        search = request.args.get('search')
        owner_type = request.args.get('owner_type')
        page = request.args.get('page', 1, type=int)
        
        query = Owner.query
        
        if owner_type:
            query = query.filter_by(owner_type=owner_type)
        if search:
            query = query.filter(
                (Owner.name.ilike(f'%{search}%')) |
                (Owner.id_number.ilike(f'%{search}%')) |
                (Owner.organization_name.ilike(f'%{search}%'))
            )
        
        query = query.order_by(Owner.name)
        pagination = query.paginate(page=page, per_page=20, error_out=False)
        owners = pagination.items
        
        return render_template('owners.html',
                             owners=owners,
                             pagination=pagination,
                             current_filters={'search': search, 'owner_type': owner_type})
    
    @app.route('/owner/<int:owner_id>')
    @login_required
    def owner_detail(owner_id):
        """View owner details"""
        owner = Owner.query.get_or_404(owner_id)
        property_owners = PropertyOwner.query.filter_by(owner_id=owner_id).all()
        
        return render_template('owner_detail.html',
                             owner=owner,
                             property_owners=property_owners)
    
    @app.route('/transactions')
    @login_required
    def transactions():
        """List all transactions"""
        status = request.args.get('status')
        transaction_type = request.args.get('transaction_type')
        page = request.args.get('page', 1, type=int)
        
        query = Transaction.query
        
        if status:
            query = query.filter_by(status=status)
        if transaction_type:
            query = query.filter_by(transaction_type=transaction_type)
        
        query = query.order_by(Transaction.transaction_date.desc())
        pagination = query.paginate(page=page, per_page=20, error_out=False)
        transactions = pagination.items
        
        return render_template('transactions.html',
                             transactions=transactions,
                             pagination=pagination,
                             transaction_types=app.config['TRANSACTION_TYPES'],
                             current_filters={'status': status, 'transaction_type': transaction_type})
    
    @app.route('/transaction/new', methods=['GET', 'POST'])
    @login_required
    def new_transaction():
        """Register new transaction"""
        if request.method == 'POST':
            try:
                # Generate transaction number
                last_transaction = Transaction.query.order_by(Transaction.id.desc()).first()
                next_num = (last_transaction.id + 1) if last_transaction else 1
                transaction_number = f"TXN-{next_num:06d}"
                
                transaction = Transaction(
                    transaction_number=transaction_number,
                    transaction_type=request.form.get('transaction_type'),
                    property_id=int(request.form.get('property_id')),
                    seller_id=int(request.form.get('seller_id')) if request.form.get('seller_id') else None,
                    buyer_id=int(request.form.get('buyer_id')) if request.form.get('buyer_id') else None,
                    transaction_amount=float(request.form.get('transaction_amount') or 0),
                    payment_method=request.form.get('payment_method'),
                    deed_number=request.form.get('deed_number'),
                    stamp_duty_paid=float(request.form.get('stamp_duty_paid') or 0),
                    registration_fee=float(request.form.get('registration_fee') or 0),
                    remarks=request.form.get('remarks'),
                    created_by_id=current_user.id
                )
                
                db.session.add(transaction)
                db.session.commit()
                
                # Audit log
                audit_log = AuditLog(
                    user_id=current_user.id,
                    action='CREATE',
                    entity_type='Transaction',
                    entity_id=transaction.id,
                    new_values=str(transaction.to_dict()),
                    ip_address=request.remote_addr
                )
                db.session.add(audit_log)
                db.session.commit()
                
                flash(f'Transaction {transaction_number} registered successfully!', 'success')
                return redirect(url_for('transaction_detail', transaction_id=transaction.id))
                
            except Exception as e:
                db.session.rollback()
                flash(f'Error registering transaction: {str(e)}', 'error')
        
        # Get properties and owners for form
        properties = Property.query.filter_by(status='Active').all()
        owners = Owner.query.all()
        
        return render_template('transaction_form.html',
                             properties=properties,
                             owners=owners,
                             transaction_types=app.config['TRANSACTION_TYPES'])
    
    @app.route('/transaction/<int:transaction_id>')
    @login_required
    def transaction_detail(transaction_id):
        """View transaction details"""
        transaction = Transaction.query.get_or_404(transaction_id)
        return render_template('transaction_detail.html', transaction=transaction)
    
    @app.route('/disputes')
    @login_required
    def disputes():
        """List all disputes"""
        status = request.args.get('status')
        page = request.args.get('page', 1, type=int)
        
        query = Dispute.query
        
        if status:
            query = query.filter_by(status=status)
        
        query = query.order_by(Dispute.filed_date.desc())
        pagination = query.paginate(page=page, per_page=20, error_out=False)
        disputes_list = pagination.items
        
        return render_template('disputes.html',
                             disputes=disputes_list,
                             pagination=pagination,
                             current_filters={'status': status})
    
    @app.route('/reports')
    @login_required
    def reports():
        """Reports and analytics"""
        # Properties by state
        properties_by_state = db.session.query(
            Property.state, db.func.count(Property.id)
        ).group_by(Property.state).all()
        
        # Properties by type
        properties_by_type = db.session.query(
            Property.property_type, db.func.count(Property.id)
        ).group_by(Property.property_type).all()
        
        # Transactions by type
        transactions_by_type = db.session.query(
            Transaction.transaction_type, db.func.count(Transaction.id)
        ).group_by(Transaction.transaction_type).all()
        
        # Monthly transactions (last 12 months)
        from sqlalchemy import func
        monthly_transactions = db.session.query(
            func.strftime('%Y-%m', Transaction.transaction_date),
            db.func.count(Transaction.id)
        ).group_by(
            func.strftime('%Y-%m', Transaction.transaction_date)
        ).order_by(
            func.strftime('%Y-%m', Transaction.transaction_date)
        ).limit(12).all()
        
        return render_template('reports.html',
                             properties_by_state=properties_by_state,
                             properties_by_type=properties_by_type,
                             transactions_by_type=transactions_by_type,
                             monthly_transactions=monthly_transactions)
    
    @app.route('/api/properties')
    @login_required
    def api_properties():
        """API endpoint for properties"""
        properties = Property.query.limit(100).all()
        return jsonify([p.to_dict() for p in properties])
    
    @app.route('/api/owners')
    @login_required
    def api_owners():
        """API endpoint for owners"""
        owners = Owner.query.limit(100).all()
        return jsonify([o.to_dict() for o in owners])
    
    @app.errorhandler(404)
    def not_found_error(error):
        return render_template('error.html', error='Page Not Found'), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return render_template('error.html', error='Internal Server Error'), 500
