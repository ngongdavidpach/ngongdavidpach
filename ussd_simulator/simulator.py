"""AgriConnect USSD/SMS Interactive Simulator.

This is a command-line tool for testing the SMS and USSD interfaces
without needing a real telecom gateway. Simulates the farmer experience
of interacting with AgriConnect via basic phone.

Usage:
    python ussd_simulator/simulator.py
"""
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app
from models import db
from sms_handler import SMSHandler, USSDHandler


def print_banner():
    print("""
╔══════════════════════════════════════════════════════════════╗
║                    🌾 AgriConnect                           ║
║             Farm-to-Market Marketplace                       ║
║                 South Sudan                                  ║
║                                                              ║
║     Interactive SMS & USSD Simulator                         ║
║     USSD Code: *384*72#                                      ║
╚══════════════════════════════════════════════════════════════╝
    """)


def print_menu():
    print("""
┌──────────────────────────────────┐
│  Choose mode:                    │
│                                  │
│  1. 📱 SMS Mode (type commands)  │
│  2. 📞 USSD Mode (menu-based)    │
│  3. ℹ️  Help                      │
│  0. Exit                         │
└──────────────────────────────────┘
    """)


def sms_mode(handler, phone):
    """Interactive SMS command mode."""
    print(f"""
┌─────────────────────────────────────────────────┐
│  📱 SMS Mode                                     │
│  Phone: {phone}                        │
│                                                  │
│  Type commands like you would send via SMS.      │
│  Type 'help' for available commands.              │
│  Type 'back' to return to main menu.             │
└─────────────────────────────────────────────────┘
    """)

    while True:
        try:
            message = input("📤 Send SMS> ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not message:
            continue
        if message.lower() == "back":
            break

        print("\n" + "─" * 50)
        response = handler.process_sms(phone, message)
        print(f"📥 Reply:\n{response}")
        print("─" * 50 + "\n")


def ussd_mode(handler, phone):
    """Interactive USSD menu mode."""
    print(f"""
┌─────────────────────────────────────────────────┐
│  📞 USSD Mode                                    │
│  Phone: {phone}                        │
│  Dialing: *384*72#                               │
│                                                  │
│  Enter menu numbers as prompted.                 │
│  Type 'back' or '0' to go back.                  │
└─────────────────────────────────────────────────┘
    """)

    session_id = "SIM-" + phone[-4:]
    text = ""

    while True:
        response = handler.process_ussd(session_id, phone, "*384*72#", text)

        is_end = response.startswith("END ")
        display = response[4:] if is_end else response[4:]  # Strip CON/END prefix

        print("\n┌─── USSD Screen ──────────────────┐")
        for line in display.split("\n"):
            print(f"│ {line:<34}│")
        print("└────────────────────────────────────┘")

        if is_end:
            print("\n[Session ended. Dial *384*72# to start again.]\n")
            text = ""
            try:
                choice = input("Dial again? (y/n)> ").strip().lower()
            except (EOFError, KeyboardInterrupt):
                break
            if choice != "y":
                break
            continue

        try:
            user_input = input("\n🔢 Enter> ").strip()
        except (EOFError, KeyboardInterrupt):
            break

        if not user_input or user_input.lower() == "back":
            break

        if text:
            text += "*" + user_input
        else:
            text = user_input


def print_help():
    print("""
┌──────────────────────────────────────────────────────────────┐
│                    📖 AgriConnect Help                        │
│                                                              │
│  SMS Commands (send to shortcode):                           │
│  ─────────────────────────────────                           │
│  REGISTER Name, Location, County                             │
│    → Register as a farmer                                    │
│    → Example: REGISTER Achol Deng, Bor, Jonglei              │
│                                                              │
│  LIST Crop, Quantity(kg), Price/kg                           │
│    → List harvest for sale                                   │
│    → Example: LIST Maize, 200, 150                           │
│                                                              │
│  MY LISTINGS                                                 │
│    → View your active listings                               │
│                                                              │
│  UPDATE ListingID, NewQty, NewPrice                          │
│    → Update a listing                                        │
│    → Example: UPDATE 3, 150, 200                             │
│                                                              │
│  DELETE ListingID                                            │
│    → Remove a listing                                        │
│                                                              │
│  STATUS ListingID                                            │
│    → Check listing details & order count                     │
│                                                              │
│  HELP                                                        │
│    → Show this help message                                  │
│                                                              │
│  USSD Menu:                                                  │
│  ──────────                                                  │
│  Dial *384*72# on your phone to access the interactive       │
│  menu. Navigate using number keys.                           │
│                                                              │
│  WhatsApp Bot:                                               │
│  ──────────────                                              │
│  Buyers can message the AgriConnect WhatsApp number to       │
│  browse produce, search, and place orders.                   │
│  Commands: Browse, Search: crop, Order: id qty, Orders       │
│                                                              │
│  Web Dashboard:                                              │
│  ──────────────                                              │
│  Visit the web dashboard to browse produce, manage orders,   │
│  and view farmer profiles.                                   │
└──────────────────────────────────────────────────────────────┘
    """)


def main():
    print_banner()

    # Create app context
    app = create_app()

    with app.app_context():
        db.create_all()

        sms_handler = SMSHandler()
        ussd_handler = USSDHandler()

        # Default demo phone
        phone = "+211912345001"

        while True:
            print_menu()
            try:
                choice = input("Choice> ").strip()
            except (EOFError, KeyboardInterrupt):
                print("\n👋 Goodbye!")
                break

            if choice == "1":
                try:
                    custom_phone = input(f"Phone number [{phone}]> ").strip()
                    if custom_phone:
                        phone = custom_phone
                except (EOFError, KeyboardInterrupt):
                    continue
                sms_mode(sms_handler, phone)

            elif choice == "2":
                try:
                    custom_phone = input(f"Phone number [{phone}]> ").strip()
                    if custom_phone:
                        phone = custom_phone
                except (EOFError, KeyboardInterrupt):
                    continue
                ussd_mode(ussd_handler, phone)

            elif choice == "3":
                print_help()

            elif choice == "0":
                print("\n👋 Goodbye from AgriConnect!")
                break


if __name__ == "__main__":
    main()
