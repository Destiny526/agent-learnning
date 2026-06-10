.PHONY: start stop build logs test lint fmt clean

# === Docker Compose ===

start:
	cp -n .env.example .env 2>/dev/null || true
	docker-compose up -d --build
	@echo ""
	@echo "✅ 服务已启动:"
	@echo "   前端:     http://localhost:3000"
	@echo "   网关:     http://localhost:8000"
	@echo "   API文档:  http://localhost:8000/docs"
	@echo "   Nginx:    http://localhost:80"

stop:
	docker-compose down

build:
	docker-compose build

restart: stop start

logs:
	docker-compose logs -f $(service)

# === Python 工具链 ===

test:
	cd services/ai-service && python -m pytest tests/ -v
	cd services/user-service && python -m pytest tests/ -v

lint:
	ruff check services/

fmt:
	ruff format services/

clean:
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	rm -rf .pytest_cache .ruff_cache .mypy_cache
