"""JunubLogistics — Address-Less Last-Mile Delivery for South Sudan.

This package implements the JunubLogistics last-mile delivery service:
  - GPS pin-drop based pickups and deliveries (no street addresses required)
  - Motorbike riders navigated via Google Maps turn-by-turn from coordinates
  - Customer web app for booking deliveries
  - Driver web app for accepting and navigating to jobs
  - WhatsApp notifications throughout the delivery lifecycle
  - B2B contracts with Instagram/Facebook/WhatsApp e-commerce sellers

The module is exposed as a Flask blueprint mounted under /logistics and uses the
same SQLAlchemy ``db`` instance as the parent AgriConnect app, plus its own
models scoped to the ``junub_`` table prefix to avoid collisions.
"""

from .routes import logistics_bp  # noqa: F401
from .models import (  # noqa: F401
    LCustomer,
    LDriver,
    LMerchant,
    LDelivery,
    LTrackingEvent,
    LDeliveryPhoto,
    LNotificationLog,
)
from .geocode import (  # noqa: F401
    JUBA_CENTER,
    PIN_AREAS,
    parse_pin,
    google_maps_url,
    haversine_m,
    distance_fare_ssp,
    describe_pin,
)

__all__ = [
    "logistics_bp",
]
