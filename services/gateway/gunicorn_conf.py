"""Gunicorn configuration for gateway"""
import os

# Bind to the PORT environment variable (Railway/Heroku convention)
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"

# Worker configuration - gateway is I/O-bound, use more workers
workers = int(os.getenv("WEB_CONCURRENCY", "3"))
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
proc_name = "gateway"

# Preload app to save memory (gateway has no Redis connection at module level)
preload_app = True

# Max requests per worker before recycling
max_requests = 1000
max_requests_jitter = 50
