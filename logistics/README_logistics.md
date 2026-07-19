# 🏍️ JunubLogistics — Address-less Last-Mile Delivery for South Sudan

South Sudan has no formal addressing system — delivering packages in Juba
relies on confusing phone calls, fuzzy landmarks ("opposite the big tree
near Juba Stadium"), and boda riders who already know the city.
JunubLogistics replaces all of that with **GPS pin-drop bookings**,
**Google-Maps-turn-by-turn rider navigation**, and a **WhatsApp
notification loop** that keeps sender, recipient and rider in sync.

## How it works

1. **Customer** opens the JunubLogistics web app, taps the map to set a
   pickup pin and a drop-off pin, adds landmark notes, recipient name and
   phone. An instant fare quote appears in SSP.
2. The system **dispatches the job** to the nearest verified *on-duty*
   boda-boda rider (haversine matching, configurable radius).
3. **Driver app** shows the job with one-tap Google Maps "Navigate to
   pickup" / "Navigate to drop-off" deep-links. The rider's phone opens
   Google Maps turn-by-turn directions directly to the coordinates — no
   street-name knowledge required.
4. **WhatsApp** messages are fired at every lifecycle event:
   booking confirmation, rider assigned, picked up, delivered.
5. The recipient must give the rider a **6-digit handover PIN** shown in
   the customer tracking page (and the WhatsApp they receive) before the
   parcel is released. The rider can upload an optional **proof-of-delivery
   photo**.
6. **B2B sellers** (Instagram/Facebook shops) integrate via a single JSON
   API call from their storefront or DM bot, and receive a monthly bill
   instead of cash-per-parcel.

## Architecture

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│  📱 Customer Web App │   │  🏍️ Driver Web App   │   │  🛍️ B2B Sellers (IG/FB)│
│  Leaflet pin-drop    │   │  GPS ping every 20s  │   │  JSON API / Shopify │
│  + WhatsApp msgs     │   │  Google Maps nav     │   │  Monthly billing    │
└──────────┬───────────┘   └───────────┬──────────┘   └───────────┬──────────┘
           │                           │                          │
           ▼                           ▼                          ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      Flask blueprint: /logistics                          │
│                                                                          │
│  Customers · Drivers · Merchants · Deliveries · Tracking · Notifications │
└─────────────────────────────────────────┬────────────────────────────────┘
                                          │
                                          ▼
                       ┌──────────────────────────────────┐
                       │  SQLite / Postgres (junub_*)     │
                       │  LCustomer · LDriver · LMerchant │
                       │  LDelivery · LTrackingEvent …    │
                       └──────────────────────────────────┘
                                          │
                                          ▼
                             ┌────────────────────────┐
                             │ Meta WhatsApp Cloud API│
                             │ Africa's Talking (SMS) │
                             └────────────────────────┘
```

## Tech stack

* **Backend:** Python Flask blueprint (reuses AgriConnect's `db` and app
  factory — mounted under `/logistics` so it doesn't disturb the existing
  farm-to-market routes).
* **Maps:** [Leaflet](https://leafletjs.com/) + OpenStreetMap tiles for
  the booking / tracking UI (no API key needed). Driver navigation
  deep-links straight into the **Google Maps** app via
  `https://www.google.com/maps/dir/?api=1&destination=...`, which is the
  app boda riders already have on their phones.
* **WhatsApp:** Meta WhatsApp Cloud API (outbound notifications +
  inbound `TRACK JL-XXX` command bot). SMS fallback via Africa's Talking.
* **Payments:** Cash on delivery (default), m-Gurush / Fari mobile money
  selectable at booking; B2B merchants run on account.
* **Auth:** Lightweight session-based login for both customers and riders
  (separate from AgriConnect's Buyer login), with demo credentials
  seeded for instant testing.

## Revenue model

| Stream | Mechanic |
|---|---|
| **Per-parcel delivery fee** | Flag-drop SSP 1,500 + SSP 350/×1.3 routed km + package-size surcharge (small/medium/large). 80% paid to rider, 20% platform margin. |
| **B2B contracts** | Instagram/Facebook sellers (Jumia Juba sim, Juba Fashion Hub, Duk-Duk Electronics, Konyo-Konyo Grocers in the demo) get a flat per-parcel rate and a monthly invoice. They book via `/logistics/api/book-merchant`. |
| **Premium services** (future) | Scheduled pickups, fragile/valuable handling, multi-parcel routes for corporate clients, cold-chain for restaurants/pharmacies. |

## Quick start

```bash
# from repo root
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# seed AgriConnect (optional) and JunubLogistics demo data
python seed_data.py           # optional
python seed_logistics.py

python app.py
# open http://localhost:5000/logistics/
```

## Demo credentials

**Customer (book & track):**
* Phone `+211922200001` / password `demo123` — Achol Deng

**Drivers (accept jobs, navigate, mark delivered):**
* `+211922100001` / `driver123` — Samuel Majok (plate SS JBA 001)
* `+211922100002` / `driver123` — Peter Lomoro (SS JBA 002)
* `+211922100003` / `driver123` — Grace Aya (SS JBA 003) — pre-seeded with
  an *in-transit* delivery for live tracking demo

**Admin / Operations dashboard:**
`http://localhost:5000/logistics/admin/` — open access for the demo, shows
pending/active/delivered counts, online riders, recent WhatsApp
notifications, and a sample B2B API snippet.

## B2B Merchant API example

```bash
curl -X POST http://localhost:5000/logistics/api/book-merchant \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "jumiajuba",
    "recipient_name": "Achol Deng",
    "recipient_phone": "+211922123456",
    "pickup_lat": 4.851, "pickup_lng": 31.582,
    "pickup_label": "Jumia Juba Hub — Juba Market",
    "dropoff_lat": 4.844, "dropoff_lng": 31.539,
    "dropoff_label": "Gudele block 4 near borehole",
    "package_size": "medium",
    "description": "Jumia order #SS2391 — shoes"
  }'
```

Response:

```json
{
  "ok": true,
  "tracking_code": "JL-XYZA2B",
  "fee_ssp": 2500,
  "status": "assigned",
  "tracking_url": "http://localhost:5000/logistics/track?code=JL-XYZA2B"
}
```

## WhatsApp bot

Customers can message the JunubLogistics WhatsApp number:

* `TRACK JL-XXXXXX` — returns live delivery status, rider name, drop-off
* `HELP` — usage menu

Webhook endpoint: `POST/GET /logistics/whatsapp/inbound` (Meta Cloud API
verify token shared with AgriConnect: `agriconnect_verify`).

## Juba landmarks pre-loaded

Quick-select chips for areas without network-heavy geocoding: Juba Town
Center, Juba International Airport, Gudele, Munuki, Hai Malakal, Custom
Market, Konyo-Konyo Market, Juba Teaching Hospital, University of Juba,
Nyakuron, Atlabara, Lologo, Rock City, Customs (Nimule Rd).

## File layout

```
logistics/
  __init__.py           # Blueprint + package exports
  models.py             # LCustomer, LDriver, LMerchant, LDelivery, LTrackingEvent, …
  routes.py             # All web routes and JSON APIs
  geocode.py            # Haversine, fare calc, pin helpers, Google Maps URLs, Juba landmarks
  notifier.py           # WhatsApp / SMS dispatch with audit log (LNotificationLog)
  README_logistics.md   # (this file)

templates/logistics/    # Landing, book, track, driver dashboard, driver job, admin, auth forms
static/logistics/
  css/logistics.css     # Dark-orange boda-themed UI
  js/logistics.js       # Shared UI
  js/booking.js         # Pin-drop booking map, fare quote, submission
  js/driver.js          # GPS ping, on-duty toggle, job refresh
seed_logistics.py       # Demo data: 3 riders, 4 merchants, 5 deliveries including a live one
```

## Production considerations

* Set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_ID` env vars to enable real
  WhatsApp sends (otherwise messages are logged to `junub_notification_logs`).
* Swap the development `SECRET_KEY` for a strong secret; run behind
  Gunicorn (`gunicorn -w 4 -b 0.0.0.0:5000 'app:create_app("production")'`).
* Add proper admin authentication and driver onboarding flows
  (document upload, ID verification, M-Pesa/m-Gurush payout setup).
* Swap haversine straight-line routing for a real road-routing engine
  (OSRM / Google Directions API) once you scale — the code already
  applies a 1.3× "Juba detour" multiplier as a stand-in.
* Add mobile apps (Flutter/React Native) wrapping the same JSON API for
  better GPS background tracking and push notifications, while keeping
  the mobile-web version for low-end devices.
