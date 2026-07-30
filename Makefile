.PHONY: all features routes backend frontend purge_db

all: features routes backend

features:
	codeweaver -input frontend/src/features -output features.md

routes:
	codeweaver -input frontend/src/routes -output routes.md

shared:
	codeweaver -input frontend/src/shared -output shared.md

backend:
	codeweaver -input backend -include=".py" -ignore "__pycache__,.venv,venv,__init__\.py,auth/,assets,templates\.py" -output backend.md

frontend:
	codeweaver -input frontend -include ".ts,.tsx,.css,.yaml,.*\.example" -ignore "node_modules,dist,build,auth/,public/" -output frontend.md

purge_db:
	docker compose stop backend
	docker compose exec -T db psql -U user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'texademia' AND pid <> pg_backend_pid();"
	docker compose exec -T db psql -U user -d postgres -c "DROP DATABASE IF EXISTS texademia;"
	docker compose exec -T db psql -U user -d postgres -c "CREATE DATABASE texademia;"
	docker compose start backend
