"""Seed demo data for JunubLogistics.

Creates:
  * 2 verified on-duty demo drivers (boda riders) in Juba
  * 3 demo customers (1 individual, 2 linked from merchants)
  * 4 B2B merchants (Instagram/Facebook Juba sellers)
  * A handful of sample deliveries in various statuses, including one
    in-flight delivery for live-tracking demos.

Run with:
    python seed_logistics.py
"""
from datetime import datetime, timezone, timedelta
from app import create_app
from models import db
from logistics.models import (
    LCustomer, LDriver, LMerchant, LDelivery, LTrackingEvent,
)
from logistics.geocode import (
    JUBA_CENTER, distance_fare_ssp, driver_payout, gen_tracking_code, gen_handover_pin,
)


def seed():
    app = create_app("development")
    with app.app_context():
        db.create_all()

        # ── Drivers ────────────────────────────────────────────────
        drivers = [
            {"full_name": "Samuel Majok", "phone": "+211922100001",
             "plate": "SS JBA 001", "lat": 4.8510, "lng": 31.5820},  # near Juba Market
            {"full_name": "Peter Lomoro", "phone": "+211922100002",
             "plate": "SS JBA 002", "lat": 4.8620, "lng": 31.5910},  # near Nyakuron
            {"full_name": "Grace Aya",    "phone": "+211922100003",
             "plate": "SS JBA 003", "lat": 4.8440, "lng": 31.5390},  # Gudele
        ]
        driver_objs = []
        for d in drivers:
            drv = LDriver.query.filter_by(phone=d["phone"]).first()
            if not drv:
                drv = LDriver(
                    full_name=d["full_name"], phone=d["phone"],
                    plate_number=d["plate"], vehicle_type="motorbike",
                    is_verified=True, is_on_duty=True, rating=4.8,
                    current_lat=d["lat"], current_lng=d["lng"],
                    last_location_at=datetime.now(timezone.utc),
                )
                drv.set_password("driver123")
                db.session.add(drv)
            else:
                drv.is_on_duty = True
                drv.current_lat, drv.current_lng = d["lat"], d["lng"]
                drv.last_location_at = datetime.now(timezone.utc)
            driver_objs.append(drv)
        db.session.flush()

        # ── Customers ──────────────────────────────────────────────
        def make_customer(name, phone, password="demo123", **kw):
            c = LCustomer.query.filter_by(phone=phone).first()
            if not c:
                c = LCustomer(name=name, phone=phone, **kw)
                c.set_password(password)
                db.session.add(c)
                db.session.flush()
            return c

        c_achol = make_customer("Achol Deng", "+211922200001",
                                whatsapp_phone="+211922200001")
        c_john  = make_customer("John Garang Jr.", "+211922200002")

        # ── Merchants ──────────────────────────────────────────────
        merchants = [
            {"business_name": "Jumia Juba (simulated)", "contact_name": "Mama Suk",
             "phone": "+211922300001", "instagram": "jumiajuba", "flat_rate_ssp": 2000},
            {"business_name": "Juba Fashion Hub (IG)", "contact_name": "Sarah",
             "phone": "+211922300002", "instagram": "jubafashionhub"},
            {"business_name": "Duk Duk Electronics",   "contact_name": "Deng",
             "phone": "+211922300003", "facebook": "DukDukElectronics",
             "flat_rate_ssp": 2500},
            {"business_name": "Konyo-Konyo Grocers",   "contact_name": "Mary",
             "phone": "+211922300004", "instagram": "konyogrocers"},
        ]
        merch_objs = []
        for m in merchants:
            mm = LMerchant.query.filter_by(phone=m["phone"]).first()
            if not mm:
                mm = LMerchant(**m)
                db.session.add(mm)
            merch_objs.append(mm)
        db.session.flush()

        # Customer rows for merchants (so they can act as sender)
        m_customers = {}
        for mm in merch_objs:
            mc = LCustomer.query.filter_by(phone=mm.phone).first()
            if not mc:
                mc = LCustomer(name=mm.business_name, phone=mm.phone,
                               whatsapp_phone=mm.whatsapp_phone or mm.phone)
                mc.set_password("merchant123")
                db.session.add(mc)
                db.session.flush()
            m_customers[mm.id] = mc

        # ── Sample deliveries ──────────────────────────────────────
        sample_deliveries = []
        # Helper
        def add_delivery(customer, *, plat, plng, plabel, pnotes,
                         dlat, dlng, dlabel, dnotes, recipient, rphone,
                         size="medium", desc="", status="pending",
                         merchant=None, driver=None, days_ago=0,
                         fee_override=None):
            d_km, fee = distance_fare_ssp((plat, plng), (dlat, dlng), size,
                                          merchant.flat_rate_ssp if merchant and merchant.flat_rate_ssp else 0)
            if fee_override: fee = fee_override
            dl = LDelivery(
                tracking_code=gen_tracking_code(),
                customer_id=customer.id,
                merchant_id=merchant.id if merchant else None,
                driver_id=driver.id if driver else None,
                recipient_name=recipient, recipient_phone=rphone,
                pickup_lat=plat, pickup_lng=plng, pickup_label=plabel, pickup_notes=pnotes,
                dropoff_lat=dlat, dropoff_lng=dlng, dropoff_label=dlabel, dropoff_notes=dnotes,
                package_size=size, description=desc,
                distance_km=d_km, fee_ssp=fee, driver_payout_ssp=driver_payout(fee),
                payment_method="cash",
                handover_pin=gen_handover_pin(),
                status=status,
            )
            if status == "delivered":
                dl.payment_status = "paid"
                dl.picked_up_at = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=2)
                dl.delivered_at = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=1)
                dl.assigned_at = datetime.now(timezone.utc) - timedelta(days=days_ago, hours=3)
                if driver:
                    driver.total_deliveries = (driver.total_deliveries or 0) + 1
                    driver.earnings_ssp = (driver.earnings_ssp or 0) + dl.driver_payout_ssp
            elif status == "picked_up":
                dl.picked_up_at = datetime.now(timezone.utc) - timedelta(minutes=18)
                dl.assigned_at = datetime.now(timezone.utc) - timedelta(minutes=35)
            elif status == "assigned":
                dl.assigned_at = datetime.now(timezone.utc) - timedelta(minutes=10)
            db.session.add(dl)
            db.session.flush()
            # Events
            stages = ["pending", "assigned", "picked_up", "delivered"]
            idx = stages.index(status) if status in stages else 0
            for i in range(idx+1):
                db.session.add(LTrackingEvent(
                    delivery_id=dl.id, status=stages[i],
                    note=f"Stage {stages[i]}",
                    lat=plat if i<2 else dlat,
                    lng=plng if i<2 else dlng,
                ))
            return dl

        # 1) A brand-new pending job near Juba market
        add_delivery(c_achol,
            plat=4.8510, plng=31.5820, plabel="Opposite Juba Market",
            pnotes="Blue container shop, ask for Achol",
            dlat=4.8720, dlng=31.6010, dlabel="Juba International Airport",
            dnotes="Drop at departures terminal",
            recipient="James Lual", rphone="+211922999001",
            size="small", desc="Envelope — documents for UN flight",
            status="pending")

        # 2) Assigned to Samuel
        add_delivery(m_customers[merch_objs[0].id],
            plat=4.8510, plng=31.5820, plabel="Jumia Juba Hub, Juba Market",
            pnotes="Handover at Jumia counter",
            dlat=4.8560, dlng=31.5500, dlabel="Munuki — block 3",
            dnotes="Near St. Joseph's church, yellow gate",
            recipient="Awut Alier", rphone="+211922999002",
            size="medium", desc="Jumia order #SS2391 — shoes",
            status="assigned", driver=driver_objs[0], merchant=merch_objs[0])

        # 3) In-transit (picked up) by Grace – visible on live tracking
        d_live = add_delivery(m_customers[merch_objs[1].id],
            plat=4.8447, plng=31.5755, plabel="Custom Market — Sarah's stall",
            pnotes="Ask for Sarah, dress #14",
            dlat=4.8440, dlng=31.5390, dlabel="Gudele block 4",
            dnotes="Green gate near borehole",
            recipient="Achol Deng", rphone="+211922200001",
            size="medium", desc="Traditional dress (Instagram order)",
            status="picked_up", driver=driver_objs[2], merchant=merch_objs[1])

        # 4) Completed yesterday
        add_delivery(c_john,
            plat=4.8540, plng=31.5740, plabel="Juba Teaching Hospital",
            pnotes="Reception desk — for Dr. Peter",
            dlat=4.8650, dlng=31.5780, dlabel="Hai Malakal",
            dnotes="Behind main mosque",
            recipient="Dr. Peter O.", rphone="+211922999003",
            size="small", desc="Medical documents",
            status="delivered", driver=driver_objs[1], days_ago=1)

        # 5) Completed 2 days ago — electronics
        add_delivery(m_customers[merch_objs[2].id],
            plat=4.8480, plng=31.5690, plabel="Konyo-Konyo Market, Duk Duk",
            pnotes="Ask for Deng",
            dlat=4.8700, dlng=31.5580, dlabel="Atlabara",
            dnotes="Last house on dirt road, ask for Mama Keji",
            recipient="Keji M.", rphone="+211922999004",
            size="large", desc="Bluetooth speaker + phone charger",
            status="delivered", driver=driver_objs[0], days_ago=2, merchant=merch_objs[2])

        db.session.commit()
        print("✅ JunubLogistics demo data seeded.")
        print(f"   Sample in-flight tracking code: {d_live.tracking_code}")
        print()
        print("Customer demo login: +211922200001 / demo123 (Achol Deng)")
        print("Driver demo logins:")
        for d in drivers:
            print(f"   {d['phone']} / driver123 ({d['full_name']} — {d['plate']})")
        print()
        print("B2B merchant API demo key: jumiajuba")
        print("   POST /logistics/api/book-merchant {\"api_key\":\"jumiajuba\", ...}")


if __name__ == "__main__":
    seed()
