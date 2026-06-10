#!/bin/bash
# 启动所有服务
echo "Starting AI Travel Assistant..."
cp .env.example .env 2>/dev/null || true
docker-compose up -d --build
echo "All services started!"
echo ""
echo "Frontend:   http://localhost:3000"
echo "Gateway:    http://localhost:8000"
echo "API Docs:   http://localhost:8000/docs"
echo "Nginx:      http://localhost:80"
