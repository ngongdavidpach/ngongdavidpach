"""Seed AgriConnect with demo data for South Sudan context.

Creates sample farmers from various counties, produce listings,
and buyer accounts for testing and demonstration purposes.
"""
from datetime import datetime, timedelta, timezone
from app import create_app
from models import db, Farmer, Buyer, ProduceListing, Order, OrderItem
from utils import generate_order_number


def seed():
    app = create_app()
    with app.app_context():
        db.drop_all()
        db.create_all()

        # ── Farmers ───────────────────────────────────────────────
        farmers = [
            Farmer(name="Achol Deng Mayen", phone="+211912345001", location="Bor", county="Jonglei", language="en"),
            Farmer(name="James Lual Akot", phone="+211912345002", location="Yei", county="Central Equatoria", language="en"),
            Farmer(name="Mary Nyakuoth Gatluak", phone="+211912345003", location="Malakal", county="Upper Nile", language="en"),
            Farmer(name="Peter Kuol Arol", phone="+211912345004", location="Aweil", county="Northern Bahr el Ghazal", language="en"),
            Farmer(name="Sarah Adut Makuei", phone="+211912345005", location="Torit", county="Eastern Equatoria", language="en"),
            Farmer(name="David Machar Ruai", phone="+211912345006", location="Rumbek", county="Lakes", language="en"),
            Farmer(name="Grace Nyadol Lual", phone="+211912345007", location="Wau", county="Western Bahr el Ghazal", language="en"),
            Farmer(name="John Kon Tang", phone="+211912345008", location="Kajo-Keji", county="Central Equatoria", language="en"),
            Farmer(name="Agnes Akello Lam", phone="+211912345009", location="Nimule", county="Eastern Equatoria", language="en"),
            Farmer(name="Samuel Dut Piok", phone="+211912345010", location="Bentiu", county="Unity", language="en"),
            Farmer(name="Rebecca Nyandeng Garang", phone="+211912345011", location="Mundri", county="Western Equatoria", language="en"),
            Farmer(name="Deng Mawien Akech", phone="+211912345012", location="Awerial", county="Lakes", language="en"),
        ]

        for f in farmers:
            f.registered_at = datetime.now(timezone.utc) - timedelta(days=30 + hash(f.name) % 60)
            db.session.add(f)
        db.session.flush()

        # ── Produce Listings ──────────────────────────────────────
        now = datetime.now(timezone.utc)
        listings_data = [
            # (farmer_index, crop, qty_kg, price_ssp, quality, days_ago)
            (0, "Maize", 500, 150, "premium", 2),
            (0, "Sorghum", 300, 180, "standard", 3),
            (1, "Cassava", 800, 120, "premium", 1),
            (1, "Groundnut", 200, 350, "standard", 5),
            (2, "Maize", 1200, 140, "standard", 4),
            (2, "Beans", 400, 280, "premium", 2),
            (3, "Sorghum", 600, 170, "premium", 1),
            (3, "Sesame", 150, 500, "premium", 6),
            (4, "Tomato", 100, 800, "premium", 0),
            (4, "Onion", 200, 600, "standard", 1),
            (4, "Cabbage", 300, 400, "standard", 2),
            (5, "Maize", 900, 145, "standard", 3),
            (5, "Millet", 250, 200, "standard", 5),
            (6, "Cassava", 600, 110, "fair", 4),
            (6, "Rice", 350, 450, "premium", 2),
            (7, "Mango", 400, 300, "premium", 1),
            (7, "Banana", 500, 250, "standard", 0),
            (8, "Okra", 80, 700, "premium", 0),
            (8, "Spinach", 60, 500, "premium", 0),
            (9, "Sorghum", 700, 165, "standard", 3),
            (9, "Groundnut", 180, 380, "standard", 7),
            (10, "Sweet Potato", 450, 200, "standard", 2),
            (10, "Beans", 300, 290, "premium", 4),
            (11, "Maize", 1500, 135, "standard", 1),
            (11, "Cassava", 700, 115, "standard", 3),
        ]

        for farmer_idx, crop, qty, price, quality, days_ago in listings_data:
            listing = ProduceListing(
                farmer_id=farmers[farmer_idx].id,
                crop_name=crop,
                quantity_kg=qty,
                unit_price_ssp=price,
                quality_grade=quality,
                pickup_location=f"{farmers[farmer_idx].location}, {farmers[farmer_idx].county}",
                harvest_date=(now - timedelta(days=days_ago + 2)).date(),
                created_at=now - timedelta(days=days_ago),
                expires_at=now + timedelta(days=7 - days_ago),
            )
            db.session.add(listing)
        db.session.flush()

        # ── Buyers ────────────────────────────────────────────────
        buyers = [
            Buyer(
                name="James Maker",
                organization="World Food Programme (WFP)",
                buyer_type="ngo",
                email="james.maker@wfp.org",
                phone="+211921000001",
                location="Juba",
            ),
            Buyer(
                name="Amina Hassan",
                organization="Juba Palace Hotel",
                buyer_type="restaurant",
                email="amina@jubapalace.com",
                phone="+211921000002",
                location="Juba",
            ),
            Buyer(
                name="Michael Lado",
                organization="Lado Wholesale & Distribution",
                buyer_type="wholesaler",
                email="michael@ladodist.com",
                phone="+211921000003",
                location="Juba",
            ),
            Buyer(
                name="Nyamal Gatluak",
                organization="UNICEF South Sudan",
                buyer_type="ngo",
                email="nyamal@unicef.org",
                phone="+211921000004",
                location="Juba",
            ),
        ]

        for b in buyers:
            b.set_password("demo123")
            b.registered_at = now - timedelta(days=20)
            db.session.add(b)
        db.session.flush()

        # ── Sample Orders ─────────────────────────────────────────
        # Get some listings for orders
        all_listings = ProduceListing.query.all()

        orders_data = [
            (buyers[0], all_listings[0], 200, "confirmed", 5),
            (buyers[0], all_listings[4], 500, "delivered", 15),
            (buyers[1], all_listings[8], 50, "pending", 1),
            (buyers[1], all_listings[10], 100, "confirmed", 3),
            (buyers[2], all_listings[2], 300, "in_transit", 2),
            (buyers[2], all_listings[6], 200, "pending", 0),
            (buyers[3], all_listings[5], 150, "confirmed", 4),
        ]

        for buyer, listing, qty, status, days_ago in orders_data:
            order = Order(
                buyer_id=buyer.id,
                order_number=generate_order_number(),
                status=status,
                delivery_address="Juba, South Sudan",
                created_at=now - timedelta(days=days_ago),
            )
            if status == "confirmed":
                order.confirmed_at = now - timedelta(days=days_ago - 1)
            if status == "delivered":
                order.delivered_at = now - timedelta(days=days_ago - 3)

            db.session.add(order)
            db.session.flush()

            item = OrderItem(
                order_id=order.id,
                listing_id=listing.id,
                quantity_kg=qty,
                unit_price_ssp=listing.unit_price_ssp,
            )
            db.session.add(item)

            order.total_amount_ssp = qty * listing.unit_price_ssp

        db.session.commit()

        print("✅ AgriConnect seeded successfully!")
        print(f"   📋 {len(farmers)} farmers")
        print(f"   🌾 {len(listings_data)} produce listings")
        print(f"   👤 {len(buyers)} buyers")
        print(f"   📦 {len(orders_data)} orders")
        print()
        print("Demo login credentials:")
        print("   Email: james.maker@wfp.org  |  Password: demo123")
        print("   Email: amina@jubapalace.com |  Password: demo123")
        print("   Email: michael@ladodist.com |  Password: demo123")
        print("   Email: nyamal@unicef.org    |  Password: demo123")


if __name__ == "__main__":
    seed()
