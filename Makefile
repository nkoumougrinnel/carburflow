.PHONY: help docker-up docker-down docker-reset backend-test

# Ne jamais utiliser « docker-compose » (v1.29) : KeyError ContainerConfig + crash Ctrl+C.
COMPOSE := docker compose -f docker/docker-compose.yml

help:
	@echo "Available commands:"
	@echo "  make backend-test"
	@echo "  make docker-up     # docker compose v2+ (pas docker-compose v1)"
	@echo "  make docker-down"
	@echo "  make docker-reset  # purge conteneurs/volumes du projet puis rebuild"

backend-test:
	cd backend && pytest tests -q

docker-up:
	@command -v docker >/dev/null || { echo "docker introuvable"; exit 1; }
	@docker compose version >/dev/null 2>&1 || { \
		echo "Installer le plugin Compose v2 : sudo apt install docker-compose-plugin"; \
		echo "Ne pas utiliser /usr/bin/docker-compose (v1) — erreur 'ContainerConfig'."; \
		exit 1; \
	}
	$(COMPOSE) up --build

docker-down:
	$(COMPOSE) down

# Corrige KeyError: 'ContainerConfig' (v1) et recharge les données initiales (-v).
docker-reset:
	-$(COMPOSE) down --remove-orphans -v
	-docker rm -f docker_db_1 docker_backend_1 docker_frontend_1 2>/dev/null
	-docker rm -f $$(docker ps -aq --filter name=docker_) 2>/dev/null
	$(COMPOSE) up --build --force-recreate
