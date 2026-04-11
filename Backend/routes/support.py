"""
Support: contact form and bug reports — emails SUPPORT_EMAIL_TO (default i222667@nu.edu.pk)
or appends to data/support_mail.log when SMTP is not configured.
"""
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.image import MIMEImage

from flask import Blueprint, request, jsonify

support_bp = Blueprint('support', __name__, url_prefix='/api/support')

DEFAULT_TO = 'i222667@nu.edu.pk'


def _support_to() -> str:
    return (os.environ.get('SUPPORT_EMAIL_TO') or DEFAULT_TO).strip()


def _append_fallback_log(subject: str, body: str) -> None:
    data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
    os.makedirs(data_dir, exist_ok=True)
    path = os.path.join(data_dir, 'support_mail.log')
    line = f"{datetime.utcnow().isoformat()}Z | {subject}\n{body}\n---\n"
    with open(path, 'a', encoding='utf-8') as f:
        f.write(line)
    print(f'📧 Support message logged to {path}')


def _send_smtp(subject: str, body: str, attachment_bytes: bytes | None = None, attachment_name: str = 'screenshot.jpg') -> bool:
    host = (os.environ.get('SMTP_HOST') or '').strip()
    port = int(os.environ.get('SMTP_PORT') or '587')
    user = (os.environ.get('SMTP_USER') or '').strip()
    password = (os.environ.get('SMTP_PASSWORD') or '').strip()
    use_tls = (os.environ.get('SMTP_USE_TLS', 'true').lower() in ('1', 'true', 'yes'))
    mail_from = (os.environ.get('SMTP_FROM') or user or _support_to()).strip()
    to_addr = _support_to()

    if not host:
        _append_fallback_log(subject, body)
        return True

    msg = MIMEMultipart()
    msg['Subject'] = subject
    msg['From'] = mail_from
    msg['To'] = to_addr
    msg.attach(MIMEText(body, 'plain', 'utf-8'))
    if attachment_bytes:
        img = MIMEImage(attachment_bytes, _subtype='jpeg')
        img.add_header('Content-Disposition', 'attachment', filename=attachment_name)
        msg.attach(img)

    with smtplib.SMTP(host, port, timeout=30) as smtp:
        if use_tls:
            smtp.starttls()
        if user and password:
            smtp.login(user, password)
        smtp.sendmail(mail_from, [to_addr], msg.as_string())
    return True


@support_bp.route('/contact', methods=['POST'])
def contact():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip()
    subject = (data.get('subject') or '').strip()
    message = (data.get('message') or '').strip()
    if not name or not email or not subject or not message:
        return jsonify({'error': 'name, email, subject, and message are required'}), 400

    body = f"From: {name} <{email}>\n\n{message}"
    subj = f"[AgriSmart Contact] {subject}"
    try:
        _send_smtp(subj, body)
        return jsonify({'ok': True}), 200
    except Exception as e:
        print('❌ contact support:', e)
        try:
            _append_fallback_log(subj, body)
            return jsonify({'ok': True, 'warning': 'Email queued locally (SMTP failed)'}), 200
        except Exception:
            return jsonify({'error': 'Could not send message'}), 500


@support_bp.route('/report-bug', methods=['POST'])
def report_bug():
    description = (request.form.get('description') or '').strip()
    reporter_email = (request.form.get('email') or '').strip()
    if not description:
        return jsonify({'error': 'description is required'}), 400

    attachment_bytes = None
    f = request.files.get('screenshot') or request.files.get('file')
    if f and f.filename:
        attachment_bytes = f.read()

    extra = f"Reporter email: {reporter_email or '(not provided)'}\n\n"
    body = extra + description
    subj = '[AgriSmart Bug Report]'
    try:
        _send_smtp(subj, body, attachment_bytes=attachment_bytes)
        return jsonify({'ok': True}), 200
    except Exception as e:
        print('❌ bug report:', e)
        try:
            _append_fallback_log(subj, body + ('\n[screenshot attached]' if attachment_bytes else ''))
            return jsonify({'ok': True, 'warning': 'Report queued locally (SMTP failed)'}), 200
        except Exception:
            return jsonify({'error': 'Could not submit report'}), 500
