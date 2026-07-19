# 🏠 PropTech — Verified Rental Listings for Juba

> **Finding housing in Juba is difficult, fraught with scams, and relies on word-of-mouth. PropTech fixes that with one rule: no physical inspection, no listing.**

A mobile-first web platform for rentals and land in Juba, South Sudan, where every listing must be physically verified by a field agent — with **geolocation capture** and **timestamped photo verification** — before it earns the green **Verified** badge.

## 🚀 Run it

It's a zero-build static site:

```bash
cd proptech
python3 -m http.server 8080
# open http://localhost:8080
```

(Or just open `index.html` in a browser. The map views need an internet connection for OpenStreetMap tiles + the Leaflet CDN; everything else works offline.)

## 🗺️ Pages

| Page | What it does |
|---|---|
| `index.html` | Landing: hero search, how-it-works, featured verified listings, verification standard, pricing, coverage |
| `listings.html` | Browse: search/filter/sort, grid–split–map views, price-pin map (Leaflet + OSM), shortlist favourites |
| `property.html?id=…` | Detail: photo gallery, full **verification report** (agent, GPS match, photo dates, documents), verified map, call/WhatsApp contact |
| `list-property.html` | Landlord flow: 2-minute listing form with **live GPS capture** (`navigator.geolocation`) and photo attach |
| `agents.html` | **Field-agent console (demo)**: review queue comparing the owner's claimed pin vs the agent's on-site GPS (haversine distance), 4-point checklist, approve → badge goes live / reject |
| `pricing.html` | Revenue model + worked commission example + verification FAQ |

## 🔁 The verification loop (try it)

1. Open `list-property.html` and submit a property → it enters the agent queue with your reference ID.
2. Open `agents.html` → complete the 4 checks and hit **Approve & issue badge** (a real haversine check compares claimed vs captured GPS; >200 m gaps are blocked from approval).
3. Your listing instantly appears live on `listings.html` and `property.html` with the Verified badge.
4. **Reset demo data** in the console clears the queue back to its seeded state.

State is kept in `localStorage` (`pt_submissions`, `pt_decisions`, `pt_favs`, `pt_checks`) — no backend required for the demo.

## 💰 Revenue model

| Stream | Who pays | Price | When |
|---|---|---|---|
| **Verified badge** | Landlord | **$25 one-time** ($15 re-verify after 90 days) | Only *after* a successful agent visit |
| **Success commission** | Landlord | **5% of first-year lease** (3% on land sales) | Only when a lease/sale actually signs |
| **Browsing** | House-hunters | **Free, no account** | — |

PropTech never holds rent money — fees cover verification and optional brokerage only.

## 🧱 Tech

- Vanilla HTML/CSS/JS (no build step), Inter + Sora via Google Fonts
- [Leaflet](https://leafletjs.com) + OpenStreetMap for maps with custom price pins
- Geolocation API for on-site capture, haversine distance for the GPS truth test
- Accessibility: semantic landmarks, aria states, keyboard-focus styles, reduced markup duplication via shared JS builders
- Demo data: 12 seeded verified listings + 3 seeded queue items across 15 real Juba neighbourhoods (Tongpiny, Hai Malakal, Gudele, Kololo, Gumbo…)

*All listings, people and prices are illustrative demo content.*
