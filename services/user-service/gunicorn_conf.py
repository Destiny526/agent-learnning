"""Gunicorn configuration for user-service"""
import os

# Bind to the PORT environment variable (Railway/Heroku convention)
bind = f"0.0.0.0:{os.getenv('PORT', '8001')}"

# Worker configuration
workers = int(os.getenv("WEB_CONCURRENCY", "2"))
worker_class = "uvicorn.workers.UvicornWorker"

# Timeouts
timeout = 120
graceful_timeout = 30
keepalive = 5

# Logging
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info")

# Process naming
proc_name = "user-service"

# Do NOT preload app to avoid Redis connection sharing across forked workers
preload_app = False

# Max requests per worker before recycling
max_requests = 1000
max_requests_jitter = 50
