.PHONY: help install dev prod docker-build docker-up docker-down docker-logs clean test

help:
	@echo "Invite Code Dashboard Backend - Available Commands:"
	@echo ""
	@echo "  make install      - Install dependencies"
	@echo "  make dev          - Start development server"
	@echo "  make prod         - Start production server"
	@echo "  make docker-build - Build Docker image"
	@echo "  make docker-up    - Start Docker container"
	@echo "  make docker-down  - Stop Docker container"
	@echo "  make docker-logs  - View Docker logs"
	@echo "  make clean        - Clean temporary files"
	@echo "  make test         - Run tests (when implemented)"

install:
	@echo "Installing dependencies..."
	python3 -m venv venv || true
	. venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt
	@echo "Dependencies installed!"

dev:
	@echo "Starting development server..."
	./run-server.sh

prod:
	@echo "Starting production server..."
	./start-production.sh

docker-build:
	@echo "Building Docker image..."
	docker build -t invite-code-api .

docker-up:
	@echo "Starting Docker container..."
	docker-compose up -d

docker-down:
	@echo "Stopping Docker container..."
	docker-compose down

docker-logs:
	@echo "Viewing Docker logs..."
	docker-compose logs -f

clean:
	@echo "Cleaning temporary files..."
	find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	find . -type f -name "*.pyo" -delete 2>/dev/null || true
	find . -type d -name "*.egg-info" -exec rm -r {} + 2>/dev/null || true
	@echo "Cleanup complete!"

test:
	@echo "Running tests..."
	@echo "Tests not yet implemented"

