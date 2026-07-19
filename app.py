"""AgriConnect - Farm-to-Market Marketplace for South Sudan.

Main application entry point. Creates the Flask app and registers all
blueprints, routes, and handlers.

Architecture:
  - SMS/USSD: Farmers register and list harvests via SMS or USSD (*384*72#)
  - Web Dashboard: Buyers in Juba browse produce and place orders
  - WhatsApp Bot: Buyers can interact via WhatsApp messaging
  - REST API: JSON endpoints for external integrations
"""
import os
from flask import Flask
from flask_login import LoginManager

from config import config_map
from models import db, Buyer


def create_app(config_name=None):
    """Application factory."""
    if config_name is None:
        config_name = os.environ.get("FLASK_ENV", "development")

    app = Flask(__name__)
    app.config.from_object(config_map.get(config_name, config_map["development"]))

    # ── Initialize extensions ─────────────────────────────────────
    db.init_app(app)

    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = "api.login"
    login_manager.login_message = "Please log in to access the dashboard."
    login_manager.login_message_category = "info"

    @login_manager.user_loader
    def load_user(user_id):
        return Buyer.query.get(int(user_id))

    # ── Register blueprints ───────────────────────────────────────
    from api import api_bp, template_defaults
    from whatsapp_bot import whatsapp_bp
    from logistics import logistics_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(whatsapp_bp)
    app.register_blueprint(logistics_bp)

    # Register template context processors
    app.context_processor(template_defaults)

    # ── SMS Webhook Route ─────────────────────────────────────────
    @app.route("/sms/webhook", methods=["POST"])
    def sms_webhook():
        """
        Inbound SMS webhook (Africa's Talking / Twilio format).
        Receives SMS from farmers and processes commands.
        """
        from flask import request, jsonify
        from sms_handler import SMSHandler

        handler = SMSHandler()

        # Africa's Talking format
        sender = request.form.get("from", "") or request.form.get("From", "")
        text = request.form.get("text", "") or request.form.get("Body", "")

        if not sender or not text:
            return jsonify({"error": "Missing sender or text"}), 400

        response = handler.process_sms(sender, text)

        # In production: send response via SMS gateway API
        # For now, return the response in the webhook reply
        return jsonify({"status": "ok", "response": response}), 200

    @app.route("/ussd/callback", methods=["POST"])
    def ussd_callback():
        """
        USSD callback (Africa's Talking format).
        Handles interactive USSD sessions for farmers.
        """
        from flask import request
        from sms_handler import USSDHandler

        handler = USSDHandler()

        session_id = request.form.get("sessionId", "")
        service_code = request.form.get("serviceCode", "")
        phone = request.form.get("phoneNumber", "")
        text = request.form.get("text", "")

        response = handler.process_ussd(session_id, phone, service_code, text)
        return response, 200, {"Content-Type": "text/plain"}

    # ── Health Check ──────────────────────────────────────────────
    @app.route("/health")
    def health():
        return {"status": "healthy", "service": "AgriConnect", "version": "1.0.0"}

    # ── Create database tables ────────────────────────────────────
    with app.app_context():
        db.create_all()

    return app


# ── Entry Point ───────────────────────────────────────────────────────
if __name__ == "__main__":
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
