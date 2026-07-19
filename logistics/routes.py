"""JunubLogistics Flask routes.

This blueprint is mounted at ``/logistics`` in the main app and exposes:

 * Customer experience
     /logistics/                   landing page
     /logistics/signup             customer register/login
     /logistics/login              customer login
     /logistics/logout
     /logistics/book               new delivery (pin-drop on map)
     /logistics/my-deliveries      delivery history
     /logistics/track?code=JL-...  public tracking (no login)

 * Driver app (mobile-first, one-tap actions)
     /logistics/driver/login
     /logistics/driver/dashboard   on-duty toggle, nearby jobs
     /logistics/driver/job/<id>    job detail with Google Maps nav link
     /logistics/driver/ping        POST current lat/lng

 * B2B / merchant API (for Instagram/Facebook sellers)
     /logistics/api/book-merchant  POST JSON to create a delivery via API

 * Dispatch REST API (used by customer/driver web apps)
     /logistics/api/create-delivery
     /logistics/api/quote-fare      GET with lat/lng → fee preview
     /logistics/api/nearby-jobs     driver listing
     /logistics/api/accept/<id>
     /logistics/api/pickup/<id>
     /logistics/api/deliver/<id>
     /logistics/api/cancel/<id>
     /logistics/api/live/<code>     JSON live tracking

 * Admin
     /logistics/admin               overview dashboard

Auth note:
  We avoid Flask-Login's single-user-type limitation by using the Flask
  session directly. We store ``jl_customer_id`` or ``jl_driver_id`` in the
  session and expose a tiny auth wrapper with a ``current_user`` proxy that
  resolves to an LCustomer, LDriver, or ``AnonymousUser`` instance. This
  keeps JunubLogistics isolated from AgriConnect's Buyer login.
"""
from __future__ import annotations
import os
import secrets
from datetime import datetime, timezone
from functools import wraps

from flask import (
    Blueprint, render_template, request, redirect, url_for, flash,
    jsonify, abort, current_app, session, g,
)
from werkzeug.utils import secure_filename
from flask_login import current_user as _agri_current  # noqa: F401  (not used, kept for parity)

from models import db
from .models import (
    LCustomer, LDriver, LMerchant, LDelivery, LTrackingEvent,
    LNotificationLog,
    DELIVERY_STATUS_CHOICES, VEHICLE_TYPES, PACKAGE_SIZES,
)
from .geocode import (
    JUBA_CENTER, PIN_AREAS, distance_fare_ssp, driver_payout,
    google_maps_directions_url, gen_tracking_code, gen_handover_pin,
    haversine_m, nearest_drivers, parse_pin, describe_pin, pin_is_near_juba,
)
from . import notifier


logistics_bp = Blueprint(
    "logistics", __name__,
    template_folder="../templates/logistics",
    static_folder="../static/logistics",
    url_prefix="/logistics",
)


# ── Lightweight auth (session-based) ──────────────────────────────────
class _Anonymous:
    is_authenticated = False
    is_anonymous = True
    def __repr__(self): return "<Anonymous>"


ANONYMOUS = _Anonymous()


@logistics_bp.before_app_request
def _load_logistics_user():
    """Attach the active logistics user (customer or driver) to flask.g."""
    g.jl_user = ANONYMOUS
    cid = session.get("jl_customer_id")
    if cid:
        u = LCustomer.query.get(int(cid))
        if u and u.is_active:
            g.jl_user = u
            return
        else:
            session.pop("jl_customer_id", None)
    did = session.get("jl_driver_id")
    if did:
        u = LDriver.query.get(int(did))
        if u and u.is_verified:
            g.jl_user = u
            return
        else:
            session.pop("jl_driver_id", None)


# Alias so templates and handlers can say ``current_user`` like in Flask-Login
def current_user():
    return getattr(g, "jl_user", ANONYMOUS)


# ── Auth helpers ──────────────────────────────────────────────────────
def _login_customer(c: LCustomer):
    session["jl_customer_id"] = c.id
    session.pop("jl_driver_id", None)
    session.permanent = True


def _login_driver(d: LDriver):
    session["jl_driver_id"] = d.id
    session.pop("jl_customer_id", None)
    session.permanent = True


def _logout_logistics():
    session.pop("jl_customer_id", None)
    session.pop("jl_driver_id", None)


@logistics_bp.record_once
def _on_register(state):
    # Ensure JunubLogistics tables exist when the app starts.
    app = state.app
    with app.app_context():
        db.create_all()


def _customer_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        u = current_user()
        if not (isinstance(u, LCustomer) and u.is_authenticated):
            return redirect(url_for("logistics.customer_login", next=request.path))
        return fn(*a, **kw)
    return wrapper


def _driver_required(fn):
    @wraps(fn)
    def wrapper(*a, **kw):
        u = current_user()
        if not (isinstance(u, LDriver) and u.is_authenticated):
            return redirect(url_for("logistics.driver_login", next=request.path))
        return fn(*a, **kw)
    return wrapper


# Inject logistics user only into logistics templates (avoid clobbering
# AgriConnect's Buyer-based `current_user` in its own templates).
@logistics_bp.context_processor
def _inject_user():
    return {"current_user": current_user()}


# ── Helpers ─────────────────────────────────────────────────────────────
def _utcnow():
    return datetime.now(timezone.utc)


def _json_error(msg, code=400):
    return jsonify({"ok": False, "error": msg}), code


def _serialize_delivery(d: LDelivery) -> dict:
    return {
        "id": d.id,
        "tracking_code": d.tracking_code,
        "status": d.status,
        "recipient": {"name": d.recipient_name, "phone": d.recipient_phone},
        "pickup": {
            "lat": d.pickup_lat, "lng": d.pickup_lng,
            "label": d.pickup_label, "notes": d.pickup_notes,
        },
        "dropoff": {
            "lat": d.dropoff_lat, "lng": d.dropoff_lng,
            "label": d.dropoff_label, "notes": d.dropoff_notes,
        },
        "distance_km": d.distance_km,
        "fee_ssp": d.fee_ssp,
        "driver_payout_ssp": d.driver_payout_ssp,
        "package_size": d.package_size,
        "description": d.description,
        "payment_method": d.payment_method,
        "payment_status": d.payment_status,
        "driver": {
            "id": d.driver.id, "name": d.driver.full_name,
            "phone": d.driver.phone, "plate": d.driver.plate_number,
            "lat": d.driver.current_lat, "lng": d.driver.current_lng,
        } if d.driver else None,
        "customer_name": d.customer.name if d.customer else None,
        "merchant_name": d.merchant.business_name if d.merchant else None,
        "events": [
            {"status": e.status, "note": e.note,
             "lat": e.lat, "lng": e.lng,
             "at": e.created_at.isoformat()} for e in d.tracking_events
        ],
        "created_at": d.created_at.isoformat(),
        "picked_up_at": d.picked_up_at.isoformat() if d.picked_up_at else None,
        "delivered_at": d.delivered_at.isoformat() if d.delivered_at else None,
        "nav_pickup_url": (
            google_maps_directions_url(
                d.driver.current_lat or d.pickup_lat,
                d.driver.current_lng or d.pickup_lng,
                d.pickup_lat, d.pickup_lng
            ) if d.driver else None
        ),
        "nav_dropoff_url": (
            google_maps_directions_url(d.pickup_lat, d.pickup_lng,
                                       d.dropoff_lat, d.dropoff_lng)
        ),
    }


def _add_event(d: LDelivery, status: str, note: str = "", lat=None, lng=None):
    ev = LTrackingEvent(delivery_id=d.id, status=status, note=note, lat=lat, lng=lng)
    db.session.add(ev)


# ── Landing / Marketing ────────────────────────────────────────────────
@logistics_bp.route("/")
def landing():
    counts = {
        "drivers": LDriver.query.filter_by(is_verified=True).count(),
        "deliveries": LDelivery.query.filter_by(status="delivered").count(),
        "merchants": LMerchant.query.filter_by(is_active=True).count(),
    }
    return render_template("logistics/landing.html", counts=counts,
                           pin_areas=PIN_AREAS)


# ── Customer auth ──────────────────────────────────────────────────────
@logistics_bp.route("/signup", methods=["GET", "POST"])
def customer_signup():
    if request.method == "POST":
        name = (request.form.get("name") or "").strip()
        phone = (request.form.get("phone") or "").strip()
        password = request.form.get("password") or ""
        whatsapp = (request.form.get("whatsapp_phone") or phone).strip()
        if not (name and phone and password):
            flash("Please fill all required fields.", "warn")
        elif LCustomer.query.filter_by(phone=phone).first():
            flash("That phone number is already registered. Please log in.", "warn")
            return redirect(url_for("logistics.customer_login"))
        else:
            c = LCustomer(name=name, phone=phone, whatsapp_phone=whatsapp)
            c.set_password(password)
            db.session.add(c)
            db.session.commit()
            _login_customer(c)
            flash(f"Welcome to JunubLogistics, {name}!", "ok")
            return redirect(url_for("logistics.book"))
    return render_template("logistics/customer_signup.html")


@logistics_bp.route("/login", methods=["GET", "POST"])
def customer_login():
    if request.method == "POST":
        phone = (request.form.get("phone") or "").strip()
        password = request.form.get("password") or ""
        c = LCustomer.query.filter_by(phone=phone).first()
        if not c or not c.check_password(password):
            flash("Invalid phone or password.", "err")
        else:
            _login_customer(c)
            nxt = request.args.get("next") or url_for("logistics.book")
            return redirect(nxt)
    return render_template("logistics/customer_login.html")


@logistics_bp.route("/logout")
def customer_logout():
    _logout_logistics()
    return redirect(url_for("logistics.landing"))


# ── Book / my-deliveries / track ───────────────────────────────────────
@logistics_bp.route("/book", methods=["GET"])
@_customer_required
def book():
    return render_template("logistics/book.html",
                           pin_areas=PIN_AREAS,
                           center=JUBA_CENTER,
                           package_sizes=PACKAGE_SIZES,
                           customer=current_user())


@logistics_bp.route("/my-deliveries")
@_customer_required
def my_deliveries():
    dels = (LDelivery.query.filter_by(customer_id=current_user().id)
            .order_by(LDelivery.created_at.desc()).all())
    return render_template("logistics/my_deliveries.html",
                           deliveries=dels)


@logistics_bp.route("/track")
def track():
    code = (request.args.get("code") or "").upper().strip()
    d = LDelivery.query.filter_by(tracking_code=code).first() if code else None
    return render_template("logistics/track.html", delivery=d, code=code,
                           center=JUBA_CENTER)


# ── Driver auth ────────────────────────────────────────────────────────
@logistics_bp.route("/driver/login", methods=["GET", "POST"])
def driver_login():
    if request.method == "POST":
        phone = (request.form.get("phone") or "").strip()
        password = request.form.get("password") or ""
        drv = LDriver.query.filter_by(phone=phone).first()
        if not drv or not drv.check_password(password):
            flash("Invalid phone or password.", "err")
        else:
            _login_driver(drv)
            return redirect(url_for("logistics.driver_dashboard"))
    return render_template("logistics/driver_login.html")


@logistics_bp.route("/driver/logout")
def driver_logout():
    _logout_logistics()
    return redirect(url_for("logistics.driver_login"))


@logistics_bp.route("/driver/dashboard")
@_driver_required
def driver_dashboard():
    driver = current_user()
    # Nearby pending jobs
    lat = driver.current_lat or JUBA_CENTER[0]
    lng = driver.current_lng or JUBA_CENTER[1]
    pending = LDelivery.query.filter_by(status="pending").all()
    nearby = []
    for job in pending:
        d_km = haversine_m(lat, lng, job.pickup_lat, job.pickup_lng) / 1000
        if d_km <= 10:
            nearby.append((round(d_km, 2), job))
    nearby.sort(key=lambda t: t[0])
    my_active = (LDelivery.query
                 .filter(LDelivery.driver_id == driver.id,
                         LDelivery.status.in_(["assigned", "picked_up"]))
                 .order_by(LDelivery.created_at.desc()).all())
    my_past = (LDelivery.query
               .filter(LDelivery.driver_id == driver.id,
                       LDelivery.status.in_(["delivered", "cancelled"]))
               .order_by(LDelivery.created_at.desc()).limit(30).all())
    return render_template("logistics/driver_dashboard.html",
                           driver=driver,
                           nearby=nearby[:15],
                           my_active=my_active,
                           my_past=my_past,
                           center=JUBA_CENTER)


@logistics_bp.route("/driver/job/<int:jid>")
@_driver_required
def driver_job(jid):
    job = LDelivery.query.get_or_404(jid)
    if job.driver_id and job.driver_id != current_user().id and job.status != "pending":
        abort(403)
    pickup_nav = google_maps_directions_url(
        current_user().current_lat or job.pickup_lat,
        current_user().current_lng or job.pickup_lng,
        job.pickup_lat, job.pickup_lng,
    )
    drop_nav = google_maps_directions_url(
        job.pickup_lat, job.pickup_lng,
        job.dropoff_lat, job.dropoff_lng,
    )
    return render_template("logistics/driver_job.html",
                           job=job, pickup_nav=pickup_nav, drop_nav=drop_nav,
                           center=(job.pickup_lat, job.pickup_lng))


# ── Admin dashboard ────────────────────────────────────────────────────
@logistics_bp.route("/admin")
def admin():
    # No real auth gate for this demo – demo access only
    stats = {
        "pending": LDelivery.query.filter_by(status="pending").count(),
        "active": LDelivery.query.filter(LDelivery.status.in_(["assigned", "picked_up"])).count(),
        "delivered": LDelivery.query.filter_by(status="delivered").count(),
        "cancelled": LDelivery.query.filter_by(status="cancelled").count(),
        "drivers": LDriver.query.count(),
        "verified_drivers": LDriver.query.filter_by(is_verified=True).count(),
        "customers": LCustomer.query.count(),
        "merchants": LMerchant.query.count(),
        "revenue_ssp": db.session.query(
            db.func.coalesce(db.func.sum(LDelivery.fee_ssp), 0.0)
        ).filter_by(status="delivered").scalar() or 0.0,
        "driver_payouts_ssp": db.session.query(
            db.func.coalesce(db.func.sum(LDelivery.driver_payout_ssp), 0.0)
        ).filter_by(status="delivered").scalar() or 0.0,
    }
    recent = (LDelivery.query.order_by(LDelivery.created_at.desc())
              .limit(25).all())
    online_drivers = LDriver.query.filter_by(is_on_duty=True).all()
    from .models import LNotificationLog
    notifications = (LNotificationLog.query
                     .order_by(LNotificationLog.created_at.desc())
                     .limit(20).all())
    return render_template("logistics/admin.html",
                           stats=stats, recent=recent,
                           online_drivers=online_drivers,
                           notifications=notifications)


# ── REST / JSON API ────────────────────────────────────────────────────

@logistics_bp.route("/api/quote-fare", methods=["GET"])
def api_quote_fare():
    """GET ?plat=..&plng=..&dlat=..&dlng=..&size=medium → JSON fare preview."""
    try:
        plat = float(request.args["plat"])
        plng = float(request.args["plng"])
        dlat = float(request.args["dlat"])
        dlng = float(request.args["dlng"])
    except (KeyError, TypeError, ValueError):
        return _json_error("Missing or invalid pickup/drop coordinates.")
    size = request.args.get("size", "medium")
    flat_rate = request.args.get("flat_rate", type=float, default=0.0)
    if not pin_is_near_juba(plat, plng) or not pin_is_near_juba(dlat, dlng):
        return _json_error("JunubLogistics currently operates in Juba only.")
    d_km, fee = distance_fare_ssp((plat, plng), (dlat, dlng), size, flat_rate)
    return jsonify({
        "ok": True,
        "distance_km": d_km,
        "fee_ssp": fee,
        "driver_payout_ssp": driver_payout(fee),
        "currency": "SSP",
    })


@logistics_bp.route("/api/create-delivery", methods=["POST"])
@_customer_required
def api_create_delivery():
    data = request.get_json(silent=True) or request.form
    try:
        plat = float(data["pickup_lat"])
        plng = float(data["pickup_lng"])
        dlat = float(data["dropoff_lat"])
        dlng = float(data["dropoff_lng"])
        rname = (data.get("recipient_name") or "").strip()
        rphone = (data.get("recipient_phone") or "").strip()
    except (KeyError, TypeError, ValueError):
        return _json_error("Missing pickup/drop coordinates or recipient.")
    if not rname or not rphone:
        return _json_error("Recipient name and phone are required.")
    if not pin_is_near_juba(plat, plng) or not pin_is_near_juba(dlat, dlng):
        return _json_error("Pickup/drop-off must be within Juba.")
    size = (data.get("package_size") or "medium")
    if size not in PACKAGE_SIZES:
        size = "medium"
    d_km, fee = distance_fare_ssp((plat, plng), (dlat, dlng), size)
    payout = driver_payout(fee)

    d = LDelivery(
        tracking_code=gen_tracking_code(),
        customer_id=current_user().id,
        recipient_name=rname,
        recipient_phone=rphone,
        pickup_lat=plat, pickup_lng=plng,
        pickup_label=data.get("pickup_label", ""),
        pickup_notes=data.get("pickup_notes", ""),
        dropoff_lat=dlat, dropoff_lng=dlng,
        dropoff_label=data.get("dropoff_label", ""),
        dropoff_notes=data.get("dropoff_notes", ""),
        package_size=size,
        description=data.get("description", ""),
        declared_value_ssp=float(data.get("declared_value_ssp") or 0),
        distance_km=d_km,
        fee_ssp=fee,
        driver_payout_ssp=payout,
        payment_method=data.get("payment_method", "cash"),
        handover_pin=gen_handover_pin(),
        status="pending",
    )
    db.session.add(d)
    db.session.flush()
    _add_event(d, "pending", "Booking received", lat=plat, lng=plng)
    db.session.commit()

    # Send confirmations asynchronously (synchronously for demo)
    try:
        notifier.notify_booking_confirmation(d)
    except Exception as e:                    # pragma: no cover
        current_app.logger.warning("whatsapp notify failed: %s", e)

    # Auto-assign nearest driver if one is within 5 km
    nearby = nearest_drivers(plat, plng, max_km=5.0, limit=1)
    if nearby:
        _, best = nearby[0]
        d.driver_id = best.id
        d.status = "assigned"
        d.assigned_at = _utcnow()
        _add_event(d, "assigned", f"Auto-assigned to {best.full_name}")
        db.session.commit()
        try:
            notifier.notify_driver_assigned(d)
        except Exception as e:                # pragma: no cover
            current_app.logger.warning("assign notify failed: %s", e)

    return jsonify({"ok": True, "delivery": _serialize_delivery(d)})


@logistics_bp.route("/api/accept/<int:did>", methods=["POST"])
@_driver_required
def api_accept(did):
    d = LDelivery.query.get_or_404(did)
    if d.status != "pending":
        return _json_error("This job is no longer available.", 409)
    d.driver_id = current_user().id
    d.status = "assigned"
    d.assigned_at = _utcnow()
    _add_event(d, "assigned", f"Accepted by {current_user().full_name}")
    db.session.commit()
    try:
        notifier.notify_driver_assigned(d)
    except Exception as e:                    # pragma: no cover
        current_app.logger.warning(e)
    return jsonify({"ok": True, "delivery": _serialize_delivery(d)})


@logistics_bp.route("/api/ping", methods=["POST"])
@_driver_required
def api_ping():
    """Driver app posts current lat/lng every ~30 s while on-duty."""
    try:
        lat = float(request.form.get("lat") or request.json.get("lat"))
        lng = float(request.form.get("lng") or request.json.get("lng"))
    except (TypeError, ValueError, KeyError):
        return _json_error("lat and lng are required.")
    on_duty = request.form.get("on_duty")
    if on_duty is not None:
        current_user().is_on_duty = str(on_duty).lower() in ("1", "true", "yes", "on")
    current_user().update_location(lat, lng)
    db.session.commit()
    return jsonify({"ok": True})


@logistics_bp.route("/api/driver/toggle-duty", methods=["POST"])
@_driver_required
def api_toggle_duty():
    current_user().is_on_duty = not current_user().is_on_duty
    db.session.commit()
    return jsonify({"ok": True, "is_on_duty": current_user().is_on_duty})


@logistics_bp.route("/api/pickup/<int:did>", methods=["POST"])
@_driver_required
def api_pickup(did):
    d = LDelivery.query.get_or_404(did)
    if d.driver_id != current_user().id:
        return _json_error("Not your job.", 403)
    if d.status != "assigned":
        return _json_error("Cannot pick up at this stage.", 409)
    d.status = "picked_up"
    d.picked_up_at = _utcnow()
    _add_event(d, "picked_up", "Parcel collected by rider",
               lat=d.pickup_lat, lng=d.pickup_lng)
    db.session.commit()
    try:
        notifier.notify_picked_up(d)
    except Exception as e:                    # pragma: no cover
        current_app.logger.warning(e)
    return jsonify({"ok": True, "delivery": _serialize_delivery(d)})


@logistics_bp.route("/api/deliver/<int:did>", methods=["POST"])
@_driver_required
def api_deliver(did):
    d = LDelivery.query.get_or_404(did)
    if d.driver_id != current_user().id:
        return _json_error("Not your job.", 403)
    pin = (request.form.get("pin") or (request.json or {}).get("pin") or "").strip()
    if pin != d.handover_pin:
        return _json_error("Invalid handover PIN. Ask the recipient to show the 6-digit code.", 400)
    # Optional proof-of-delivery photo
    photo_path = None
    if "photo" in request.files:
        f = request.files["photo"]
        if f and f.filename:
            fname = secure_filename(f"{d.tracking_code}_{secrets.token_hex(4)}.jpg")
            upload_dir = os.path.join(current_app.root_path, "static", "logistics", "proof")
            os.makedirs(upload_dir, exist_ok=True)
            full = os.path.join(upload_dir, fname)
            f.save(full)
            photo_path = f"logistics/proof/{fname}"
            from .models import LDeliveryPhoto
            db.session.add(LDeliveryPhoto(delivery_id=d.id, photo_path=photo_path,
                                          caption="Proof of delivery"))
    d.status = "delivered"
    d.delivered_at = _utcnow()
    d.payment_status = "paid"
    current_user().total_deliveries = (current_user().total_deliveries or 0) + 1
    current_user().earnings_ssp = (current_user().earnings_ssp or 0) + d.driver_payout_ssp
    _add_event(d, "delivered", "Parcel handed over", lat=d.dropoff_lat, lng=d.dropoff_lng)
    db.session.commit()
    try:
        notifier.notify_delivered(d)
    except Exception as e:                    # pragma: no cover
        current_app.logger.warning(e)
    return jsonify({"ok": True, "delivery": _serialize_delivery(d)})


@logistics_bp.route("/api/cancel/<int:did>", methods=["POST"])
@_customer_required
def api_cancel(did):
    d = LDelivery.query.get_or_404(did)
    if d.customer_id != current_user().id:
        return _json_error("Not your booking.", 403)
    if d.status in ("delivered", "cancelled"):
        return _json_error("Cannot cancel at this stage.", 409)
    reason = (request.form.get("reason") or (request.json or {}).get("reason") or "").strip()
    d.status = "cancelled"
    d.cancelled_at = _utcnow()
    d.cancel_reason = reason
    _add_event(d, "cancelled", reason or "Cancelled by customer")
    db.session.commit()
    try:
        notifier.notify_cancelled(d)
    except Exception as e:                    # pragma: no cover
        current_app.logger.warning(e)
    return jsonify({"ok": True})


@logistics_bp.route("/api/live/<code>")
def api_live(code):
    d = LDelivery.query.filter_by(tracking_code=code.upper()).first()
    if not d:
        return _json_error("Tracking code not found.", 404)
    return jsonify({"ok": True, "delivery": _serialize_delivery(d)})


@logistics_bp.route("/api/nearby-jobs")
@_driver_required
def api_nearby_jobs():
    lat = current_user().current_lat or JUBA_CENTER[0]
    lng = current_user().current_lng or JUBA_CENTER[1]
    jobs = LDelivery.query.filter_by(status="pending").all()
    out = []
    for j in jobs:
        d_km = haversine_m(lat, lng, j.pickup_lat, j.pickup_lng) / 1000
        if d_km <= 15:
            item = _serialize_delivery(j)
            item["distance_from_driver_km"] = round(d_km, 2)
            out.append(item)
    out.sort(key=lambda x: x["distance_from_driver_km"])
    return jsonify({"ok": True, "jobs": out})


# ── B2B Merchant API (for Instagram / Facebook sellers) ────────────────
@logistics_bp.route("/api/book-merchant", methods=["POST"])
def api_book_merchant():
    """Server-side merchant booking keyed by merchant API token.

    Expected JSON::

        {
          "api_key": "MERCHANT_API_KEY",
          "recipient_name": "Achol Deng",
          "recipient_phone": "+211922123456",
          "pickup_lat": 4.85, "pickup_lng": 31.58,
          "pickup_label": "Juba Market - Mary's Shop",
          "dropoff_lat": 4.87, "dropoff_lng": 31.55,
          "dropoff_label": "Gudele block 4",
          "dropoff_notes": "Next to green door",
          "package_size": "medium",
          "description": "Shoes ordered on Instagram"
        }
    """
    data = request.get_json(silent=True) or {}
    key = data.get("api_key", "").strip()
    merchant = LMerchant.query.filter_by(is_active=True).filter(
        db.or_(
            LMerchant.instagram == key,
            LMerchant.instagram == ("mk_" + key),
            LMerchant.facebook == key,
            LMerchant.phone == key,
            LMerchant.business_name == key,
        )
    ).first()
    if not merchant:
        return _json_error("Invalid merchant api_key.", 401)

    # For B2B the "customer" is the merchant itself. We need an LCustomer row
    # to attach the booking to — find-or-create a linked customer.
    cust = LCustomer.query.filter_by(phone=merchant.phone).first()
    if not cust:
        cust = LCustomer(name=merchant.business_name, phone=merchant.phone,
                         whatsapp_phone=merchant.whatsapp_phone)
        cust.set_password(secrets.token_urlsafe(16))
        db.session.add(cust)
        db.session.flush()
    try:
        plat = float(data["pickup_lat"]); plng = float(data["pickup_lng"])
        dlat = float(data["dropoff_lat"]); dlng = float(data["dropoff_lng"])
    except (KeyError, TypeError, ValueError):
        return _json_error("Pickup/drop coordinates required.")
    rname = (data.get("recipient_name") or "").strip()
    rphone = (data.get("recipient_phone") or "").strip()
    if not rname or not rphone:
        return _json_error("Recipient name and phone are required.")
    if not pin_is_near_juba(plat, plng) or not pin_is_near_juba(dlat, dlng):
        return _json_error("Pickup/drop-off must be within Juba.")
    size = data.get("package_size", "medium")
    flat = merchant.flat_rate_ssp if merchant.flat_rate_ssp else 0.0
    d_km, fee = distance_fare_ssp((plat, plng), (dlat, dlng), size, flat)
    d = LDelivery(
        tracking_code=gen_tracking_code(),
        customer_id=cust.id,
        merchant_id=merchant.id,
        recipient_name=rname, recipient_phone=rphone,
        pickup_lat=plat, pickup_lng=plng,
        pickup_label=data.get("pickup_label", merchant.business_name),
        pickup_notes=data.get("pickup_notes", ""),
        dropoff_lat=dlat, dropoff_lng=dlng,
        dropoff_label=data.get("dropoff_label", ""),
        dropoff_notes=data.get("dropoff_notes", ""),
        package_size=size,
        description=data.get("description", ""),
        distance_km=d_km, fee_ssp=fee, driver_payout_ssp=driver_payout(fee),
        payment_method="merchant_account",
        handover_pin=gen_handover_pin(),
        status="pending",
    )
    merchant.billing_balance_ssp = (merchant.billing_balance_ssp or 0) + fee
    db.session.add(d)
    db.session.flush()
    _add_event(d, "pending", f"B2B booking from {merchant.business_name}")
    db.session.commit()
    try:
        notifier.notify_booking_confirmation(d)
    except Exception as e:                    # pragma: no cover
        current_app.logger.warning(e)
    nearby = nearest_drivers(plat, plng, max_km=5.0, limit=1)
    if nearby:
        _, best = nearby[0]
        d.driver_id = best.id
        d.status = "assigned"
        d.assigned_at = _utcnow()
        _add_event(d, "assigned", f"Auto-assigned to {best.full_name}")
        db.session.commit()
        try:
            notifier.notify_driver_assigned(d)
        except Exception:                    # pragma: no cover
            pass
    return jsonify({
        "ok": True,
        "tracking_code": d.tracking_code,
        "fee_ssp": fee,
        "status": d.status,
        "tracking_url": url_for("logistics.track", code=d.tracking_code, _external=True),
    })


# ── WhatsApp bot hook (simple command routing) ─────────────────────────
@logistics_bp.route("/whatsapp/inbound", methods=["POST", "GET"])
def whatsapp_inbound():
    """Very small inbound WhatsApp handler — status lookups and help.

    Users can send:
        TRACK JL-ABC123   → live update
        PIN 4.85,31.58    → confirm coordinates (future use)
        HELP              → usage
    """
    from flask import request
    # Webhook verify for Meta
    if request.method == "GET":
        vf = request.args.get("hub.verify_token")
        if vf == current_app.config.get("WHATSAPP_VERIFY_TOKEN", "agriconnect_verify"):
            return request.args.get("hub.challenge", "")
        return "ok", 200
    data = request.get_json(silent=True) or {}
    entry = (data.get("entry") or [{}])[0]
    changes = (entry.get("changes") or [{}])[0]
    value = changes.get("value") or {}
    msgs = value.get("messages") or []
    for m in msgs:
        frm = m.get("from")
        text = (m.get("text") or {}).get("body", "").strip()
        if not text:
            continue
        upper = text.upper()
        if upper.startswith("TRACK"):
            code = upper.replace("TRACK", "").strip().lstrip("JL").strip()
            code = "JL-" + code.lstrip("-") if not code.startswith("JL") else code
            dl = LDelivery.query.filter_by(tracking_code=code).first()
            if not dl:
                msg = f"Sorry, tracking code {code} not found."
            else:
                msg = (f"*{dl.tracking_code}*: {dl.status.upper()}\n"
                       f"Driver: {dl.driver.full_name if dl.driver else 'not yet assigned'}\n"
                       f"Drop-off: {describe_pin(dl.dropoff_lat, dl.dropoff_lng, dl.dropoff_label)}")
            notifier._dispatch("whatsapp", frm, msg)
        else:
            notifier._dispatch(
                "whatsapp", frm,
                "🏍️ JunubLogistics — Address-less delivery for South Sudan.\n"
                "Commands:\n• TRACK JL-CODE → check a delivery\n• HELP → this message\n"
                "Book a delivery at our website or ask your favourite Instagram seller "
                "to ship via JunubLogistics!",
            )
    return jsonify({"ok": True}), 200
