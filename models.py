"""AgriConnect Database Models.

Defines the core data models for the farm-to-market marketplace:
- Farmer: Rural producers who register harvests via SMS/USSD
- Buyer: Market buyers in Juba (NGOs, restaurants, wholesalers)
- ProduceListing: Available harvest posted by farmers
- Order: Purchase orders from buyers
- SMSLog: Audit trail of all SMS/USSD interactions
"""
from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


def utcnow():
    return datetime.now(timezone.utc)


class Farmer(db.Model):
    """A rural farmer registered in the AgriConnect system."""
    __tablename__ = "farmers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    location = db.Column(db.String(100), nullable=False)  # Village / County
    county = db.Column(db.String(80), nullable=False)  # State-level county
    registered_at = db.Column(db.DateTime, default=utcnow)
    is_active = db.Column(db.Boolean, default=True)
    language = db.Column(db.String(5), default="en")  # en, ar (Juba Arabic)

    # Relationships
    listings = db.relationship("ProduceListing", backref="farmer", lazy="dynamic")
    sms_logs = db.relationship("SMSLog", backref="farmer", lazy="dynamic")

    def __repr__(self):
        return f"<Farmer {self.name} ({self.phone})>"

    @property
    def active_listings(self):
        return self.listings.filter_by(is_active=True).all()

    @property
    def total_harvest_kg(self):
        return sum(l.quantity_kg for l in self.active_listings)


class Buyer(UserMixin, db.Model):
    """A buyer in the marketplace (NGO, restaurant, wholesaler, individual)."""
    __tablename__ = "buyers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    organization = db.Column(db.String(150))  # NGO name, restaurant name, etc.
    buyer_type = db.Column(db.String(30), nullable=False)  # ngo, restaurant, wholesaler, individual
    email = db.Column(db.String(120), unique=True, nullable=True)
    phone = db.Column(db.String(20), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    location = db.Column(db.String(100), default="Juba")
    is_active = db.Column(db.Boolean, default=True)
    registered_at = db.Column(db.DateTime, default=utcnow)

    # Relationships
    orders = db.relationship("Order", backref="buyer", lazy="dynamic")

    def __repr__(self):
        return f"<Buyer {self.name} ({self.organization or 'Individual'})>"

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class ProduceListing(db.Model):
    """A harvest listing posted by a farmer via SMS/USSD."""
    __tablename__ = "produce_listings"

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey("farmers.id"), nullable=False)

    # Produce details
    crop_name = db.Column(db.String(80), nullable=False)  # e.g., "Maize", "Sorghum", "Cassava"
    variety = db.Column(db.String(80))  # e.g., "White", "Red"
    quantity_kg = db.Column(db.Float, nullable=False)
    unit_price_ssp = db.Column(db.Float, nullable=False)  # Price per kg in SSP
    quality_grade = db.Column(db.String(20), default="standard")  # premium, standard, fair
    description = db.Column(db.String(300))

    # Logistics
    harvest_date = db.Column(db.Date)
    pickup_location = db.Column(db.String(150))
    delivery_available = db.Column(db.Boolean, default=False)

    # Status
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    expires_at = db.Column(db.DateTime)  # Auto-expire after 7 days

    # Relationships
    order_items = db.relationship("OrderItem", backref="listing", lazy="dynamic")

    def __repr__(self):
        return f"<Listing {self.crop_name} {self.quantity_kg}kg by Farmer#{self.farmer_id}>"

    @property
    def total_value_ssp(self):
        return self.quantity_kg * self.unit_price_ssp

    @property
    def is_expired(self):
        if self.expires_at:
            return datetime.now(timezone.utc) > self.expires_at.replace(tzinfo=timezone.utc)
        return False


class Order(db.Model):
    """A purchase order placed by a buyer."""
    __tablename__ = "orders"

    id = db.Column(db.Integer, primary_key=True)
    buyer_id = db.Column(db.Integer, db.ForeignKey("buyers.id"), nullable=False)
    order_number = db.Column(db.String(20), unique=True, nullable=False)

    # Status: pending, confirmed, in_transit, delivered, cancelled
    status = db.Column(db.String(20), default="pending")
    total_amount_ssp = db.Column(db.Float, default=0.0)

    notes = db.Column(db.String(300))
    delivery_address = db.Column(db.String(200))

    created_at = db.Column(db.DateTime, default=utcnow)
    updated_at = db.Column(db.DateTime, default=utcnow, onupdate=utcnow)
    confirmed_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)

    # Relationships
    items = db.relationship("OrderItem", backref="order", lazy="dynamic",
                            cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Order {self.order_number} ({self.status})>"

    def calculate_total(self):
        self.total_amount_ssp = sum(
            item.subtotal for item in self.items.all()
        )
        return self.total_amount_ssp


class OrderItem(db.Model):
    """An individual line item within an order."""
    __tablename__ = "order_items"

    id = db.Column(db.Integer, primary_key=True)
    order_id = db.Column(db.Integer, db.ForeignKey("orders.id"), nullable=False)
    listing_id = db.Column(db.Integer, db.ForeignKey("produce_listings.id"), nullable=False)
    quantity_kg = db.Column(db.Float, nullable=False)
    unit_price_ssp = db.Column(db.Float, nullable=False)

    @property
    def subtotal(self):
        return self.quantity_kg * self.unit_price_ssp


class SMSLog(db.Model):
    """Audit log for all SMS/USSD interactions."""
    __tablename__ = "sms_logs"

    id = db.Column(db.Integer, primary_key=True)
    farmer_id = db.Column(db.Integer, db.ForeignKey("farmers.id"), nullable=True)
    direction = db.Column(db.String(10), nullable=False)  # inbound, outbound
    channel = db.Column(db.String(10), nullable=False)  # sms, ussd, whatsapp
    phone = db.Column(db.String(20), nullable=False)
    message = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text)
    processed = db.Column(db.Boolean, default=True)
    error = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, default=utcnow)

    def __repr__(self):
        return f"<SMSLog {self.direction} {self.channel} {self.phone}>"


# ── Common crop catalog for South Sudan ──────────────────────────────
CROP_CATALOG = {
    "maize": {"name": "Maize", "aliases": ["corn", "maize"], "category": "grain"},
    "sorghum": {"name": "Sorghum", "aliases": ["sorghum", "dura"], "category": "grain"},
    "millet": {"name": "Millet", "aliases": ["millet"], "category": "grain"},
    "rice": {"name": "Rice", "aliases": ["rice"], "category": "grain"},
    "cassava": {"name": "Cassava", "aliases": ["cassava", "manioc"], "category": "tuber"},
    "groundnut": {"name": "Groundnut", "aliases": ["groundnut", "peanut"], "category": "legume"},
    "sesame": {"name": "Sesame", "aliases": ["sesame", "simsim"], "category": "oilseed"},
    "beans": {"name": "Beans", "aliases": ["beans"], "category": "legume"},
    "tomato": {"name": "Tomato", "aliases": ["tomato", "tomatoes"], "category": "vegetable"},
    "onion": {"name": "Onion", "aliases": ["onion", "onions"], "category": "vegetable"},
    "okra": {"name": "Okra", "aliases": ["okra"], "category": "vegetable"},
    "mango": {"name": "Mango", "aliases": ["mango", "mangoes"], "category": "fruit"},
    "banana": {"name": "Banana", "aliases": ["banana", "bananas"], "category": "fruit"},
    "sweet_potato": {"name": "Sweet Potato", "aliases": ["sweet potato"], "category": "tuber"},
    "cabbage": {"name": "Cabbage", "aliases": ["cabbage"], "category": "vegetable"},
    "spinach": {"name": "Spinach", "aliases": ["spinach"], "category": "vegetable"},
}


def resolve_crop_name(input_text):
    """Resolve a user's crop input to a standard crop name."""
    text = input_text.strip().lower()
    for key, crop in CROP_CATALOG.items():
        if text == key or text in crop["aliases"]:
            return crop["name"]
    return input_text.strip().title()  # Return as-is if not in catalog
