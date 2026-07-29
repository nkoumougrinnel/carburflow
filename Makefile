.PHONY: help

help:
	@echo "Available commands:"
	@echo "  make backend-test"
	@echo "  make docker-up"

backend-test:
	pytest backend/tests -q

docker-up:
	docker compose -f docker/docker-compose.yml up --build
