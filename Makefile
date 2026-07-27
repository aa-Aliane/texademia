.PHONY: all features routes backend purge_db

all: features routes backend

features:
	codeweaver -input frontend/src/features -output features.md

routes:
	codeweaver -input frontend/src/routes -output routes.md

shared:
	codeweaver -input frontend/src/shared -output shared.md

backend:
	codeweaver -input backend -output backend.md

purge_db:
	docker compose stop backend
	docker compose exec -T db psql -U user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'texademia' AND pid <> pg_backend_pid();"
	docker compose exec -T db psql -U user -d postgres -c "DROP DATABASE IF EXISTS texademia;"
	docker compose exec -T db psql -U user -d postgres -c "CREATE DATABASE texademia;"
	docker compose start backend
