"""AgriConnect Test Suite.

Tests for SMS handling, USSD processing, WhatsApp bot,
web dashboard API, and core business logic.
"""
import os
import sys
import unittest

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db, Farmer, Buyer, ProduceListing, Order, OrderItem, resolve_crop_name
from sms_handler import SMSHandler, USSDHandler
from whatsapp_bot import WhatsAppBot
from utils import (
    format_phone,
    format_currency,
    parse_quantity,
    parse_price,
    generate_order_number,
    validate_phone,
)


class TestUtilities(unittest.TestCase):
    """Test utility functions."""

    def test_format_phone_with_country_code(self):
        self.assertEqual(format_phone("+211912345678"), "+211912345678")

    def test_format_phone_with_leading_zero(self):
        self.assertEqual(format_phone("0912345678"), "+211912345678")

    def test_format_phone_bare(self):
        self.assertEqual(format_phone("912345678"), "+211912345678")

    def test_format_phone_with_211(self):
        self.assertEqual(format_phone("211912345678"), "+211912345678")

    def test_validate_phone_valid(self):
        self.assertTrue(validate_phone("+211912345678"))

    def test_validate_phone_invalid(self):
        self.assertFalse(validate_phone("+1234567890"))

    def test_format_currency(self):
        self.assertEqual(format_currency(1500), "£1,500 SSP")
        self.assertEqual(format_currency(0), "£0 SSP")

    def test_parse_quantity_kg(self):
        qty, unit = parse_quantity("200kg")
        self.assertEqual(qty, 200.0)
        self.assertEqual(unit, "kg")

    def test_parse_quantity_plain_number(self):
        qty, unit = parse_quantity("500")
        self.assertEqual(qty, 500.0)

    def test_parse_quantity_bags(self):
        qty, unit = parse_quantity("3 bags")
        self.assertEqual(qty, 150.0)  # 3 * 50kg
        self.assertEqual(unit, "kg")

    def test_parse_quantity_tons(self):
        qty, unit = parse_quantity("2 tons")
        self.assertEqual(qty, 2000.0)
        self.assertEqual(unit, "kg")

    def test_parse_quantity_invalid(self):
        qty, unit = parse_quantity("abc")
        self.assertIsNone(qty)

    def test_parse_price(self):
        self.assertEqual(parse_price("150ssp"), 150.0)
        self.assertEqual(parse_price("£500"), 500.0)
        self.assertEqual(parse_price("200"), 200.0)

    def test_parse_price_invalid(self):
        self.assertIsNone(parse_price("abc"))

    def test_generate_order_number(self):
        num = generate_order_number()
        self.assertTrue(num.startswith("AC-"))
        self.assertEqual(len(num), 13)

    def test_resolve_crop_name_known(self):
        self.assertEqual(resolve_crop_name("maize"), "Maize")
        self.assertEqual(resolve_crop_name("corn"), "Maize")
        self.assertEqual(resolve_crop_name("simsim"), "Sesame")
        self.assertEqual(resolve_crop_name("groundnut"), "Groundnut")

    def test_resolve_crop_name_unknown(self):
        self.assertEqual(resolve_crop_name("kale"), "Kale")


class BaseTestCase(unittest.TestCase):
    """Base test case with app context and database setup."""

    def setUp(self):
        self.app = create_app("testing")
        self.app_context = self.app.app_context()
        self.app_context.push()
        db.create_all()

        # Create test farmer
        self.farmer = Farmer(
            name="Test Farmer",
            phone="+211912345099",
            location="Test Village",
            county="Test County",
        )
        db.session.add(self.farmer)
        db.session.flush()

        # Create test buyer
        self.buyer = Buyer(
            name="Test Buyer",
            organization="Test NGO",
            buyer_type="ngo",
            email="test@ngo.org",
            phone="+211921000099",
            location="Juba",
        )
        self.buyer.set_password("test123")
        db.session.add(self.buyer)
        db.session.commit()

        self.client = self.app.test_client()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.app_context.pop()


class TestSMSHandler(BaseTestCase):
    """Test SMS command processing."""

    def setUp(self):
        super().setUp()
        self.handler = SMSHandler()

    def test_register_new_farmer(self):
        response = self.handler.process_sms(
            "+211912345050",
            "REGISTER John Test, Bor, Jonglei"
        )
        self.assertIn("Welcome to AgriConnect", response)
        self.assertIn("John Test", response)

        # Verify farmer was created
        farmer = Farmer.query.filter_by(phone="+211912345050").first()
        self.assertIsNotNone(farmer)
        self.assertEqual(farmer.name, "John Test")
        self.assertEqual(farmer.location, "Bor")

    def test_register_already_registered(self):
        response = self.handler.process_sms(
            "+211912345099",
            "REGISTER Test, Place, County"
        )
        self.assertIn("already registered", response)

    def test_register_invalid_format(self):
        response = self.handler.process_sms(
            "+211912345050",
            "REGISTER Only Name"
        )
        self.assertIn("Invalid format", response)

    def test_list_harvest(self):
        response = self.handler.process_sms(
            "+211912345099",
            "LIST Maize, 200, 150"
        )
        self.assertIn("Harvest Listed", response)
        self.assertIn("Maize", response)
        self.assertIn("200", response)

        # Verify listing created
        listing = ProduceListing.query.filter_by(farmer_id=self.farmer.id).first()
        self.assertIsNotNone(listing)
        self.assertEqual(listing.crop_name, "Maize")
        self.assertEqual(listing.quantity_kg, 200.0)
        self.assertEqual(listing.unit_price_ssp, 150.0)

    def test_list_harvest_not_registered(self):
        response = self.handler.process_sms(
            "+211912345050",
            "LIST Maize, 200, 150"
        )
        self.assertIn("not registered", response)

    def test_list_harvest_invalid_quantity(self):
        response = self.handler.process_sms(
            "+211912345099",
            "LIST Maize, abc, 150"
        )
        self.assertIn("Invalid quantity", response)

    def test_list_harvest_crop_alias(self):
        response = self.handler.process_sms(
            "+211912345099",
            "LIST corn, 100, 200"
        )
        self.assertIn("Maize", response)

    def test_my_listings(self):
        # Create a listing first
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Sorghum",
            quantity_kg=300,
            unit_price_ssp=180,
        )
        db.session.add(listing)
        db.session.commit()

        response = self.handler.process_sms(
            "+211912345099",
            "MY LISTINGS"
        )
        self.assertIn("Active Listings", response)
        self.assertIn("Sorghum", response)

    def test_my_listings_empty(self):
        response = self.handler.process_sms(
            "+211912345099",
            "MY LISTINGS"
        )
        self.assertIn("no active listings", response)

    def test_delete_listing(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Beans",
            quantity_kg=100,
            unit_price_ssp=280,
        )
        db.session.add(listing)
        db.session.commit()

        response = self.handler.process_sms(
            "+211912345099",
            f"DELETE {listing.id}"
        )
        self.assertIn("removed", response)

        # Verify deactivated
        db.session.refresh(listing)
        self.assertFalse(listing.is_active)

    def test_help_command(self):
        response = self.handler.process_sms(
            "+211912345099",
            "HELP"
        )
        self.assertIn("AgriConnect", response)
        self.assertIn("REGISTER", response)
        self.assertIn("LIST", response)

    def test_unknown_command(self):
        response = self.handler.process_sms(
            "+211912345099",
            "INVALIDCOMMAND"
        )
        self.assertIn("Unknown command", response)


class TestUSSDHandler(BaseTestCase):
    """Test USSD session processing."""

    def setUp(self):
        super().setUp()
        self.handler = USSDHandler()

    def test_main_menu(self):
        response = self.handler.process_ussd("sess1", "+211912345099", "*384*72#", "")
        self.assertIn("CON", response)
        self.assertIn("Register", response)
        self.assertIn("List My Harvest", response)

    def test_view_listings(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Maize",
            quantity_kg=200,
            unit_price_ssp=150,
        )
        db.session.add(listing)
        db.session.commit()

        response = self.handler.process_ussd("sess1", "+211912345099", "*384*72#", "3")
        self.assertIn("END", response)
        self.assertIn("Maize", response)

    def test_help(self):
        response = self.handler.process_ussd("sess1", "+211912345099", "*384*72#", "6")
        self.assertIn("END", response)
        self.assertIn("Help", response)


class TestWhatsAppBot(BaseTestCase):
    """Test WhatsApp bot interactions."""

    def setUp(self):
        super().setUp()
        self.bot = WhatsAppBot()

    def test_greeting_message(self):
        response = self.bot.process_message("+211921000099", "hi")
        self.assertIn("AgriConnect", response)
        self.assertIn("Browse", response)

    def test_browse_produce_empty(self):
        response = self.bot.process_message("+211921000099", "browse")
        self.assertIn("No produce available", response)

    def test_browse_produce_with_listings(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Maize",
            quantity_kg=500,
            unit_price_ssp=150,
            pickup_location="Test Village",
        )
        db.session.add(listing)
        db.session.commit()

        response = self.bot.process_message("+211921000099", "browse")
        self.assertIn("Maize", response)
        self.assertIn("500", response)

    def test_search_crop(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Sorghum",
            quantity_kg=300,
            unit_price_ssp=180,
        )
        db.session.add(listing)
        db.session.commit()

        response = self.bot.process_message("+211921000099", "sorghum")
        self.assertIn("Sorghum", response)

    def test_help_command(self):
        response = self.bot.process_message("+211921000099", "help")
        self.assertIn("Help", response)

    def test_register_buyer(self):
        response = self.bot.process_message(
            "+211921000088",
            "Reg: New Buyer, Test Org, ngo"
        )
        self.assertIn("Registered", response)

        buyer = Buyer.query.filter_by(phone="+211921000088").first()
        self.assertIsNotNone(buyer)
        self.assertEqual(buyer.name, "New Buyer")

    def test_order_placement(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Maize",
            quantity_kg=500,
            unit_price_ssp=150,
            is_active=True,
        )
        db.session.add(listing)
        db.session.commit()

        response = self.bot.process_message(
            "+211921000099",
            f"Order: {listing.id}, 100"
        )
        self.assertIn("Order Placed", response)

        # Verify order created
        order = Order.query.filter_by(buyer_id=self.buyer.id).first()
        self.assertIsNotNone(order)
        self.assertEqual(order.status, "pending")

    def test_order_without_registration(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Maize",
            quantity_kg=500,
            unit_price_ssp=150,
        )
        db.session.add(listing)
        db.session.commit()

        response = self.bot.process_message(
            "+211921000077",
            f"Order: {listing.id}, 100"
        )
        self.assertIn("register first", response)


class TestWebDashboard(BaseTestCase):
    """Test web dashboard endpoints."""

    def login(self):
        return self.client.post("/login", data={
            "email": "test@ngo.org",
            "password": "test123",
        }, follow_redirects=True)

    def test_login_page(self):
        response = self.client.get("/login")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"AgriConnect", response.data)

    def test_login_success(self):
        response = self.login()
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Dashboard", response.data)

    def test_login_failure(self):
        response = self.client.post("/login", data={
            "email": "test@ngo.org",
            "password": "wrong",
        }, follow_redirects=True)
        self.assertIn(b"Invalid", response.data)

    def test_dashboard_requires_login(self):
        response = self.client.get("/dashboard")
        self.assertEqual(response.status_code, 302)  # Redirect to login

    def test_dashboard_authenticated(self):
        self.login()
        response = self.client.get("/dashboard")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Dashboard", response.data)

    def test_produce_list(self):
        self.login()
        response = self.client.get("/produce")
        self.assertEqual(response.status_code, 200)

    def test_produce_filter(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Maize",
            quantity_kg=200,
            unit_price_ssp=150,
        )
        db.session.add(listing)
        db.session.commit()

        self.login()
        response = self.client.get("/produce?crop=Maize")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Maize", response.data)

    def test_farmers_list(self):
        self.login()
        response = self.client.get("/farmers")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"Test Farmer", response.data)

    def test_create_order(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Maize",
            quantity_kg=500,
            unit_price_ssp=150,
            is_active=True,
        )
        db.session.add(listing)
        db.session.commit()

        self.login()
        response = self.client.post("/orders/create", data={
            "listing_id": listing.id,
            "quantity": 100,
            "delivery_address": "Juba",
        }, follow_redirects=True)
        self.assertEqual(response.status_code, 200)

        order = Order.query.first()
        self.assertIsNotNone(order)
        self.assertEqual(order.status, "pending")
        self.assertEqual(order.total_amount_ssp, 15000.0)

    def test_api_listings(self):
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Sorghum",
            quantity_kg=300,
            unit_price_ssp=180,
        )
        db.session.add(listing)
        db.session.commit()

        response = self.client.get("/api/listings")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["count"], 1)
        self.assertEqual(data["listings"][0]["crop"], "Sorghum")

    def test_api_stats(self):
        response = self.client.get("/api/stats")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertIn("active_listings", data)
        self.assertIn("registered_farmers", data)

    def test_health_check(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.get_json()
        self.assertEqual(data["status"], "healthy")


class TestOrderWorkflow(BaseTestCase):
    """Test the complete order workflow."""

    def test_full_order_flow(self):
        """Test: farmer lists → buyer orders → listing quantity reduced."""
        # 1. Farmer lists harvest via SMS
        sms = SMSHandler()
        response = sms.process_sms(
            "+211912345099",
            "LIST Maize, 500, 150"
        )
        self.assertIn("Harvest Listed", response)

        listing = ProduceListing.query.first()
        self.assertEqual(listing.quantity_kg, 500.0)

        # 2. Buyer places order via WhatsApp
        bot = WhatsAppBot()
        response = bot.process_message(
            "+211921000099",
            f"Order: {listing.id}, 200"
        )
        self.assertIn("Order Placed", response)

        # 3. Verify listing quantity reduced
        db.session.refresh(listing)
        self.assertEqual(listing.quantity_kg, 300.0)
        self.assertTrue(listing.is_active)

        # 4. Order another 300 (all remaining)
        response = bot.process_message(
            "+211921000099",
            f"Order: {listing.id}, 300"
        )
        self.assertIn("Order Placed", response)

        db.session.refresh(listing)
        self.assertEqual(listing.quantity_kg, 0.0)
        self.assertFalse(listing.is_active)  # Auto-deactivated

    def test_order_exceeds_available(self):
        """Test that ordering more than available fails gracefully."""
        listing = ProduceListing(
            farmer_id=self.farmer.id,
            crop_name="Beans",
            quantity_kg=100,
            unit_price_ssp=280,
        )
        db.session.add(listing)
        db.session.commit()

        bot = WhatsAppBot()
        response = bot.process_message(
            "+211921000099",
            f"Order: {listing.id}, 500"
        )
        self.assertIn("Only", response)
        self.assertIn("available", response)


if __name__ == "__main__":
    unittest.main()
