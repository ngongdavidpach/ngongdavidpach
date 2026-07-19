"""AgriConnect REST API Routes.

Provides endpoints for the buyer web dashboard:
- Produce listings (browse, search, filter)
- Order management (create, view, update status)
- Farmer directory
- Dashboard statistics
"""
from datetime import datetime, timezone, timedelta
from functools import wraps

from flask import Blueprint, request, jsonify, render_template, redirect, url_for, flash
from flask_login import login_user, logout_user, login_required, current_user

from models import (
    db,
    Farmer,
    Buyer,
    ProduceListing,
    Order,
    OrderItem,
    SMSLog,
    CROP_CATALOG,
    resolve_crop_name,
)
from utils import (
    format_currency,
    format_date,
    format_date_short,
    time_ago,
    generate_order_number,
)

api_bp = Blueprint("api", __name__)

# ── Template Helpers ──────────────────────────────────────────────────


def template_defaults():
    """Inject common template variables."""
    return dict(
        currency=format_currency,
        fdate=format_date,
        fdate_short=format_date_short,
        time_ago=time_ago,
        crop_catalog=CROP_CATALOG,
        year=datetime.now().year,
    )


# ── Authentication ────────────────────────────────────────────────────

@api_bp.route("/login", methods=["GET", "POST"])
def login():
    if current_user.is_authenticated:
        return redirect(url_for("api.dashboard"))

    if request.method == "POST":
        email = request.form.get("email", "").strip()
        password = request.form.get("password", "")

        buyer = Buyer.query.filter_by(email=email).first()
        if buyer and buyer.check_password(password):
            login_user(buyer, remember=True)
            next_page = request.args.get("next")
            return redirect(next_page or url_for("api.dashboard"))
        flash("Invalid email or password.", "error")

    return render_template("login.html")


@api_bp.route("/register", methods=["GET", "POST"])
def register():
    if current_user.is_authenticated:
        return redirect(url_for("api.dashboard"))

    if request.method == "POST":
        name = request.form.get("name", "").strip()
        org = request.form.get("organization", "").strip()
        buyer_type = request.form.get("buyer_type", "individual").strip()
        email = request.form.get("email", "").strip()
        phone = request.form.get("phone", "").strip()
        password = request.form.get("password", "")
        location = request.form.get("location", "Juba").strip()

        # Validation
        errors = []
        if not name:
            errors.append("Name is required.")
        if not email:
            errors.append("Email is required.")
        if not phone:
            errors.append("Phone is required.")
        if not password or len(password) < 6:
            errors.append("Password must be at least 6 characters.")
        if Buyer.query.filter_by(email=email).first():
            errors.append("Email already registered.")
        if Buyer.query.filter_by(phone=phone).first():
            errors.append("Phone already registered.")

        if errors:
            for e in errors:
                flash(e, "error")
            return render_template("login.html", register_mode=True)

        buyer = Buyer(
            name=name,
            organization=org,
            buyer_type=buyer_type,
            email=email,
            phone=phone,
            location=location,
        )
        buyer.set_password(password)
        db.session.add(buyer)
        db.session.commit()

        login_user(buyer)
        flash("Welcome to AgriConnect! 🌾", "success")
        return redirect(url_for("api.dashboard"))

    return render_template("login.html", register_mode=True)


@api_bp.route("/logout")
@login_required
def logout():
    logout_user()
    flash("You have been logged out.", "info")
    return redirect(url_for("api.login"))


# ── Dashboard ─────────────────────────────────────────────────────────

@api_bp.route("/")
def index():
    """Landing page redirect."""
    if current_user.is_authenticated:
        return redirect(url_for("api.dashboard"))
    return redirect(url_for("api.login"))


@api_bp.route("/dashboard")
@login_required
def dashboard():
    """Main buyer dashboard with statistics."""
    # Stats
    total_listings = ProduceListing.query.filter_by(is_active=True).count()
    total_farmers = Farmer.query.filter_by(is_active=True).count()
    total_orders = current_user.orders.count()
    pending_orders = current_user.orders.filter_by(status="pending").count()

    # Recent listings
    recent_listings = (
        ProduceListing.query
        .filter_by(is_active=True)
        .order_by(ProduceListing.created_at.desc())
        .limit(8)
        .all()
    )

    # Recent orders
    recent_orders = (
        current_user.orders
        .order_by(Order.created_at.desc())
        .limit(5)
        .all()
    )

    # Crop distribution
    crop_stats = (
        db.session.query(
            ProduceListing.crop_name,
            db.func.count(ProduceListing.id),
            db.func.sum(ProduceListing.quantity_kg),
        )
        .filter_by(is_active=True)
        .group_by(ProduceListing.crop_name)
        .order_by(db.func.sum(ProduceListing.quantity_kg).desc())
        .all()
    )

    return render_template(
        "dashboard.html",
        total_listings=total_listings,
        total_farmers=total_farmers,
        total_orders=total_orders,
        pending_orders=pending_orders,
        recent_listings=recent_listings,
        recent_orders=recent_orders,
        crop_stats=crop_stats,
    )


# ── Produce Listings ─────────────────────────────────────────────────

@api_bp.route("/produce")
@login_required
def produce_list():
    """Browse all available produce listings."""
    # Filters
    crop = request.args.get("crop", "").strip()
    county = request.args.get("county", "").strip()
    sort = request.args.get("sort", "newest")
    quality = request.args.get("quality", "")

    query = ProduceListing.query.filter_by(is_active=True)

    if crop:
        query = query.filter(ProduceListing.crop_name.ilike(f"%{crop}%"))
    if county:
        query = query.filter(ProduceListing.pickup_location.ilike(f"%{county}%"))
    if quality:
        query = query.filter_by(quality_grade=quality)

    # Sorting
    if sort == "price_low":
        query = query.order_by(ProduceListing.unit_price_ssp.asc())
    elif sort == "price_high":
        query = query.order_by(ProduceListing.unit_price_ssp.desc())
    elif sort == "quantity":
        query = query.order_by(ProduceListing.quantity_kg.desc())
    else:  # newest
        query = query.order_by(ProduceListing.created_at.desc())

    listings = query.all()

    # Get unique counties for filter
    counties = (
        db.session.query(Farmer.county)
        .distinct()
        .order_by(Farmer.county)
        .all()
    )
    counties = [c[0] for c in counties]

    # Get unique crops
    crops = (
        db.session.query(ProduceListing.crop_name)
        .filter_by(is_active=True)
        .distinct()
        .order_by(ProduceListing.crop_name)
        .all()
    )
    crops = [c[0] for c in crops]

    return render_template(
        "produce.html",
        listings=listings,
        counties=counties,
        crops=crops,
        selected_crop=crop,
        selected_county=county,
        selected_sort=sort,
        selected_quality=quality,
    )


@api_bp.route("/produce/<int:listing_id>")
@login_required
def produce_detail(listing_id):
    """View details of a specific listing."""
    listing = ProduceListing.query.get_or_404(listing_id)
    farmer = Farmer.query.get(listing.farmer_id)

    # Related listings (same crop)
    related = (
        ProduceListing.query
        .filter(
            ProduceListing.crop_name == listing.crop_name,
            ProduceListing.is_active == True,
            ProduceListing.id != listing.id,
        )
        .limit(4)
        .all()
    )

    return render_template(
        "produce_detail.html",
        listing=listing,
        farmer=farmer,
        related=related,
    )


# ── Orders ────────────────────────────────────────────────────────────

@api_bp.route("/orders")
@login_required
def orders_list():
    """View all orders for the current buyer."""
    status = request.args.get("status", "")

    query = current_user.orders

    if status:
        query = query.filter_by(status=status)

    orders = query.order_by(Order.created_at.desc()).all()

    return render_template(
        "orders.html",
        orders=orders,
        selected_status=status,
    )


@api_bp.route("/orders/create", methods=["POST"])
@login_required
def create_order():
    """Create a new order from the dashboard."""
    listing_id = request.form.get("listing_id", type=int)
    quantity = request.form.get("quantity", type=float)
    delivery_address = request.form.get("delivery_address", "").strip()
    notes = request.form.get("notes", "").strip()

    if not listing_id or not quantity:
        flash("Listing ID and quantity are required.", "error")
        return redirect(url_for("api.produce_list"))

    listing = ProduceListing.query.filter_by(id=listing_id, is_active=True).first()
    if not listing:
        flash("Listing not found or no longer available.", "error")
        return redirect(url_for("api.produce_list"))

    if quantity > listing.quantity_kg:
        flash(f"Only {listing.quantity_kg:.0f}kg available.", "error")
        return redirect(url_for("api.produce_detail", listing_id=listing_id))

    if quantity <= 0:
        flash("Quantity must be greater than 0.", "error")
        return redirect(url_for("api.produce_detail", listing_id=listing_id))

    # Create order
    order = Order(
        buyer_id=current_user.id,
        order_number=generate_order_number(),
        status="pending",
        delivery_address=delivery_address or current_user.location,
        notes=notes,
    )
    db.session.add(order)
    db.session.flush()

    item = OrderItem(
        order_id=order.id,
        listing_id=listing.id,
        quantity_kg=quantity,
        unit_price_ssp=listing.unit_price_ssp,
    )
    db.session.add(item)

    # Reduce listing quantity
    listing.quantity_kg -= quantity
    if listing.quantity_kg <= 0:
        listing.is_active = False

    order.calculate_total()
    db.session.commit()

    # Log SMS notification to farmer
    farmer = Farmer.query.get(listing.farmer_id)
    notification = SMSLog(
        farmer_id=farmer.id,
        phone=farmer.phone,
        direction="outbound",
        channel="sms",
        message=(
            f"New order {order.order_number}: "
            f"{quantity:.0f}kg of {listing.crop_name} "
            f"for {format_currency(order.total_amount_ssp)} "
            f"from {current_user.name} ({current_user.organization})"
        ),
    )
    db.session.add(notification)
    db.session.commit()

    flash(f"Order {order.order_number} placed successfully! Farmer {farmer.name} has been notified.", "success")
    return redirect(url_for("api.orders_list"))


@api_bp.route("/orders/<int:order_id>")
@login_required
def order_detail(order_id):
    """View order details."""
    order = Order.query.get_or_404(order_id)
    if order.buyer_id != current_user.id:
        flash("Access denied.", "error")
        return redirect(url_for("api.orders_list"))

    return render_template("order_detail.html", order=order)


# ── Farmers ───────────────────────────────────────────────────────────

@api_bp.route("/farmers")
@login_required
def farmers_list():
    """View registered farmers directory."""
    search = request.args.get("search", "").strip()
    county = request.args.get("county", "").strip()

    query = Farmer.query.filter_by(is_active=True)

    if search:
        query = query.filter(
            db.or_(
                Farmer.name.ilike(f"%{search}%"),
                Farmer.location.ilike(f"%{search}%"),
            )
        )
    if county:
        query = query.filter_by(county=county)

    farmers = query.order_by(Farmer.name).all()

    # Get unique counties
    counties = (
        db.session.query(Farmer.county)
        .distinct()
        .order_by(Farmer.county)
        .all()
    )
    counties = [c[0] for c in counties]

    return render_template(
        "farmers.html",
        farmers=farmers,
        counties=counties,
        search=search,
        selected_county=county,
    )


# ── JSON API (for AJAX calls and external integrations) ──────────────

@api_bp.route("/api/listings")
def api_listings():
    """JSON API for produce listings."""
    crop = request.args.get("crop", "")
    limit = request.args.get("limit", 20, type=int)

    query = ProduceListing.query.filter_by(is_active=True)
    if crop:
        query = query.filter(ProduceListing.crop_name.ilike(f"%{crop}%"))

    listings = query.order_by(ProduceListing.created_at.desc()).limit(limit).all()

    data = []
    for l in listings:
        farmer = Farmer.query.get(l.farmer_id)
        data.append({
            "id": l.id,
            "crop": l.crop_name,
            "quantity_kg": l.quantity_kg,
            "price_per_kg": l.unit_price_ssp,
            "quality": l.quality_grade,
            "location": l.pickup_location,
            "farmer": farmer.name if farmer else "Unknown",
            "farmer_county": farmer.county if farmer else "",
            "posted": l.created_at.isoformat() if l.created_at else None,
        })

    return jsonify({"listings": data, "count": len(data)})


@api_bp.route("/api/stats")
def api_stats():
    """JSON API for marketplace statistics."""
    total_listings = ProduceListing.query.filter_by(is_active=True).count()
    total_farmers = Farmer.query.filter_by(is_active=True).count()
    total_orders = Order.query.count()
    total_volume = (
        db.session.query(db.func.sum(ProduceListing.quantity_kg))
        .filter_by(is_active=True)
        .scalar() or 0
    )

    return jsonify({
        "active_listings": total_listings,
        "registered_farmers": total_farmers,
        "total_orders": total_orders,
        "total_volume_kg": total_volume,
    })
