import logging

import aiosmtplib
from email.message import EmailMessage

from src.config.settings import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, body: str) -> None:
    """Send a plain-text email.

    Dev fallback: when SMTP_HOST is not configured, the email body is logged
    to the backend console instead of being sent.
    """
    if not settings.SMTP_HOST:
        logger.info("SMTP not configured. Email to %s | %s\n%s", to, subject, body)
        return

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = to
    message["Subject"] = subject
    message.set_content(body)

    await aiosmtplib.send(
        message,
        hostname=settings.SMTP_HOST,
        port=settings.SMTP_PORT,
        username=settings.SMTP_USER or None,
        password=settings.SMTP_PASSWORD or None,
        start_tls=settings.SMTP_STARTTLS,
    )
