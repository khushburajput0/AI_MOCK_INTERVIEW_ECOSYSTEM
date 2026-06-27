import logging
import smtplib
from email.message import EmailMessage

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailDeliveryError(RuntimeError):
    pass


def _is_placeholder(value: str | None) -> bool:
    if not value:
        return True

    normalized = value.strip().lower()
    return normalized in {
        "your_email@gmail.com",
        "your_email@example.com",
        "your_gmail_app_password",
        "your_app_password",
    }


def send_verification_email(to_email: str, otp: str) -> None:
    subject = "Your MockMate AI verification code"
    body = (
        "Welcome to MockMate AI.\n\n"
        f"Your email verification code is: {otp}\n\n"
        f"This code expires in {settings.EMAIL_OTP_EXPIRE_MINUTES} minutes."
    )

    smtp_host = settings.SMTP_HOST or "smtp.gmail.com"
    from_email = settings.SMTP_FROM_EMAIL or settings.SMTP_USERNAME

    if _is_placeholder(settings.SMTP_USERNAME) or _is_placeholder(settings.SMTP_PASSWORD) or _is_placeholder(from_email):
        raise EmailDeliveryError(
            "Gmail SMTP is not configured. Set SMTP_USERNAME, SMTP_PASSWORD, and SMTP_FROM_EMAIL in .env."
        )

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_email
    message["To"] = to_email
    message.set_content(body)

    try:
        with smtplib.SMTP(smtp_host, settings.SMTP_PORT, timeout=20) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(message)
    except smtplib.SMTPAuthenticationError as exc:
        logger.exception("Gmail SMTP authentication failed for %s", settings.SMTP_USERNAME)
        raise EmailDeliveryError(
            "Gmail SMTP authentication failed. Use a Google App Password, not your normal Gmail password."
        ) from exc
    except (OSError, smtplib.SMTPException) as exc:
        logger.exception("Could not send verification OTP email to %s", to_email)
        raise EmailDeliveryError("Could not send verification OTP email. Check SMTP settings and network access.") from exc
