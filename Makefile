.PHONY: all features routes shared backend frontend purge_db fetch prod-migration auth-frontend auth-backend migrate makemigrations stamp

all: features routes backend

CW := codeweaver

features:
	codeweaver -input frontend/src/features -output features.md

routes:
	codeweaver -input frontend/src/routes -output routes.md

shared:
	codeweaver -input frontend/src/shared -output shared.md

backend:
	codeweaver -input backend -include="src/features/texademia/models/document.py,src/features/texademia/services/versioning.py,src/features/texademia/routers/documents.py" -ignore "__pycache__,.venv,venv,__init__\.py,assets,templates\.py" -output backend.md

frontend:
	codeweaver -input frontend -include="src/features/redaction/components/versionHistoryDrawer.tsx,src/features/redaction/components/blameExtension.ts,src/features/redaction/types/redaction.ts,src/features/redaction/api/redaction.ts,src/features/redaction/store/editorStore.ts" -ignore "node_modules,dist,build,auth/,public/" -output frontend.md

purge_db:
	docker compose stop backend
	docker compose exec -T db psql -U user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'texademia' AND pid <> pg_backend_pid();"
	docker compose exec -T db psql -U user -d postgres -c "DROP DATABASE IF EXISTS texademia;"
	docker compose exec -T db psql -U user -d postgres -c "CREATE DATABASE texademia;"
	docker compose start backend
	docker compose exec backend alembic upgrade head

migrate:
	docker compose exec backend alembic upgrade head

makemigrations:
	docker compose exec backend alembic revision --autogenerate -m "$(MSG)"

stamp:
	docker compose exec backend alembic stamp head

fetch:
	mkdir -p logs
	curl -s "http://localhost:8000/api/texademia/documents/021167dc-a6c8-43b4-abef-b4761befd8e3" \
		-H "Cookie: auth_token=$(ACCESS)" \
		| python3 -m json.tool 2>&1 | tee "logs/fetch.log"

prod-migration:
	docker compose -f docker-compose.prod.yaml exec db sh -c 'echo "user=$$POSTGRES_USER db=$$POSTGRES_DB"'
	docker compose -f docker-compose.prod.yaml exec db sh -c 'pg_dump -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -F c -f /tmp/prod_backup.dump'
	docker compose -f docker-compose.prod.yaml cp db:/tmp/prod_backup.dump ./prod_backup_$$(date +%Y%m%d).dump
	docker compose -f docker-compose.prod.yaml cp migration_001_versioning.sql db:/tmp/migration_001_versioning.sql
	docker compose -f docker-compose.prod.yaml exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -f /tmp/migration_001_versioning.sql'
	docker compose -f docker-compose.prod.yaml exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "\d document_files"'
	docker compose -f docker-compose.prod.yaml exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "\d document_versions"'
	docker compose -f docker-compose.prod.yaml exec db sh -c 'psql -U "$$POSTGRES_USER" -d "$$POSTGRES_DB" -c "\d document_file_versions"'




auth-backend:
	$(CW) -input=backend/src -output=auth-backend.md \
		-include="features/auth/manager\.py$$,features/auth/models\.py$$,features/auth/router\.py$$,features/auth/schemas\.py$$,database/session\.py$$,database/base\.py$$,config/settings\.py$$,^main\.py$$" \
		-ignore="__pycache__,\.pyc$$" \
		-excluded-paths-file=auth-backend-excluded.txt

auth-frontend:
	$(CW) -input=frontend/src -output=auth-frontend.md \
		-include="features/auth/api/auth\.ts$$,features/auth/hooks/useAuth\.ts$$,features/auth/schemas/auth\.ts$$,features/auth/types/auth\.ts$$,features/auth/components/loginForm\.tsx$$,features/auth/components/registerForm\.tsx$$,features/auth/guards/requireAuth\.ts$$,features/auth/index\.ts$$,routes/login\.tsx$$,routes/register\.tsx$$,^router\.tsx$$,shared/api/client\.ts$$" \
		-ignore="node_modules,\.gen\.ts$$" \
		-excluded-paths-file=auth-frontend-excluded.txt
