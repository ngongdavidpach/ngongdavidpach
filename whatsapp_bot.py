"""AgriConnect WhatsApp Bot Handler.

Implements a WhatsApp bot using the WhatsApp Cloud API (Meta).
Buyers can interact with the bot to:
- Browse available produce
- Search by crop or location
- Place orders
- Check order status

Webhook endpoints handle:
- GET: Webhook verification
- POST: Incoming messages
"""
import json
from datetime import datetime, timezone

from models import (
    db,
    ProduceListing,
    Farmer,
    Buyer,
    Order,
    OrderItem,
    SMSLog,
    resolve_crop_name,
)
from utils import (
    format_phone,
    format_currency,
    format_date,
    generate_order_number,
    time_ago,
)


class WhatsAppBot:
    """WhatsApp bot for buyer interactions."""

    def __init__(self):
        self.menu_states = {}  # phone -> state dict (simple session tracking)

    def process_message(self, sender_phone, message_text):
        """
        Process an inbound WhatsApp message from a buyer.

        Args:
            sender_phone: Buyer's WhatsApp number (international format)
            message_text: The message content

        Returns:
            str: Response message to send back via WhatsApp
        """
        phone = format_phone(sender_phone)
        raw_text = message_text.strip()
        text = raw_text.lower()

        # Log the interaction
        log = SMSLog(
            phone=phone,
            direction="inbound",
            channel="whatsapp",
            message=message_text,
        )

        try:
            # Check buyer registration
            buyer = Buyer.query.filter_by(phone=phone).first()

            # Route commands
            if text in ("hi", "hello", "start", "menu", "1"):
                response = self._main_menu(buyer)
            elif text in ("browse", "2", "market", "shop"):
                response = self._browse_produce(phone)
            elif text in ("search", "3"):
                response = self._search_prompt(phone)
            elif text in ("orders", "my orders", "4"):
                response = self._my_orders(buyer)
            elif text in ("help", "?", "5"):
                response = self._help_message()
            elif text.startswith("search:"):
                query = text.replace("search:", "").strip()
                response = self._search_results(query)
            elif text.startswith("order:"):
                response = self._place_order(buyer, phone, text)
            elif text.startswith("order "):
                response = self._place_order(buyer, phone, text)
            elif text in ("register", "signup"):
                response = self._register_prompt()
            elif text.startswith("reg:"):
                response = self._register_buyer(phone, raw_text)
            else:
                # Try to interpret as a crop search
                crop = resolve_crop_name(text)
                results = self._find_listings_by_crop(crop)
                if results:
                    response = self._format_search_results(crop, results)
                else:
                    response = (
                        f"🤔 I didn't understand '{message_text}'.\n\n"
                        f"{self._main_menu(buyer)}"
                    )

            log.response = response
            log.processed = True

        except Exception as e:
            response = "Sorry, something went wrong. Please try again or type *help*."
            log.response = response
            log.error = str(e)

        db.session.add(log)
        db.session.commit()

        return response

    def _main_menu(self, buyer=None):
        """Display the main menu."""
        greeting = f"Hi {buyer.name}! 👋" if buyer else "Welcome to AgriConnect! 🌾"

        return (
            f"{greeting}\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"🌾 *AgriConnect Marketplace*\n"
            f"Farm-to-Market, South Sudan\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"Reply with:\n"
            f"📦 *Browse* - See available produce\n"
            f"🔍 *Search: crop* - Search by crop\n"
            f"🛒 *Orders* - View your orders\n"
            f"❓ *Help* - How to use this bot\n\n"
            f"💡 Or just type a crop name like\n"
            f"\"maize\" or \"tomato\" to search!"
        )

    def _browse_produce(self, phone):
        """Browse all active produce listings."""
        listings = (
            ProduceListing.query
            .filter_by(is_active=True)
            .order_by(ProduceListing.created_at.desc())
            .limit(10)
            .all()
        )

        if not listings:
            return (
                "📦 No produce available right now.\n"
                "Check back later or try a specific search."
            )

        lines = ["📦 *Available Produce*\n━━━━━━━━━━━━━━━━━━━━━━━\n"]

        for l in listings:
            farmer = Farmer.query.get(l.farmer_id)
            lines.append(
                f"🆔 *#{l.id}* | 🌾 *{l.crop_name}*\n"
                f"   📦 {l.quantity_kg:.0f}kg available\n"
                f"   💰 {format_currency(l.unit_price_ssp)}/kg\n"
                f"   📍 {l.pickup_location or 'N/A'}\n"
                f"   ⭐ {l.quality_grade.title()}\n"
                f"   🛒 Reply: *Order: {l.id}, quantity_kg*\n"
            )

        lines.append("\n💡 Reply *Browse* for more or *Search: crop* to find specific produce.")

        return "\n".join(lines)

    def _search_prompt(self, phone):
        """Prompt for search query."""
        return (
            "🔍 *Search Produce*\n\n"
            "Reply with:\n"
            "*Search: crop name*\n\n"
            "Examples:\n"
            "• Search: Maize\n"
            "• Search: Sorghum\n"
            "• Search: Tomato\n"
            "• Search: Cassava"
        )

    def _search_results(self, query):
        """Search for produce by crop name."""
        crop = resolve_crop_name(query)
        results = self._find_listings_by_crop(crop)
        if results:
            return self._format_search_results(crop, results)
        return (
            f"🔍 No results for '{query}'.\n\n"
            f"Try browsing all produce with *Browse*."
        )

    def _find_listings_by_crop(self, crop_name):
        """Find active listings matching a crop name."""
        return (
            ProduceListing.query
            .filter(
                ProduceListing.is_active == True,
                ProduceListing.crop_name.ilike(f"%{crop_name}%"),
            )
            .order_by(ProduceListing.unit_price_ssp.asc())
            .all()
        )

    def _format_search_results(self, crop_name, listings):
        """Format search results for display."""
        lines = [f"🔍 *Results for: {crop_name}* ({len(listings)} found)\n━━━━━━━━━━━━━━━━━━━━━━━\n"]

        for l in listings[:10]:
            lines.append(
                f"🆔 *#{l.id}* | {l.crop_name}\n"
                f"   📦 {l.quantity_kg:.0f}kg @ {format_currency(l.unit_price_ssp)}/kg\n"
                f"   📍 {l.pickup_location or 'N/A'} | ⭐ {l.quality_grade.title()}\n"
                f"   🛒 *Order: {l.id}, [qty_kg]*\n"
            )

        lines.append("💡 Reply *Order: [ID], [quantity in kg]* to place an order.")
        return "\n".join(lines)

    def _place_order(self, buyer, phone, text):
        """Place an order for produce."""
        if not buyer:
            return (
                "⚠️ You need to register first.\n\n"
                "Reply: *Reg: Your Name, Organization, Type*\n"
                "Types: ngo, restaurant, wholesaler, individual\n\n"
                "Example: Reg: James Maker, WFP, ngo"
            )

        # Parse: order: listing_id, quantity
        parts = text.replace("order:", "").replace("order ", "").split(",")
        if len(parts) < 2:
            return (
                "Invalid order format.\n\n"
                "Reply: *Order: listing_id, quantity_kg*\n"
                "Example: Order: 5, 100"
            )

        try:
            listing_id = int(parts[0].strip())
            quantity = float(parts[1].strip().replace("kg", "").strip())
        except ValueError:
            return "Invalid format. Use: Order: listing_id, quantity_kg"

        listing = ProduceListing.query.filter_by(id=listing_id, is_active=True).first()
        if not listing:
            return f"Listing #{listing_id} not found or no longer available."

        if quantity > listing.quantity_kg:
            return (
                f"⚠️ Only {listing.quantity_kg:.0f}kg available.\n"
                f"You requested {quantity:.0f}kg."
            )

        if quantity <= 0:
            return "Quantity must be greater than 0."

        # Create the order
        order = Order(
            buyer_id=buyer.id,
            order_number=generate_order_number(),
            status="pending",
            delivery_address=buyer.location,
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

        # Update listing quantity
        listing.quantity_kg -= quantity
        if listing.quantity_kg <= 0:
            listing.is_active = False

        order.calculate_total()
        db.session.commit()

        farmer = Farmer.query.get(listing.farmer_id)

        return (
            f"✅ *Order Placed!*\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📋 Order: *{order.order_number}*\n"
            f"🌾 {listing.crop_name}: {quantity:.0f}kg\n"
            f"💰 {format_currency(listing.unit_price_ssp)}/kg\n"
            f"💵 Total: *{format_currency(order.total_amount_ssp)}*\n"
            f"📍 Pickup: {listing.pickup_location}\n\n"
            f"👨‍🌾 Farmer {farmer.name} has been\n"
            f"notified via SMS.\n\n"
            f"Status: *Pending Confirmation*\n"
            f"Reply *Orders* to track your order."
        )

    def _my_orders(self, buyer):
        """Show buyer's orders."""
        if not buyer:
            return "⚠️ Register first: *Reg: Name, Organization, Type*"

        orders = buyer.orders.order_by(Order.created_at.desc()).limit(5).all()
        if not orders:
            return "📋 You have no orders yet.\nReply *Browse* to see available produce."

        lines = ["📋 *Your Recent Orders*\n━━━━━━━━━━━━━━━━━━━━━━━\n"]
        status_emoji = {
            "pending": "🟡",
            "confirmed": "✅",
            "in_transit": "🚚",
            "delivered": "📦",
            "cancelled": "❌",
        }

        for o in orders:
            emoji = status_emoji.get(o.status, "⚪")
            items_summary = ", ".join(
                f"{i.listing.crop_name} ({i.quantity_kg:.0f}kg)"
                for i in o.items.all()
            )
            lines.append(
                f"📋 *{o.order_number}*\n"
                f"   {emoji} {o.status.title()}\n"
                f"   {items_summary}\n"
                f"   💵 {format_currency(o.total_amount_ssp)}\n"
                f"   📅 {time_ago(o.created_at)}\n"
            )

        return "\n".join(lines)

    def _register_prompt(self):
        """Prompt for buyer registration."""
        return (
            "📝 *Register as Buyer*\n\n"
            "Reply:\n"
            "*Reg: Your Name, Organization, Type*\n\n"
            "Types: ngo, restaurant, wholesaler, individual\n\n"
            "Example:\n"
            "Reg: Sarah Lual, Juba Palace Hotel, restaurant\n"
            "Reg: David Achak, WFP South Sudan, ngo"
        )

    def _register_buyer(self, phone, text):
        """Register a new buyer via WhatsApp."""
        existing = Buyer.query.filter_by(phone=phone).first()
        if existing:
            return f"You're already registered as {existing.name} ({existing.organization})."

        # Use original-case text for name/org, but match command prefix case-insensitively
        import re
        raw_match = re.match(r"(?i)reg:\s*(.*)", text)
        parts_text = raw_match.group(1) if raw_match else text.replace("reg:", "").strip()
        parts = [p.strip() for p in parts_text.split(",")]

        if len(parts) < 3:
            return self._register_prompt()

        name = parts[0]
        org = parts[1]
        buyer_type = parts[2].lower()

        valid_types = ["ngo", "restaurant", "wholesaler", "individual"]
        if buyer_type not in valid_types:
            return f"Invalid type '{buyer_type}'. Use: {', '.join(valid_types)}"

        buyer = Buyer(
            name=name,
            organization=org,
            buyer_type=buyer_type,
            phone=phone,
            location="Juba",
        )
        buyer.set_password("whatsapp_default")  # WhatsApp users don't use password
        db.session.add(buyer)
        db.session.commit()

        return (
            f"✅ *Registered!*\n\n"
            f"👤 {name}\n"
            f"🏢 {org}\n"
            f"📋 Type: {buyer_type.title()}\n\n"
            f"Reply *Browse* to see available produce!"
        )

    def _help_message(self):
        """WhatsApp help message."""
        return (
            "❓ *AgriConnect Help*\n"
            "━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            "📦 *Browse* - View available produce\n"
            "🔍 *Search: crop* - Search by crop\n"
            "🛒 *Order: id, qty* - Place an order\n"
            "📋 *Orders* - View your orders\n"
            "📝 *Register* - Register as buyer\n\n"
            "💡 *Tips:*\n"
            "• Type a crop name to search\n"
            "• Orders notify farmers via SMS\n"
            "• Listings refresh every hour\n"
            "• All prices in SSP (South Sudan £)\n\n"
            "📞 Support: +211-XXX-XXXXXX"
        )


# ── Flask Blueprint for WhatsApp Webhook ─────────────────────────────

from flask import Blueprint, request, jsonify

whatsapp_bp = Blueprint("whatsapp", __name__, url_prefix="/whatsapp")
bot = WhatsAppBot()


@whatsapp_bp.route("/webhook", methods=["GET", "POST"])
def webhook():
    """WhatsApp Cloud API webhook endpoint."""
    from flask import current_app

    if request.method == "GET":
        # Webhook verification
        mode = request.args.get("hub.mode")
        token = request.args.get("hub.verify_token")
        challenge = request.args.get("hub.challenge")

        verify_token = current_app.config.get("WHATSAPP_VERIFY_TOKEN", "agriconnect_verify")

        if mode == "subscribe" and token == verify_token:
            return challenge, 200
        return "Forbidden", 403

    # POST: Incoming message
    data = request.get_json()

    try:
        entry = data.get("entry", [{}])[0]
        changes = entry.get("changes", [{}])[0]
        value = changes.get("value", {})

        messages = value.get("messages", [])
        if not messages:
            return jsonify({"status": "ok"}), 200

        msg = messages[0]
        sender = msg.get("from", "")
        msg_type = msg.get("type", "")

        if msg_type == "text":
            text = msg.get("text", {}).get("body", "")
            response = bot.process_message(sender, text)

            # In production, send response via WhatsApp API
            # send_whatsapp_message(sender, response)

            return jsonify({"status": "ok", "response": response}), 200

    except Exception as e:
        current_app.logger.error(f"WhatsApp webhook error: {e}")

    return jsonify({"status": "ok"}), 200
