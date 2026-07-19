# 🌾 AgriConnect — Farm-to-Market Marketplace

> **Connecting South Sudan's rural farmers with buyers in Juba, NGOs, and restaurants through SMS, USSD, and WhatsApp.**

Agriculture is the backbone of South Sudan's economy, yet farmers struggle to find buyers, and markets struggle to find consistent supply. **AgriConnect** bridges this gap with a lightweight, mobile-first platform designed for the realities of rural connectivity.

![Architecture](https://img.shields.io/badge/Architecture-Lightweight-green) ![Python](https://img.shields.io/badge/Python-3.10+-blue) ![Flask](https://img.shields.io/badge/Flask-3.0-green) ![License](https://img.shields.io/badge/License-MIT-yellow)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      🌾 AgriConnect                             │
│                                                                 │
│  ┌─────────────┐   ┌──────────────┐   ┌────────────────────┐   │
│  │  📱 Farmers  │   │  💻 Buyers   │   │  📱 WhatsApp Bot   │   │
│  │             │   │              │   │                    │   │
│  │  SMS/USSD   │   │  Web Dashbd  │   │  Meta Cloud API    │   │
│  │  *384*72#   │   │  (Flask)     │   │                    │   │
│  └──────┬──────┘   └──────┬───────┘   └──────────┬─────────┘   │
│         │                 │                       │             │
│         ▼                 ▼                       ▼             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                   Flask REST API                          │   │
│  │  SMS Handler │ USSD Handler │ WhatsApp Bot │ Web Routes   │   │
│  └─────────────────────────┬────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  SQLite Database                          │   │
│  │  Farmers │ Buyers │ Listings │ Orders │ SMS Logs          │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Design Philosophy

- **No heavy apps required** — farmers interact via basic SMS/USSD on any phone
- **Works offline-first** — SMS commands are processed asynchronously
- **Multi-channel** — SMS, USSD (*384*72#), WhatsApp bot, and web dashboard
- **Local context** — South Sudanese crops, SSP currency, +211 phone numbers, county-level geography

---

## ✨ Features

### For Farmers (SMS / USSD)
| Command | Description | Example |
|---------|-------------|---------|
| `REGISTER` | Register with name, location, county | `REGISTER Achol Deng, Bor, Jonglei` |
| `LIST` | List harvest for sale | `LIST Maize, 200, 150` |
| `MY LISTINGS` | View active listings | `MY LISTINGS` |
| `UPDATE` | Modify listing qty/price | `UPDATE 3, 150, 200` |
| `DELETE` | Remove a listing | `DELETE 3` |
| `STATUS` | Check listing status | `STATUS 3` |
| `HELP` | Show commands | `HELP` |

**USSD Menu**: Dial `*384*72#` for interactive step-by-step navigation.

### For Buyers (Web Dashboard + WhatsApp)
- 📦 **Browse** all available produce with filters (crop, county, quality, sort)
- 🔍 **Search** by crop name
- 🛒 **Place orders** with instant farmer notification via SMS
- 📋 **Track orders** through the full lifecycle (pending → confirmed → in transit → delivered)
- 👥 **Farmer directory** with profiles and available stock

### WhatsApp Bot
Buyers can message the bot to:
- Browse available produce
- Search by crop name (just type "maize" or "tomato")
- Place orders: `Order: 5, 100` (listing ID, quantity in kg)
- View order history
- Register as a buyer

---

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- pip

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd ngongdavidpach

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Seed demo data
python seed_data.py

# Run the development server
python app.py
```

The web dashboard will be available at **http://localhost:5000**

### Demo Credentials
| Email | Password | Organization |
|-------|----------|-------------|
| `james.maker@wfp.org` | `demo123` | WFP (NGO) |
| `amina@jubapalace.com` | `demo123` | Juba Palace Hotel |
| `michael@ladodist.com` | `demo123` | Lado Wholesale |
| `nyamal@unicef.org` | `demo123` | UNICEF (NGO) |

### Interactive Simulator

Test the SMS/USSD experience without a phone:

```bash
python ussd_simulator/simulator.py
```

This launches an interactive CLI where you can:
- Send SMS commands as a farmer
- Navigate the USSD menu tree
- Register, list produce, and manage listings

---

## 📁 Project Structure

```
.
├── app.py                    # Flask application factory & entry point
├── config.py                 # Configuration (dev, prod, test)
├── models.py                 # Database models (Farmer, Buyer, Listing, Order)
├── sms_handler.py            # SMS command parser & USSD session handler
├── whatsapp_bot.py           # WhatsApp bot handler & webhook blueprint
├── api.py                    # Web dashboard routes & REST API
├── utils.py                  # Shared utilities (formatting, parsing)
├── seed_data.py              # Demo data seeder
├── requirements.txt          # Python dependencies
├── templates/                # Jinja2 HTML templates
│   ├── base.html             # Layout with sidebar navigation
│   ├── login.html            # Auth page (login/register)
│   ├── dashboard.html        # Buyer dashboard with stats
│   ├── produce.html          # Browse produce listings
│   ├── produce_detail.html   # Listing detail + order form
│   ├── orders.html           # Order list with status filters
│   ├── order_detail.html     # Order detail with timeline
│   └── farmers.html          # Farmer directory
├── static/
│   ├── css/style.css         # Complete responsive stylesheet
│   └── js/app.js             # Client-side interactivity
├── ussd_simulator/
│   └── simulator.py          # Interactive SMS/USSD testing tool
└── tests/
    └── test_agriconnect.py   # Comprehensive test suite (50+ tests)
```

---

## 🧪 Testing

```bash
# Run all tests
python -m pytest tests/ -v

# Run with coverage
python -m pytest tests/ -v --tb=short
```

Test coverage includes:
- SMS command parsing and responses
- USSD session flows
- WhatsApp bot interactions
- Web dashboard authentication & authorization
- Order workflow (create, track, complete)
- Utility functions (phone formatting, quantity parsing)
- Edge cases (invalid input, unregistered users, exceeded quantities)

---

## 🌍 South Sudan Context

### Supported Crops
Grains: Maize, Sorghum, Millet, Rice
Legumes: Beans, Groundnut
Tubers: Cassava, Sweet Potato
Vegetables: Tomato, Onion, Okra, Cabbage, Spinach
Fruits: Mango, Banana
Oilseeds: Sesame (Simsim)

### Counties Covered
Jonglei · Central Equatoria · Upper Nile · Northern Bahr el Ghazal · Eastern Equatoria · Lakes · Western Bahr el Ghazal · Unity · Western Equatoria · Warrap

### Currency
All prices in **SSP** (South Sudanese Pound), displayed as **£X SSP**

---

## 🔌 Integration Points

### SMS Gateway (Production)
Replace the simulator with a real gateway:
- **Africa's Talking** — Best coverage in East Africa
- **Twilio** — Global SMS API
- Configure via environment variables in `config.py`

### USSD Gateway (Production)
- **Africa's Talking USSD** — Set `SMS_GATEWAY=africastalking`
- The USSD handler follows AT's callback format

### WhatsApp Cloud API (Production)
- Create a Meta Business app
- Configure webhook URL: `POST /whatsapp/webhook`
- Set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID`

### Deployment
```bash
# Production with Gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 "app:create_app('production')"
```

---

## 📱 User Journeys

### Farmer Journey
```
1. Farmer sends: REGISTER Achol Deng, Bor, Jonglei
   ← "Welcome to AgriConnect, Achol Deng!"

2. Farmer sends: LIST Maize, 500, 150
   ← "Harvest Listed! Maize, 500kg @ £150 SSP/kg"

3. Buyer places order → Farmer receives SMS:
   ← "New order AC-2026-12345: 200kg of Maize for £30,000 SSP"

4. Farmer sends: MY LISTINGS
   ← Shows remaining stock and order count
```

### Buyer Journey
```
1. Buyer logs into web dashboard
2. Browses produce, filters by crop/county
3. Views listing details
4. Places order (specifies quantity + delivery address)
5. Tracks order through: Pending → Confirmed → In Transit → Delivered
```

---

## 📄 License

MIT License — Built for South Sudan's agricultural development.

---

## 🤝 Contributing

Contributions welcome! Areas of focus:
- **Localization**: Juba Arabic (ar) translations for SMS responses
- **More crops**: Expand the crop catalog
- **Payment integration**: Mobile money (m-Gurush, Fari) for order payments
- **Analytics**: Price trends, supply maps, demand forecasting
- **Offline sync**: Store-and-forward for areas with intermittent connectivity

---

## 🧭 Other ventures in this repo

| Project | Folder / Stack | Idea |
|---|---|---|
| 🏠 **PropTech — Verified Rental Listings** | [`proptech/`](proptech/) · static HTML/CSS/JS | Killing Juba's rental scams: every house/land listing is physically verified by a field agent (GPS + timestamped photos) before it earns a badge. Revenue: $25 verification fee + 5% success commission. |
| 🏍️ **JunubLogistics — Address-less Delivery** | [`logistics/`](logistics/) · Flask + Leaflet/OpenStreetMap + Google Maps deeplinks + WhatsApp Cloud API | Last-mile delivery across Juba without street addresses. Customers drop a pin, verified boda-boda riders navigate via Google Maps coordinates, WhatsApp drives the whole notification loop. Revenue: per-parcel delivery fees + B2B contracts with Instagram/Facebook sellers. See [`logistics/README_logistics.md`](logistics/README_logistics.md). |
| 💸 **Junub Pay** | [`src/`](src/) · Next.js 14 | Diaspora remittance & direct bill-payment corridor for South Sudan. |
