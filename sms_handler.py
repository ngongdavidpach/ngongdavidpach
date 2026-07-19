"""AgriConnect SMS/USSD Handler.

Processes inbound SMS and USSD messages from farmers.
Supports the following commands:

  SMS Commands (sent to shortcode):
    REGISTER <name>, <location>, <county>
    LIST <crop>, <quantity_kg>, <price_per_kg>
    MY LISTINGS
    UPDATE <listing_id>, <new_quantity>, <new_price>
    DELETE <listing_id>
    STATUS <listing_id>
    HELP

  USSD Menu Flow:
    *384*72# → Main Menu
      1. Register
      2. List Harvest
      3. My Listings
      4. Help
"""
from datetime import datetime, timezone

from models import db, Farmer, ProduceListing, SMSLog, resolve_crop_name
from utils import (
    format_phone,
    format_currency,
    parse_quantity,
    parse_price,
    default_expiry,
    time_ago,
)


class SMSHandler:
    """Processes inbound SMS messages and returns responses."""

    def __init__(self):
        self.commands = {
            "register": self._handle_register,
            "reg": self._handle_register,
            "list": self._handle_list,
            "sell": self._handle_list,
            "my listings": self._handle_my_listings,
            "mylisting": self._handle_my_listings,
            "listings": self._handle_my_listings,
            "update": self._handle_update,
            "delete": self._handle_delete,
            "status": self._handle_status,
            "help": self._handle_help,
            "?": self._handle_help,
        }

    def process_sms(self, sender_phone, message_body):
        """
        Main entry point for inbound SMS processing.

        Args:
            sender_phone: The farmer's phone number
            message_body: The SMS text content

        Returns:
            str: Response message to send back
        """
        phone = format_phone(sender_phone)
        body = message_body.strip()

        # Log the inbound message
        log = SMSLog(
            phone=phone,
            direction="inbound",
            channel="sms",
            message=body,
        )

        try:
            # Parse command — check for multi-word commands first
            lower_body = body.lower()
            handler = None
            args = ""

            # Check multi-word commands first
            for cmd_key in sorted(self.commands.keys(), key=len, reverse=True):
                if lower_body.startswith(cmd_key):
                    handler = self.commands[cmd_key]
                    args = body[len(cmd_key):].strip()
                    break

            if handler is None:
                parts = body.split(None, 1)
                if not parts:
                    response = self._help_message()
                else:
                    command = parts[0].lower()
                    args = parts[1] if len(parts) > 1 else ""
                    handler = self.commands.get(command)

            if handler:
                response = handler(phone, args)
            else:
                parts = body.split(None, 1)
                response = (
                    f"Unknown command: '{parts[0]}'.\n\n"
                    f"{self._help_message()}"
                )

            log.response = response
            log.processed = True

        except Exception as e:
            response = f"Sorry, an error occurred. Please try again or send HELP for instructions."
            log.response = response
            log.error = str(e)
            log.processed = True

        # Log and save
        farmer = Farmer.query.filter_by(phone=phone).first()
        if farmer:
            log.farmer_id = farmer.id
        db.session.add(log)
        db.session.commit()

        return response

    def _get_farmer(self, phone):
        """Get farmer by phone or return None."""
        return Farmer.query.filter_by(phone=phone).first()

    def _require_farmer(self, phone):
        """Get farmer or return error message tuple (None, error_msg)."""
        farmer = self._get_farmer(phone)
        if not farmer:
            return None, (
                "You are not registered. "
                "To register, send:\n"
                "REGISTER Your Name, Location, County\n\n"
                "Example:\nREGISTER John Dau, Bor, Jonglei"
            )
        return farmer, None

    # ── Command Handlers ─────────────────────────────────────────────

    def _handle_register(self, phone, args):
        """Register a new farmer."""
        existing = self._get_farmer(phone)
        if existing:
            return (
                f"You are already registered as {existing.name} "
                f"from {existing.location}, {existing.county}.\n\n"
                f"To list produce, send:\nLIST crop, quantity(kg), price/kg"
            )

        # Parse: REGISTER Name, Location, County
        parts = [p.strip() for p in args.split(",")]
        if len(parts) < 3:
            return (
                "Invalid format. Please send:\n"
                "REGISTER Your Name, Location, County\n\n"
                "Example:\nREGISTER Achol Deng, Yei, Central Equatoria"
            )

        name = parts[0].strip()
        location = parts[1].strip()
        county = parts[2].strip()

        if not all([name, location, county]):
            return "All fields are required: Name, Location, County"

        farmer = Farmer(
            name=name,
            phone=phone,
            location=location,
            county=county,
        )
        db.session.add(farmer)
        db.session.commit()

        return (
            f"✅ Welcome to AgriConnect, {name}!\n\n"
            f"📍 Registered: {location}, {county}\n"
            f"📱 Phone: {phone}\n\n"
            f"To list your harvest, send:\n"
            f"LIST crop, quantity(kg), price/kg\n\n"
            f"Example:\nLIST Maize, 200, 150\n\n"
            f"Send HELP for more commands."
        )

    def _handle_list(self, phone, args):
        """List a new harvest for sale."""
        farmer, err = self._require_farmer(phone)
        if err:
            return err

        # Parse: LIST crop, quantity, price
        parts = [p.strip() for p in args.split(",")]
        if len(parts) < 3:
            return (
                "Invalid format. Please send:\n"
                "LIST crop, quantity(kg), price/kg\n\n"
                "Examples:\n"
                "LIST Maize, 200, 150\n"
                "LIST Sorghum, 500kg, 200\n"
                "LIST Tomato, 50, 800"
            )

        crop_input = parts[0]
        qty_text = parts[1]
        price_text = parts[2]

        # Resolve crop name
        crop_name = resolve_crop_name(crop_input)

        # Parse quantity
        quantity, _ = parse_quantity(qty_text)
        if quantity is None or quantity <= 0:
            return f"Invalid quantity: '{qty_text}'. Please provide weight in kg.\nExample: 200 or 200kg"

        # Parse price
        price = parse_price(price_text)
        if price is None or price <= 0:
            return f"Invalid price: '{price_text}'. Please provide price per kg in SSP.\nExample: 150"

        # Optional quality grade from 4th argument
        quality = "standard"
        if len(parts) >= 4:
            q = parts[3].strip().lower()
            if q in ("premium", "standard", "fair"):
                quality = q

        listing = ProduceListing(
            farmer_id=farmer.id,
            crop_name=crop_name,
            quantity_kg=quantity,
            unit_price_ssp=price,
            quality_grade=quality,
            pickup_location=f"{farmer.location}, {farmer.county}",
            expires_at=default_expiry(),
        )
        db.session.add(listing)
        db.session.commit()

        total_value = quantity * price
        return (
            f"✅ Harvest Listed!\n\n"
            f"🌾 Crop: {crop_name}\n"
            f"📦 Quantity: {quantity:.0f} kg\n"
            f"💰 Price: {format_currency(price)}/kg\n"
            f"📊 Total Value: {format_currency(total_value)}\n"
            f"📍 Pickup: {listing.pickup_location}\n"
            f"🆔 Listing ID: {listing.id}\n"
            f"⏰ Expires: 7 days\n\n"
            f"Buyers in Juba will be notified!\n"
            f"Send MY LISTINGS to see all your listings."
        )

    def _handle_my_listings(self, phone, args):
        """Show all active listings for a farmer."""
        farmer, err = self._require_farmer(phone)
        if err:
            return err

        listings = farmer.active_listings
        if not listings:
            return (
                f"Hi {farmer.name}, you have no active listings.\n\n"
                f"To list harvest, send:\n"
                f"LIST crop, quantity(kg), price/kg"
            )

        lines = [f"📋 Your Active Listings ({len(listings)}):\n"]
        for i, l in enumerate(listings, 1):
            lines.append(
                f"{i}. [{l.id}] {l.crop_name}\n"
                f"   {l.quantity_kg:.0f}kg @ {format_currency(l.unit_price_ssp)}/kg\n"
                f"   Posted: {time_ago(l.created_at)}"
            )

        lines.append(f"\nTo update: UPDATE id, qty, price")
        lines.append(f"To delete: DELETE id")

        return "\n".join(lines)

    def _handle_update(self, phone, args):
        """Update an existing listing."""
        farmer, err = self._require_farmer(phone)
        if err:
            return err

        parts = [p.strip() for p in args.split(",")]
        if len(parts) < 3:
            return (
                "Invalid format. Please send:\n"
                "UPDATE listing_id, new_quantity(kg), new_price\n\n"
                "Example: UPDATE 5, 150, 200"
            )

        try:
            listing_id = int(parts[0])
        except ValueError:
            return "Invalid listing ID. Send MY LISTINGS to see your listing IDs."

        listing = ProduceListing.query.filter_by(
            id=listing_id, farmer_id=farmer.id, is_active=True
        ).first()

        if not listing:
            return f"Listing #{listing_id} not found or not active."

        quantity, _ = parse_quantity(parts[1])
        if quantity is not None and quantity > 0:
            listing.quantity_kg = quantity

        price = parse_price(parts[2])
        if price is not None and price > 0:
            listing.unit_price_ssp = price

        db.session.commit()

        return (
            f"✅ Listing #{listing.id} Updated!\n"
            f"🌾 {listing.crop_name}: {listing.quantity_kg:.0f}kg "
            f"@ {format_currency(listing.unit_price_ssp)}/kg"
        )

    def _handle_delete(self, phone, args):
        """Delete/deactivate a listing."""
        farmer, err = self._require_farmer(phone)
        if err:
            return err

        try:
            listing_id = int(args.strip())
        except ValueError:
            return "Invalid listing ID. Send MY LISTINGS to see your listing IDs."

        listing = ProduceListing.query.filter_by(
            id=listing_id, farmer_id=farmer.id, is_active=True
        ).first()

        if not listing:
            return f"Listing #{listing_id} not found or not active."

        listing.is_active = False
        db.session.commit()

        return f"✅ Listing #{listing.id} ({listing.crop_name}) has been removed."

    def _handle_status(self, phone, args):
        """Check the status of a specific listing."""
        farmer, err = self._require_farmer(phone)
        if err:
            return err

        try:
            listing_id = int(args.strip())
        except ValueError:
            return "Invalid listing ID."

        listing = ProduceListing.query.filter_by(
            id=listing_id, farmer_id=farmer.id
        ).first()

        if not listing:
            return f"Listing #{listing_id} not found."

        # Get order count
        order_count = listing.order_items.count()

        return (
            f"📊 Listing #{listing.id} Status:\n"
            f"🌾 {listing.crop_name} ({listing.quality_grade})\n"
            f"📦 Remaining: {listing.quantity_kg:.0f}kg\n"
            f"💰 Price: {format_currency(listing.unit_price_ssp)}/kg\n"
            f"🛒 Orders received: {order_count}\n"
            f"📍 Pickup: {listing.pickup_location}\n"
            f"📅 Listed: {time_ago(listing.created_at)}\n"
            f"{'✅ Active' if listing.is_active else '❌ Inactive'}"
        )

    def _handle_help(self, phone, args):
        """Return help message."""
        return self._help_message()

    def _help_message(self):
        """Standard help text."""
        return (
            "🌾 AgriConnect - Farm to Market\n"
            "━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "📝 REGISTER Name, Location, County\n"
            "   Register as a farmer\n\n"
            "📦 LIST Crop, Quantity(kg), Price/kg\n"
            "   List harvest for sale\n\n"
            "📋 MY LISTINGS\n"
            "   View your active listings\n\n"
            "✏️ UPDATE ID, Qty, Price\n"
            "   Update a listing\n\n"
            "🗑️ DELETE ID\n"
            "   Remove a listing\n\n"
            "📊 STATUS ID\n"
            "   Check listing status\n\n"
            "━━━━━━━━━━━━━━━━━━━━━━━\n"
            "USSD: Dial *384*72#\n"
            "📞 Support: +211-XXX-XXXXXX"
        )


class USSDHandler:
    """Handles USSD session-based interactions for farmers."""

    def __init__(self):
        self.sms_handler = SMSHandler()

    def process_ussd(self, session_id, phone, service_code, text):
        """
        Process a USSD request (Africa's Talking USSD format).

        Args:
            session_id: Unique USSD session identifier
            phone: The farmer's phone number
            service_code: The USSD code dialed (e.g., *384*72#)
            text: The USSD input so far (empty = initial, concatenated with *)

        Returns:
            str: USSD response (CON = continue, END = terminate)
        """
        phone = format_phone(phone)
        levels = text.split("*") if text else [""]

        # Main menu
        if text == "" or text == "0":
            response = (
                "CON 🌾 AgriConnect\n"
                "━━━━━━━━━━━━━━━━━━\n"
                "1. Register as Farmer\n"
                "2. List My Harvest\n"
                "3. View My Listings\n"
                "4. Update a Listing\n"
                "5. Delete a Listing\n"
                "6. Help\n"
                "0. Exit"
            )
            return response

        # Level 1 selections
        choice = levels[0]

        if choice == "1":
            return self._ussd_register(phone, levels)
        elif choice == "2":
            return self._ussd_list_harvest(phone, levels)
        elif choice == "3":
            return self._ussd_view_listings(phone, levels)
        elif choice == "4":
            return self._ussd_update_listing(phone, levels)
        elif choice == "5":
            return self._ussd_delete_listing(phone, levels)
        elif choice == "6":
            return self._ussd_help()
        else:
            return "END Invalid option. Please dial *384*72# again."

    def _ussd_register(self, phone, levels):
        """USSD registration flow."""
        farmer = Farmer.query.filter_by(phone=phone).first()

        if farmer:
            return (
                f"END You are already registered.\n"
                f"Name: {farmer.name}\n"
                f"Location: {farmer.location}, {farmer.county}\n\n"
                f"Dial *384*72# for main menu."
            )

        if len(levels) == 1:
            return "CON Enter your full name:"

        elif len(levels) == 2:
            return f"CON Hello {levels[1]}, enter your village/location:"

        elif len(levels) == 3:
            return f"CON Enter your county:"

        elif len(levels) == 4:
            name = levels[1].strip()
            location = levels[2].strip()
            county = levels[3].strip()

            if not all([name, location, county]):
                return "END Error: All fields required. Please try again."

            farmer = Farmer(
                name=name, phone=phone, location=location, county=county
            )
            db.session.add(farmer)
            db.session.commit()

            return (
                f"END ✅ Welcome to AgriConnect, {name}!\n"
                f"📍 {location}, {county}\n\n"
                f"Dial *384*72# to list your harvest."
            )

    def _ussd_list_harvest(self, phone, levels):
        """USSD listing creation flow."""
        farmer = Farmer.query.filter_by(phone=phone).first()
        if not farmer:
            return (
                "END You are not registered.\n"
                "Select option 1 to register first."
            )

        if len(levels) == 1:
            return (
                "CON Enter crop name:\n"
                "e.g. Maize, Sorghum, Cassava,\n"
                "Tomato, Beans, Groundnut"
            )

        elif len(levels) == 2:
            return f"CON Enter quantity in kg:"

        elif len(levels) == 3:
            return f"CON Enter price per kg (SSP):"

        elif len(levels) == 4:
            crop = resolve_crop_name(levels[1])
            quantity, _ = parse_quantity(levels[2])
            price = parse_price(levels[3])

            if quantity is None or quantity <= 0:
                return "END Invalid quantity. Please try again."
            if price is None or price <= 0:
                return "END Invalid price. Please try again."

            listing = ProduceListing(
                farmer_id=farmer.id,
                crop_name=crop,
                quantity_kg=quantity,
                unit_price_ssp=price,
                pickup_location=f"{farmer.location}, {farmer.county}",
                expires_at=default_expiry(),
            )
            db.session.add(listing)
            db.session.commit()

            total = quantity * price
            return (
                f"END ✅ Harvest Listed!\n"
                f"🌾 {crop}: {quantity:.0f}kg\n"
                f"💰 {format_currency(price)}/kg\n"
                f"📊 Total: {format_currency(total)}\n"
                f"🆔 ID: {listing.id}\n\n"
                f"Dial *384*72# for more options."
            )

    def _ussd_view_listings(self, phone, levels):
        """USSD view listings."""
        farmer = Farmer.query.filter_by(phone=phone).first()
        if not farmer:
            return "END You are not registered. Select option 1 to register."

        listings = farmer.active_listings
        if not listings:
            return (
                "END You have no active listings.\n"
                "Select option 2 to list harvest."
            )

        lines = [f"END 📋 Your Listings ({len(listings)}):\n"]
        for i, l in enumerate(listings, 1):
            lines.append(
                f"{i}. [{l.id}] {l.crop_name}\n"
                f"   {l.quantity_kg:.0f}kg @ {format_currency(l.unit_price_ssp)}/kg"
            )
        lines.append(f"\nDial *384*72# for more.")

        return "\n".join(lines)

    def _ussd_update_listing(self, phone, levels):
        """USSD update listing flow."""
        farmer = Farmer.query.filter_by(phone=phone).first()
        if not farmer:
            return "END You are not registered."

        if len(levels) == 1:
            return "CON Enter listing ID to update:"

        elif len(levels) == 2:
            try:
                lid = int(levels[1])
            except ValueError:
                return "END Invalid listing ID."
            listing = ProduceListing.query.filter_by(
                id=lid, farmer_id=farmer.id, is_active=True
            ).first()
            if not listing:
                return f"END Listing #{lid} not found."
            return f"CON [{listing.id}] {listing.crop_name} ({listing.quantity_kg:.0f}kg)\nEnter new quantity (kg):"

        elif len(levels) == 3:
            return "CON Enter new price per kg (SSP):"

        elif len(levels) == 4:
            try:
                lid = int(levels[1])
            except ValueError:
                return "END Invalid listing ID."
            listing = ProduceListing.query.filter_by(
                id=lid, farmer_id=farmer.id, is_active=True
            ).first()
            if not listing:
                return f"END Listing #{lid} not found."

            qty, _ = parse_quantity(levels[2])
            price = parse_price(levels[3])

            if qty and qty > 0:
                listing.quantity_kg = qty
            if price and price > 0:
                listing.unit_price_ssp = price

            db.session.commit()

            return (
                f"END ✅ Listing #{listing.id} updated.\n"
                f"{listing.crop_name}: {listing.quantity_kg:.0f}kg "
                f"@ {format_currency(listing.unit_price_ssp)}/kg"
            )

    def _ussd_delete_listing(self, phone, levels):
        """USSD delete listing flow."""
        farmer = Farmer.query.filter_by(phone=phone).first()
        if not farmer:
            return "END You are not registered."

        if len(levels) == 1:
            return "CON Enter listing ID to delete:"

        elif len(levels) == 2:
            try:
                lid = int(levels[1])
            except ValueError:
                return "END Invalid listing ID."

            listing = ProduceListing.query.filter_by(
                id=lid, farmer_id=farmer.id, is_active=True
            ).first()
            if not listing:
                return f"END Listing #{lid} not found."

            listing.is_active = False
            db.session.commit()

            return f"END ✅ Listing #{lid} ({listing.crop_name}) deleted."

    def _ussd_help(self):
        """USSD help message."""
        return (
            "END 🌾 AgriConnect Help\n"
            "━━━━━━━━━━━━━━━━━━\n"
            "• Register with your name\n"
            "  and location\n"
            "• List your harvest with\n"
            "  crop, quantity & price\n"
            "• Buyers in Juba will\n"
            "  see your produce\n"
            "• You get SMS when orders\n"
            "  are placed\n\n"
            "SMS Commands also work!\n"
            "Send HELP to our shortcode.\n\n"
            "📞 Support: +211-XXX-XXXXXX"
        )
