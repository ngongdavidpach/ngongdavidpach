"""JunubLogistics notification dispatcher.

Sends WhatsApp notifications (with SMS fallback) to customers, recipients and
drivers at every stage of the delivery lifecycle.

In production this calls the Meta WhatsApp Cloud API (or a provider such as
Africa's Talking / Twilio). In development mode we log the messages and return
the payload so they can be inspected from the admin dashboard and the demo UI.
"""
from __future__ import annotations
import json
import os
import requests
from flask import current_app

from models import db
from .models import LNotificationLog, LDelivery
from .geocode import describe_pin, google_maps_url


# ── WhatsApp templates / plain messages ─────────────────────────────────
# We send plain template-free messages — Meta Cloud API supports this with
# template-free service-initiated conversations when the customer has
# messaged us in the last 24h, but for outbound-only notifications we'd use a
# pre-approved template. For demo purposes we just render friendly text.

def _normalize(phone: str) -> str:
    """Normalize phone to E.164 +211 format."""
    p = (phone or "").replace(" ", "").replace("-", "").replace("+", "")
    if p.startswith("0"):
        p = p[1:]
    if not p.startswith("211"):
        p = "211" + p
    return "+" + p


def _log(delivery_id, channel, direction, phone, message, status="queued",
         provider_id=None) -> LNotificationLog:
    log = LNotificationLog(
        delivery_id=delivery_id,
        channel=channel,
        direction=direction,
        phone=_normalize(phone),
        message=message,
        status=status,
        provider_id=provider_id,
    )
    db.session.add(log)
    db.session.commit()
    return log


def _send_whatsapp(phone: str, message: str) -> dict:
    """POST to Meta WhatsApp Cloud API. Returns {"ok": bool, ...}."""
    token = current_app.config.get("WHATSAPP_TOKEN") or os.environ.get("WHATSAPP_TOKEN")
    phone_id = current_app.config.get("WHATSAPP_PHONE_ID") or os.environ.get("WHATSAPP_PHONE_ID")
    url = current_app.config.get("WHATSAPP_API_URL", "https://graph.facebook.com/v18.0")
    if not token or not phone_id:
        # Dev / simulator mode — do not call Meta
        return {"ok": True, "simulated": True, "to": _normalize(phone), "body": message}
    endpoint = f"{url}/{phone_id}/messages"
    payload = {
        "messaging_product": "whatsapp",
        "to": _normalize(phone),
        "type": "text",
        "text": {"body": message},
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    try:
        r = requests.post(endpoint, headers=headers, json=payload, timeout=10)
        return {"ok": r.ok, "status_code": r.status_code, "body": r.text}
    except Exception as e:  # pragma: no cover - network error in prod
        return {"ok": False, "error": str(e)}


def _dispatch(channel: str, phone: str, message: str,
              delivery_id=None) -> LNotificationLog:
    """Send via channel (whatsapp/sms) and record a log row."""
    phone_e164 = _normalize(phone)
    log = _log(delivery_id, channel, "outbound", phone_e164, message)
    if channel == "whatsapp":
        res = _send_whatsapp(phone_e164, message)
        log.status = "delivered" if res.get("ok") else "failed"
        log.provider_id = str(res.get("body"))[:200] if not res.get("ok") else None
    else:
        # SMS would go through Africa's Talking / Twilio here.
        log.status = "delivered"
    db.session.commit()
    return log


# ── High-level event messages ───────────────────────────────────────────

def notify_booking_confirmation(d: LDelivery) -> None:
    msg = (
        f"📦 *JunubLogistics Booking Confirmed!*\n\n"
        f"Tracking code: *{d.tracking_code}*\n"
        f"Pickup: {describe_pin(d.pickup_lat, d.pickup_lng, d.pickup_label)}\n"
        f"Drop-off: {describe_pin(d.dropoff_lat, d.dropoff_lng, d.dropoff_label)}\n"
        f"Recipient: {d.recipient_name} ({d.recipient_phone})\n"
        f"Fee: £{int(d.fee_ssp):,} SSP ({d.payment_method.replace('_',' ').title()})\n\n"
        f"We are finding the nearest boda rider now. You'll be notified when one accepts."
    )
    _dispatch("whatsapp", d.customer.phone, msg, d.id)
    if d.merchant and d.merchant.phone:
        _dispatch("whatsapp", d.merchant.phone,
                  f"🛍️ *New JunubLogistics booking*\nCode: {d.tracking_code}\n"
                  f"Pickup from your shop → {d.recipient_name}.\n"
                  f"Fee £{int(d.fee_ssp):,} SSP.", d.id)


def notify_driver_assigned(d: LDelivery) -> None:
    if not d.driver:
        return
    cust = d.customer
    pickup_url = google_maps_url(d.pickup_lat, d.pickup_lng)
    drop_url = google_maps_url(d.dropoff_lat, d.dropoff_lng)
    # Driver
    _dispatch(
        "whatsapp", d.driver.phone,
        f"🏍️ *New delivery assigned: {d.tracking_code}*\n\n"
        f"Pickup: {describe_pin(d.pickup_lat, d.pickup_lng, d.pickup_label)}\n"
        f"{f'Notes: {d.pickup_notes}' if d.pickup_notes else ''}\n"
        f"Navigate to pickup: {pickup_url}\n\n"
        f"Drop-off: {describe_pin(d.dropoff_lat, d.dropoff_lng, d.dropoff_label)}\n"
        f"Recipient: {d.recipient_name} ({d.recipient_phone})\n"
        f"Drop-off nav: {drop_url}\n"
        f"Handover PIN: *{d.handover_pin}* (recipient must show this)\n"
        f"Your payout: £{int(d.driver_payout_ssp):,} SSP.\n\n"
        f"Reply PICKED UP once collected, then DELIVERED after handover.",
        d.id,
    )
    # Customer
    _dispatch(
        "whatsapp", cust.phone,
        f"🏍️ *Rider found!* {d.driver.full_name} ({d.driver.plate_number or 'bike'}) "
        f"is on the way to pickup your parcel *{d.tracking_code}*.\n"
        f"Call the rider: {d.driver.phone}",
        d.id,
    )


def notify_picked_up(d: LDelivery) -> None:
    _dispatch(
        "whatsapp", d.customer.phone,
        f"✅ Parcel *{d.tracking_code}* has been picked up by {d.driver.full_name}. "
        f"It's on its way to {describe_pin(d.dropoff_lat, d.dropoff_lng, d.dropoff_label)}. "
        f"Track live: /track?code={d.tracking_code}",
        d.id,
    )
    _dispatch(
        "whatsapp", d.recipient_phone,
        f"📦 JunubLogistics: a parcel is being delivered to you "
        f"(code *{d.tracking_code}*). Please have your handover PIN "
        f"*{d.handover_pin}* ready. Track: /track?code={d.tracking_code}",
        d.id,
    )


def notify_delivered(d: LDelivery) -> None:
    _dispatch(
        "whatsapp", d.customer.phone,
        f"🎉 *Delivered!* Your parcel *{d.tracking_code}* was handed over at "
        f"{describe_pin(d.dropoff_lat, d.dropoff_lng, d.dropoff_label)}.\n"
        f"Rider: {d.driver.full_name}. Thank you for using JunubLogistics!",
        d.id,
    )


def notify_cancelled(d: LDelivery) -> None:
    _dispatch(
        "whatsapp", d.customer.phone,
        f"❌ Booking *{d.tracking_code}* has been cancelled."
        + (f" Reason: {d.cancel_reason}." if d.cancel_reason else "."),
        d.id,
    )
    if d.driver:
        _dispatch(
            "whatsapp", d.driver.phone,
            f"⚠️ Delivery *{d.tracking_code}* was cancelled. Please stand by for new jobs.",
            d.id,
        )
