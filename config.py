"""AgriConnect Configuration."""
import os

basedir = os.path.abspath(os.path.dirname(__file__))


class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get("SECRET_KEY", "agriconnect-dev-key-change-in-production")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", f"sqlite:///{os.path.join(basedir, 'agriconnect.db')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SMS Gateway Configuration (e.g., Africa's Talking, Twilio)
    SMS_GATEWAY = os.environ.get("SMS_GATEWAY", "simulator")  # simulator | africastalking | twilio
    SMS_API_KEY = os.environ.get("SMS_API_KEY", "")
    SMS_SENDER_ID = os.environ.get("SMS_SENDER_ID", "AgriConnect")
    SMS_SHORTCODE = os.environ.get("SMS_SHORTCODE", "*384*72#")

    # WhatsApp Bot Configuration
    WHATSAPP_API_URL = os.environ.get("WHATSAPP_API_URL", "https://graph.facebook.com/v18.0")
    WHATSAPP_TOKEN = os.environ.get("WHATSAPP_TOKEN", "")
    WHATSAPP_PHONE_ID = os.environ.get("WHATSAPP_PHONE_ID", "")
    WHATSAPP_VERIFY_TOKEN = os.environ.get("WHATSAPP_VERIFY_TOKEN", "agriconnect_verify")

    # South Sudan country code
    COUNTRY_CODE = "+211"

    # Supported languages
    LANGUAGES = ["en", "ar"]  # English, Arabic (Juba Arabic)

    # Currency
    CURRENCY = "SSP"  # South Sudanese Pound
    CURRENCY_SYMBOL = "£"


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False


class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"


config_map = {
    "development": DevelopmentConfig,
    "production": ProductionConfig,
    "testing": TestingConfig,
}
