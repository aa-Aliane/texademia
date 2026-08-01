.PHONY: all features routes backend frontend purge_db fetch

all: features routes backend

$ACCESS="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxOGExYjE1My05Nzk3LTQ2YWUtOTBlZi1kY2E5Yzg2MjE3ZGEiLCJhdWQiOlsiZmFzdGFwaS11c2VyczphdXRoIl0sImV4cCI6MTc4NTQ5ODkzNX0.OzoU--enmuVoWRNgHZ1UKlZ-92F_4_gPx2u3tgeBNcw"

features:
	codeweaver -input frontend/src/features -output features.md

routes:
	codeweaver -input frontend/src/routes -output routes.md

shared:
	codeweaver -input frontend/src/shared -output shared.md

.PHONY: all features routes backend frontend purge_db fetch

all: features routes backend

$ACCESS="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxOGExYjE1My05Nzk3LTQ2YWUtOTBlZi1kY2E5Yzg2MjE3ZGEiLCJhdWQiOlsiZmFzdGFwaS11c2VyczphdXRoIl0sImV4cCI6MTc4NTQ5ODkzNX0.OzoU--enmuVoWRNgHZ1UKlZ-92F_4_gPx2u3tgeBNcw"

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

fetch:
	mkdir -p logs
	curl -s "http://localhost:8000/api/texademia/documents/021167dc-a6c8-43b4-abef-b4761befd8e3" \
		-H "Cookie: auth_token=$(ACCESS)" \
		| python3 -m json.tool 2>&1 | tee "logs/fetch.log"
purge_db:
	docker compose stop backend
	docker compose exec -T db psql -U user -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'texademia' AND pid <> pg_backend_pid();"
	docker compose exec -T db psql -U user -d postgres -c "DROP DATABASE IF EXISTS texademia;"
	docker compose exec -T db psql -U user -d postgres -c "CREATE DATABASE texademia;"
	docker compose start backend

fetch:
	mkdir -p logs
	curl -s "http://localhost:8000/api/texademia/documents/021167dc-a6c8-43b4-abef-b4761befd8e3" \
		-H "Cookie: auth_token=$(ACCESS)" \
		| python3 -m json.tool 2>&1 | tee "logs/fetch.log"

prod-backup:
	docker compose -f docker-compose.prod.yaml exec db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -F c -f /tmp/prod_backup.dump'
	docker compose -f docker-compose.prod.yaml cp db:/tmp/prod_backup.dump ./prod_backup_$(date +%Y%m%d).dump
