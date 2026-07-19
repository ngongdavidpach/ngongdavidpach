"""JunubLogistics tests — basic smoke coverage of booking, driver flow, B2B API."""
import pytest
from app import create_app
from models import db
from logistics.geocode import (
    haversine_m, distance_fare_ssp, driver_payout, parse_pin,
    gen_tracking_code, google_maps_url, pin_is_near_juba,
)
from logistics.models import LCustomer, LDriver, LMerchant, LDelivery


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        db.create_all()
        yield app
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


def _make_customer(app, phone="+211922000001", password="pw123456"):
    with app.app_context():
        c = LCustomer(name="Test Cust", phone=phone)
        c.set_password(password)
        db.session.add(c); db.session.commit()
        return c.id


def _make_driver(app, phone="+211922000101", lat=4.851, lng=31.582):
    with app.app_context():
        d = LDriver(full_name="Test Rider", phone=phone, plate_number="SS TEST",
                    vehicle_type="motorbike", is_verified=True, is_on_duty=True,
                    current_lat=lat, current_lng=lng)
        d.set_password("driver123")
        db.session.add(d); db.session.commit()
        return d.id


# ── Unit / helper tests ────────────────────────────────────────────────
def test_haversine_short_distance():
    # Two points ~100 m apart near Juba Center
    d = haversine_m(4.8594, 31.5713, 4.8600, 31.5720)
    assert 80 < d < 140


def test_fare_structure():
    d_km, fee = distance_fare_ssp((4.851, 31.582), (4.872, 31.601), "medium")
    assert d_km > 2
    assert fee > 1500
    assert driver_payout(fee) == round(fee * 0.8, 2)


def test_parse_pin():
    assert parse_pin("4.851, 31.582") == (4.851, 31.582)
    assert parse_pin("here: lat 4.85 lng 31.58") == (4.85, 31.58)
    assert parse_pin("nothing") is None


def test_tracking_code_format():
    for _ in range(5):
        c = gen_tracking_code()
        assert c.startswith("JL-") and len(c) == 9


def test_google_maps_url_has_coords():
    from urllib.parse import quote
    u = google_maps_url(4.85, 31.58, "Juba Market")
    assert "4.85" in u and "31.58" in u
    # label must appear in URL-encoded form
    assert quote("Juba Market") in u or "Juba%20Market" in u or "Juba+Market" in u


def test_juba_bounds():
    assert pin_is_near_juba(4.85, 31.58)
    assert not pin_is_near_juba(0.0, 0.0)
    assert not pin_is_near_juba(4.85, 35.0)


# ── HTTP smoke tests ───────────────────────────────────────────────────
def test_public_pages(client):
    for url in ["/logistics/", "/logistics/track", "/logistics/signup",
                "/logistics/login", "/logistics/driver/login", "/logistics/admin"]:
        assert client.get(url).status_code == 200


def test_fare_quote(client):
    r = client.get("/logistics/api/quote-fare?plat=4.851&plng=31.582&dlat=4.872&dlng=31.601")
    assert r.status_code == 200
    j = r.get_json()
    assert j["ok"] and j["currency"] == "SSP" and j["fee_ssp"] > 0


def test_fare_quote_rejects_out_of_juba(client):
    r = client.get("/logistics/api/quote-fare?plat=1.0&plng=31.0&dlat=2.0&dlng=32.0")
    assert r.status_code == 400


def test_booking_requires_login(client):
    r = client.post("/logistics/api/create-delivery", data={
        "pickup_lat":"4.851","pickup_lng":"31.582",
        "dropoff_lat":"4.872","dropoff_lng":"31.601",
        "recipient_name":"R","recipient_phone":"+211999"})
    # Unauthenticated → redirect (302) to customer login
    assert r.status_code in (302, 401)


def test_full_customer_to_driver_flow(app, client):
    cid = _make_customer(app)
    did = _make_driver(app, lat=4.851, lng=31.582)
    # Customer login
    assert client.post("/logistics/login", data={
        "phone":"+211922000001", "password":"pw123456"
    }, follow_redirects=False).status_code == 302
    # Create delivery right next to driver → should auto-assign
    r = client.post("/logistics/api/create-delivery", data={
        "pickup_lat":"4.851","pickup_lng":"31.582","pickup_label":"Pickup me",
        "dropoff_lat":"4.852","dropoff_lng":"31.583","dropoff_label":"Dropping here",
        "recipient_name":"Alice","recipient_phone":"+211922999001",
        "package_size":"small","description":"test parcel",
    })
    j = r.get_json()
    assert j["ok"]
    code = j["delivery"]["tracking_code"]
    assert j["delivery"]["status"] in ("pending", "assigned")
    # Live tracking endpoint public
    assert client.get(f"/logistics/api/live/{code}").get_json()["ok"]
    # Logout customer
    client.get("/logistics/logout")

    # Login as driver
    assert client.post("/logistics/driver/login", data={
        "phone":"+211922000101","password":"driver123"
    }, follow_redirects=False).status_code == 302
    d_id = j["delivery"]["id"]
    with app.app_context():
        delivery = LDelivery.query.get(d_id)
        if delivery.status == "pending":
            r = client.post(f"/logistics/api/accept/{d_id}")
            assert r.get_json()["ok"]
    # Pickup
    r = client.post(f"/logistics/api/pickup/{d_id}")
    assert r.get_json()["ok"] and r.get_json()["delivery"]["status"] == "picked_up"
    # Deliver: need handover PIN
    with app.app_context():
        pin = LDelivery.query.get(d_id).handover_pin
    # Wrong PIN should fail
    r = client.post(f"/logistics/api/deliver/{d_id}", data={"pin":"000000"})
    assert r.status_code == 400
    # Correct PIN
    r = client.post(f"/logistics/api/deliver/{d_id}", data={"pin": pin})
    assert r.get_json()["ok"]
    assert r.get_json()["delivery"]["status"] == "delivered"


def test_b2b_merchant_api(app, client):
    _make_driver(app, lat=4.851, lng=31.582)
    with app.app_context():
        m = LMerchant(business_name="TestShop", phone="+211922399999",
                      instagram="testshop", flat_rate_ssp=2000)
        db.session.add(m); db.session.commit()
    r = client.post("/logistics/api/book-merchant", json={
        "api_key":"testshop",
        "recipient_name":"B2B Buyer", "recipient_phone":"+211922999002",
        "pickup_lat":4.851,"pickup_lng":31.582,"pickup_label":"Shop",
        "dropoff_lat":4.852,"dropoff_lng":31.583,"dropoff_label":"Buyer home",
        "package_size":"medium","description":"IG order"})
    j = r.get_json()
    assert j["ok"]
    assert j["tracking_code"].startswith("JL-")
    assert j["fee_ssp"] >= 2000
    # Customer can track the merchant's parcel
    assert client.get(f"/logistics/api/live/{j['tracking_code']}").status_code == 200


def test_whatsapp_inbound_track(app, client):
    _make_customer(app)
    # Seed a delivery we can reference
    with app.app_context():
        c = LCustomer.query.filter_by(phone="+211922000001").first()
        d = LDelivery(
            tracking_code=gen_tracking_code(), customer_id=c.id,
            recipient_name="R", recipient_phone="+211",
            pickup_lat=4.85, pickup_lng=31.58, pickup_label="P",
            dropoff_lat=4.86, dropoff_lng=31.59, dropoff_label="D",
            distance_km=1.0, fee_ssp=1500, driver_payout_ssp=1200,
            handover_pin="123456", status="pending",
        )
        db.session.add(d); db.session.commit()
        code = d.tracking_code
    payload = {
      "entry": [{"changes": [{"value": {"messages": [
          {"from":"211922000001","text":{"body":f"TRACK {code}"}}
      ]}}]}]
    }
    r = client.post("/logistics/whatsapp/inbound", json=payload)
    assert r.status_code == 200
    # Help command
    r = client.post("/logistics/whatsapp/inbound", json={
      "entry": [{"changes": [{"value": {"messages": [
          {"from":"211922000001","text":{"body":"hi"}}
      ]}}]}]
    })
    assert r.status_code == 200
    # Verify webhook
    r = client.get("/logistics/whatsapp/inbound?hub.verify_token=agriconnect_verify&hub.challenge=CHAL")
    assert r.data == b"CHAL"
