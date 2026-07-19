"""AgriConnect Utility Functions."""
import re
import random
import string
from datetime import datetime, timedelta, timezone

from config import Config


def generate_order_number():
    """Generate a unique order number like AC-2026-XXXXX."""
    now = datetime.now(timezone.utc)
    rand = "".join(random.choices(string.digits, k=5))
    return f"AC-{now.year}-{rand}"


def format_phone(phone):
    """Normalize a phone number to international format (+211...)."""
    phone = re.sub(r"[\s\-\(\)]", "", str(phone))
    if phone.startswith("0"):
        phone = Config.COUNTRY_CODE + phone[1:]
    elif phone.startswith("211"):
        phone = "+" + phone
    elif not phone.startswith("+"):
        phone = Config.COUNTRY_CODE + phone
    return phone


def format_currency(amount):
    """Format an amount in South Sudanese Pounds."""
    return f"{Config.CURRENCY_SYMBOL}{amount:,.0f} SSP"


def format_date(dt):
    """Format a datetime for display."""
    if dt is None:
        return "N/A"
    return dt.strftime("%d %b %Y, %H:%M")


def format_date_short(dt):
    """Format a date for display."""
    if dt is None:
        return "N/A"
    return dt.strftime("%d %b %Y")


def time_ago(dt):
    """Human-readable time difference."""
    if dt is None:
        return "N/A"
    now = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    diff = now - dt
    seconds = int(diff.total_seconds())
    if seconds < 60:
        return "just now"
    elif seconds < 3600:
        mins = seconds // 60
        return f"{mins}m ago"
    elif seconds < 86400:
        hours = seconds // 3600
        return f"{hours}h ago"
    else:
        days = seconds // 86400
        return f"{days}d ago"


def parse_quantity(text):
    """Parse quantity from text like '50kg', '50 kg', '50'.
    Returns (quantity_float, unit_str) or (None, None) on failure.
    """
    text = text.strip().lower()
    patterns = [
        r"(\d+(?:\.\d+)?)\s*(kg|kgs|kilogram|kilograms|kilo|kilos)",
        r"(\d+(?:\.\d+)?)\s*(bags?|sacks?|tons?|tonnes?)",
        r"(\d+(?:\.\d+)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            qty = float(match.group(1))
            unit = match.group(2) if match.lastindex >= 2 else "kg"
            # Normalize bag/sack to kg (assume 50kg per bag)
            if unit in ("bag", "bags", "sack", "sacks"):
                qty *= 50
                unit = "kg"
            elif unit in ("ton", "tons", "tonne", "tonnes"):
                qty *= 1000
                unit = "kg"
            return qty, unit
    return None, None


def parse_price(text):
    """Parse price from text like '500ssp', '500 ssp', '£500'.
    Returns price as float or None on failure.
    """
    text = text.strip().lower()
    patterns = [
        r"(\d+(?:\.\d+)?)\s*(?:ssp|£|pounds?)",
        r"(?:ssp|£|pounds?)\s*(\d+(?:\.\d+)?)",
        r"(\d+(?:\.\d+)?)",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if match:
            return float(match.group(1))
    return None


def default_expiry():
    """Default listing expiry: 7 days from now."""
    return datetime.now(timezone.utc) + timedelta(days=7)


def validate_phone(phone):
    """Validate a South Sudan phone number."""
    formatted = format_phone(phone)
    # South Sudan numbers: +211 followed by 9 digits
    return bool(re.match(r"^\+211\d{9}$", formatted))
