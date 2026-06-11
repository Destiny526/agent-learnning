"""Gunicorn configuration for ticket-service"""
import os

# Bind to the PORT environment variable (Railway/Heroku convention)
bind = f"0.0.0.0:{os.getenv('PORT', '8002')}"

# Worker configuration
# Railway free tier provides ~1 vCPU; use 2*CPU+1 formula capped by available memory
# For a 512MB container, 2 workers is a safe default
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_class = "uvicorn.workers.UvicornWorker"

# Timeouts
timeout = 120          # Worker timeout (seconds) - generous for 12306 scraping
graceful_timeout = 30  # Graceful shutdown timeout
keepalive = 5          # Keep-alive for connection reuse

# Logging
accesslog = "-"        # stdout
errorlog = "-"         # stdout
loglevel = os.getenv("LOG_LEVEL", "info")

# Process naming
proc_name = "ticket-service"

# Do NOT preload app to avoid Redis connection sharing across forked workers
preload_app = False

# Max requests per worker before recycling (prevents memory leaks)
max_requests = 1000
max_requests_jitter = 50
