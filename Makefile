.PHONY: all features routes backend

all: features routes backend

features:
	codeweaver -input frontend/src/features -output features.md

routes:
	codeweaver -input frontend/src/routes -output routes.md

backend:
	codeweaver -input backend -output backend.md
