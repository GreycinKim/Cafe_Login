# Gunicorn config for production (Render, Railway, etc.)
# Hosts bind to 0.0.0.0 so the platform can route traffic; PORT is set by the host.
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '5000')}"
workers = int(os.environ.get("GUNICORN_WORKERS", "4"))
threads = 1
timeout = 120
