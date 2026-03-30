"""Quick test to verify email sending works via Resend."""
import os
import httpx
from dotenv import load_dotenv

load_dotenv()

api_key = os.environ.get("RESEND_API_KEY")
notify_email = os.environ.get("NOTIFY_EMAIL", "")
from_email = os.environ.get("RESEND_FROM_EMAIL", "London House Hunt <onboarding@resend.dev>")

if not api_key:
    print("ERROR: RESEND_API_KEY not set in .env")
    exit(1)
if not notify_email:
    print("ERROR: NOTIFY_EMAIL not set in .env")
    exit(1)

to_emails = [e.strip() for e in notify_email.split(",") if e.strip()]
print(f"From: {from_email}")
print(f"To: {to_emails}")
print(f"API key: {api_key[:8]}...")

html = """
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1715;">
  <h2 style="font-size:20px;">Test email from London House Hunt</h2>
  <p>If you see this, email notifications are working!</p>
</div>"""

for email in to_emails:
    print(f"\nSending test email to {email}...")
    resp = httpx.post(
        "https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "from": from_email,
            "to": [email],
            "subject": "Test — London House Hunt email notifications",
            "html": html,
        },
        timeout=15,
    )
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text}")
    if resp.status_code == 200:
        print(f"  SUCCESS: Email sent to {email}")
    else:
        print(f"  FAILED: {resp.text}")
