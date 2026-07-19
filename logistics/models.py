"""JunubLogistics database models.

Tables are prefixed ``junub_`` so they live cleanly alongside AgriConnect's
tables in the same SQLite/Postgres database.
"""
from datetime import datetime, timezone
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash

from models import db


def _utcnow():
    return datetime.now(timezone.utc)


# ── Valid choices ────────────────────────────────────────────────────────
DELIVERY_STATUS_CHOICES = [
    "pending",       # Booked, awaiting driver assignment
    "assigned",      # Driver accepted, on the way to pickup
    "picked_up",     # Parcel with driver, en route to drop-off
    "delivered",     # Completed
    "cancelled",     # Cancelled by customer/admin
]

VEHICLE_TYPES = [
    "motorbike",     # Boda-boda – primary fleet
    "bicycle",       # Short-range, low-cost
    "van",           # B2B larger parcels
]

PACKAGE_SIZES = [
    "small",         # Envelope / documents < 2 kg
    "medium",        # Typical e-commerce parcel 2–10 kg
    "large",         # Bulky 10–30 kg
]


class LCustomer(UserMixin, db.Model):
    """A customer (individual or business) booking deliveries."""
    __tablename__ = "junub_customers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    whatsapp_phone = db.Column(db.String(20))  # may differ from phone
    email = db.Column(db.String(120))
    password_hash = db.Column(db.String(256), nullable=False)
    default_pickup_lat = db.Column(db.Float)
    default_pickup_lng = db.Column(db.Float)
    default_pickup_label = db.Column(db.String(200))  # Landmark text
    created_at = db.Column(db.DateTime, default=_utcnow)
    is_active = db.Column(db.Boolean, default=True)

    deliveries = db.relationship("LDelivery", backref="customer", lazy="dynamic",
                                 foreign_keys="LDelivery.customer_id")

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    def __repr__(self):
        return f"<LCustomer {self.name} ({self.phone})>"


class LMerchant(db.Model):
    """B2B e-commerce seller (Instagram/Facebook/WhatsApp merchant)."""
    __tablename__ = "junub_merchants"

    id = db.Column(db.Integer, primary_key=True)
    business_name = db.Column(db.String(160), nullable=False)
    contact_name = db.Column(db.String(120))
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    whatsapp_phone = db.Column(db.String(20))
    instagram = db.Column(db.String(80))
    facebook = db.Column(db.String(120))
    # Contract rates override the standard per-km pricing
    contracted_rate_ssp_per_km = db.Column(db.Float, default=0.0)
    flat_rate_ssp = db.Column(db.Float, default=0.0)
    billing_balance_ssp = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=_utcnow)
    is_active = db.Column(db.Boolean, default=True)

    deliveries = db.relationship("LDelivery", backref="merchant", lazy="dynamic",
                                 foreign_keys="LDelivery.merchant_id")

    def __repr__(self):
        return f"<LMerchant {self.business_name}>"


class LDriver(UserMixin, db.Model):
    """A motorbike/boda rider in the JunubLogistics fleet."""
    __tablename__ = "junub_drivers"

    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    # Login uses phone as username
    phone = db.Column(db.String(20), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    plate_number = db.Column(db.String(30))
    vehicle_type = db.Column(db.String(20), default="motorbike")

    # Current live location — updated by driver app every ~30 s while on-duty
    current_lat = db.Column(db.Float)
    current_lng = db.Column(db.Float)
    last_location_at = db.Column(db.DateTime)

    is_on_duty = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    rating = db.Column(db.Float, default=5.0)
    total_deliveries = db.Column(db.Integer, default=0)
    earnings_ssp = db.Column(db.Float, default=0.0)
    created_at = db.Column(db.DateTime, default=_utcnow)

    deliveries = db.relationship("LDelivery", backref="driver", lazy="dynamic",
                                 foreign_keys="LDelivery.driver_id")

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    def update_location(self, lat, lng):
        self.current_lat = lat
        self.current_lng = lng
        self.last_location_at = _utcnow()

    def __repr__(self):
        return f"<LDriver {self.full_name} ({self.plate_number or self.phone})>"


class LDelivery(db.Model):
    """A single parcel delivery (a "job" assigned to one driver)."""
    __tablename__ = "junub_deliveries"

    id = db.Column(db.Integer, primary_key=True)
    tracking_code = db.Column(db.String(10), unique=True, nullable=False, index=True)

    # Actor links (merchant_id is non-null for B2B orders)
    customer_id = db.Column(db.Integer, db.ForeignKey("junub_customers.id"), nullable=False)
    merchant_id = db.Column(db.Integer, db.ForeignKey("junub_merchants.id"))
    driver_id = db.Column(db.Integer, db.ForeignKey("junub_drivers.id"))

    # ── Recipient ──────────────────────────────────────────────────
    recipient_name = db.Column(db.String(120), nullable=False)
    recipient_phone = db.Column(db.String(20), nullable=False)

    # ── Pickup (pin-drop) ─────────────────────────────────────────
    pickup_lat = db.Column(db.Float, nullable=False)
    pickup_lng = db.Column(db.Float, nullable=False)
    pickup_label = db.Column(db.String(220))   # landmark: e.g. "Opposite Juba Stadium"
    pickup_notes = db.Column(db.String(400))   # e.g. "Ask for Mary at cosmetics shop"

    # ── Drop-off (pin-drop) ───────────────────────────────────────
    dropoff_lat = db.Column(db.Float, nullable=False)
    dropoff_lng = db.Column(db.Float, nullable=False)
    dropoff_label = db.Column(db.String(220))
    dropoff_notes = db.Column(db.String(400))

    # ── Parcel ─────────────────────────────────────────────────────
    package_size = db.Column(db.String(20), default="medium")
    description = db.Column(db.String(300))    # e.g. "Jumia package — shoes"
    declared_value_ssp = db.Column(db.Float, default=0.0)

    # ── Pricing ────────────────────────────────────────────────────
    distance_km = db.Column(db.Float, default=0.0)
    fee_ssp = db.Column(db.Float, default=0.0)
    driver_payout_ssp = db.Column(db.Float, default=0.0)  # 80% of fee
    payment_method = db.Column(db.String(20), default="cash")  # cash | mobile_money
    payment_status = db.Column(db.String(20), default="unpaid")  # unpaid | paid

    # ── Lifecycle ──────────────────────────────────────────────────
    status = db.Column(db.String(20), default="pending")
    created_at = db.Column(db.DateTime, default=_utcnow)
    assigned_at = db.Column(db.DateTime)
    picked_up_at = db.Column(db.DateTime)
    delivered_at = db.Column(db.DateTime)
    cancelled_at = db.Column(db.DateTime)
    cancel_reason = db.Column(db.String(200))

    # PIN code recipient must show to receive parcel (prevents theft)
    handover_pin = db.Column(db.String(6))
    # Proof of delivery photo / signature
    delivery_photos = db.relationship("LDeliveryPhoto", backref="delivery",
                                      lazy="dynamic", cascade="all, delete-orphan")
    tracking_events = db.relationship("LTrackingEvent", backref="delivery",
                                      lazy="dynamic", cascade="all, delete-orphan",
                                      order_by="LTrackingEvent.created_at")

    def __repr__(self):
        return f"<LDelivery {self.tracking_code} ({self.status})>"


class LTrackingEvent(db.Model):
    """A time-stamped event in the delivery timeline."""
    __tablename__ = "junub_tracking_events"

    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey("junub_deliveries.id"), nullable=False)
    status = db.Column(db.String(20), nullable=False)
    note = db.Column(db.String(300))
    lat = db.Column(db.Float)
    lng = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=_utcnow)


class LDeliveryPhoto(db.Model):
    """Proof-of-delivery photo (image stored as static file, path in DB)."""
    __tablename__ = "junub_delivery_photos"

    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey("junub_deliveries.id"), nullable=False)
    photo_path = db.Column(db.String(300), nullable=False)
    caption = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=_utcnow)


class LNotificationLog(db.Model):
    """Audit log for WhatsApp / SMS notifications."""
    __tablename__ = "junub_notification_logs"

    id = db.Column(db.Integer, primary_key=True)
    delivery_id = db.Column(db.Integer, db.ForeignKey("junub_deliveries.id"))
    channel = db.Column(db.String(15), nullable=False)   # whatsapp | sms
    direction = db.Column(db.String(10), nullable=False) # inbound | outbound
    phone = db.Column(db.String(20), nullable=False)
    message = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default="queued")  # queued | sent | delivered | failed
    provider_id = db.Column(db.String(120))
    created_at = db.Column(db.DateTime, default=_utcnow)
