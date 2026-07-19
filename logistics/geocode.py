"""JunubLogistics geolocation helpers.

South Sudan does not have a formal street-address system, so JunubLogistics
operates entirely on latitude/longitude pins, with landmark labels attached
by the user at booking time.

This module provides:
  * Haversine distance for fare calculation when there is no routing API key
  * Google Maps URL builder so drivers can open turn-by-turn navigation in
    one tap from the driver app
  * Well-known landmark "pin areas" across Juba for quick customer
    selection even without a good map signal
  * Human-readable pin descriptions for WhatsApp notifications
  * Parsing of lat/lng from text (e.g. "4.851,31.582") when a customer sends
    coordinates directly via WhatsApp
"""
from __future__ import annotations
import math
import re
from typing import Optional, Tuple

# Center of Juba — used as default map view / sanity bounds
JUBA_CENTER = (4.8594, 31.5713)

# Approximate bounding box for "valid Juba pin" sanity check.
JUBA_BOUNDS = {
    "min_lat": 4.78, "max_lat": 4.95,
    "min_lng": 31.48, "max_lng": 31.68,
}

# Common Juba landmarks — used as quick-select chips in the customer app.
# Coordinates are approximate real-world positions.
PIN_AREAS = [
    {"name": "Juba Town Center",         "lat": 4.8510, "lng": 31.5820, "tag": "CBD"},
    {"name": "Juba International Airport","lat": 4.8720,"lng": 31.6010, "tag": "Airport"},
    {"name": "Gudele",                   "lat": 4.8440, "lng": 31.5390, "tag": "Residential"},
    {"name": "Munuki",                   "lat": 4.8560, "lng": 31.5500, "tag": "Residential"},
    {"name": "Hai Malakal",              "lat": 4.8650, "lng": 31.5780, "tag": "Market"},
    {"name": "Juba Market (Custom)",     "lat": 4.8447, "lng": 31.5755, "tag": "Market"},
    {"name": "Konyo-Konyo Market",       "lat": 4.8480, "lng": 31.5690, "tag": "Market"},
    {"name": "Juba Teaching Hospital",   "lat": 4.8540, "lng": 31.5740, "tag": "Hospital"},
    {"name": "University of Juba",       "lat": 4.8400, "lng": 31.5850, "tag": "Institution"},
    {"name": "Nyakuron",                 "lat": 4.8620, "lng": 31.5910, "tag": "Residential"},
    {"name": "Atlabara",                 "lat": 4.8700, "lng": 31.5580, "tag": "Residential"},
    {"name": "Lologo",                   "lat": 4.8380, "lng": 31.5520, "tag": "Residential"},
    {"name": "Rock City",                "lat": 4.8790, "lng": 31.5350, "tag": "Residential"},
    {"name": "Customs (Juba-Nimule Rd)", "lat": 4.8385, "lng": 31.6060, "tag": "Border"},
]


# ── Pricing constants (SSP) ─────────────────────────────────────────────
BASE_FEE_SSP = 1500.0           # Flag-drop per parcel
PER_KM_FEE_SSP = 350.0          # Per-kilometre charge (boda-boda)
MIN_FEE_SSP = 1500.0
MAX_FEE_SSP = 25000.0
DRIVER_PAYOUT_RATIO = 0.80      # 80% goes to the rider, 20% platform

PACKAGE_SURCHARGE = {
    "small": 0.0,
    "medium": 500.0,
    "large": 1500.0,
}


def haversine_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Great-circle distance between two (lat,lng) points in metres."""
    R = 6_371_000  # earth radius in m
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def distance_fare_ssp(pickup: Tuple[float, float], dropoff: Tuple[float, float],
                      package_size: str = "medium",
                      flat_rate: float = 0.0) -> Tuple[float, float]:
    """Compute a straight-line fare and distance from pins.

    Returns (distance_km, fee_ssp). Uses flat_rate if provided (B2B contract).
    """
    d_km = haversine_m(pickup[0], pickup[1], dropoff[0], dropoff[1]) / 1000.0
    # Add 30% detour buffer — Juba roads are not straight
    routed_km = d_km * 1.3
    surcharge = PACKAGE_SURCHARGE.get(package_size, PACKAGE_SURCHARGE["medium"])
    if flat_rate and flat_rate > 0:
        fee = flat_rate + surcharge
    else:
        fee = BASE_FEE_SSP + (routed_km * PER_KM_FEE_SSP) + surcharge
    fee = max(MIN_FEE_SSP, min(MAX_FEE_SSP, fee))
    return round(routed_km, 2), round(fee, 2)


def driver_payout(fee_ssp: float) -> float:
    return round(fee_ssp * DRIVER_PAYOUT_RATIO, 2)


def google_maps_url(lat: float, lng: float, label: str = "") -> str:
    """Return a Google Maps 'dir/destination' URL for the driver app.

    When a label is supplied we include it in the query parameter so the
    driver sees a recognizable destination name in the Google Maps app.
    """
    from urllib.parse import quote
    if label:
        q = quote(f"{label} {lat},{lng}")
    else:
        q = f"{lat},{lng}"
    return (f"https://www.google.com/maps/dir/?api=1"
            f"&destination={lat},{lng}"
            f"&travelmode=driving"
            f"&q={q}")


def google_maps_directions_url(origin_lat: float, origin_lng: float,
                                dest_lat: float, dest_lng: float) -> str:
    return (
        "https://www.google.com/maps/dir/?api=1"
        f"&origin={origin_lat},{origin_lng}"
        f"&destination={dest_lat},{dest_lng}"
        f"&travelmode=driving"
    )


_COORD_RE = re.compile(r"(-?\d+(?:\.\d+)?)")


def parse_pin(text: str) -> Optional[Tuple[float, float]]:
    """Parse user-entered coordinates in formats like:
       "4.851, 31.582"  /  "4.851,31.582"  /  "lat 4.85 lng 31.58"
       /  "4.85 31.58"
    """
    if not text:
        return None
    nums = _COORD_RE.findall(text)
    if len(nums) < 2:
        return None
    # Heuristic: latitude is the first 2-digit-before-dot number that falls
    # within [-90, 90], longitude the next within [-180, 180].
    try:
        candidates = [float(n) for n in nums]
    except ValueError:
        return None
    for i in range(len(candidates) - 1):
        lat, lng = candidates[i], candidates[i+1]
        if -90 <= lat <= 90 and -180 <= lng <= 180:
            # Reject false-positive pairs like "4 85" in street numbers
            if nums[i].count('.') + nums[i+1].count('.') >= 1 or (lat > -10 and 30 <= lng <= 35):
                return (lat, lng)
    return None


def describe_pin(lat: float, lng: float, label: Optional[str] = None) -> str:
    """Human-readable pin description for WhatsApp notifications.

    Falls back to the nearest named PIN_AREA if no label is provided.
    """
    if label:
        return f"{label} ({lat:.4f},{lng:.4f})"
    nearest = None
    nearest_m = float("inf")
    for area in PIN_AREAS:
        d = haversine_m(lat, lng, area["lat"], area["lng"])
        if d < nearest_m:
            nearest_m = d
            nearest = area
    if nearest and nearest_m < 2500:
        return f"near {nearest['name']} ({lat:.4f},{lng:.4f})"
    return f"GPS {lat:.4f},{lng:.4f}"


def pin_is_near_juba(lat: float, lng: float) -> bool:
    return (JUBA_BOUNDS["min_lat"] <= lat <= JUBA_BOUNDS["max_lat"]
            and JUBA_BOUNDS["min_lng"] <= lng <= JUBA_BOUNDS["max_lng"])


def nearest_drivers(lat: float, lng: float, max_km: float = 5.0, limit: int = 5):
    """Return on-duty drivers within max_km of the given point, sorted by distance."""
    from .models import LDriver
    candidates = LDriver.query.filter_by(is_on_duty=True, is_verified=True).all()
    scored = []
    for d in candidates:
        if d.current_lat is None or d.current_lng is None:
            continue
        dist_km = haversine_m(lat, lng, d.current_lat, d.current_lng) / 1000
        if dist_km <= max_km:
            scored.append((dist_km, d))
    scored.sort(key=lambda t: t[0])
    return scored[:limit]


def gen_tracking_code() -> str:
    """Generate a short, human-friendly tracking code like 'JL-7A2B9X'."""
    import random, string
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no I/O/0/1 confusion
    return "JL-" + "".join(random.choices(alphabet, k=6))


def gen_handover_pin() -> str:
    import random
    return f"{random.randint(0, 999999):06d}"
