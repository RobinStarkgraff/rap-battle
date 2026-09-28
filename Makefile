.PHONY: help install dev check test test-e2e build format dev-bootstrap
help:
	@echo "Project targets:"
	@echo "  make install                        Install dependencies (npm ci)"
	@echo "  make dev                            Start the Vite dev server on port 5173"
	@echo "  make check                          Typecheck, lint, format check and unit tests"
	@echo "  make test                           Unit tests only (Vitest)"
	@echo "  make test-e2e                       Browser tests (Playwright)"
	@echo "  make build                          Production build to dist/"
	@echo "  make format                         Fix formatting and auto-fixable lint errors"
	@echo ""
	@echo "Devcontainer targets:"
	@echo "  make dev-bootstrap                  Fetch/install devcontainer base layer"
	@echo "  make dev-bootstrap OVERLAY=<url>    Bootstrap with a company overlay"
	@echo "  make dev-help                       Show all devcontainer commands"

# Project targets. The npm scripts in package.json hold the actual commands.
install:
	npm ci

dev:
	npm run dev

check:
	npm run check

test:
	npm run test

test-e2e:
	npm run test:e2e

build:
	npm run build

format:
	npm run format
	npm run lint:fix

# Bootstrap target — always available even before base/ exists
# Usage: make dev-bootstrap [OVERLAY=<overlay-repo-url>]
dev-bootstrap:
	@bash .devcontainer/innoclaude ensure
ifdef OVERLAY
	@echo "Applying company overlay..."
	@python3 .devcontainer/base/scripts/overlay/install_overlay.py "$(OVERLAY)"
	@bash .devcontainer/innoclaude ensure
endif

# dev-help stub: shows bootstrap instructions when base/ is not yet installed.
# Once base/ exists, the real dev-help from dev-container.mk takes over via -include.
ifneq ($(wildcard .devcontainer/base/mk/dev-container.mk),)
else
.PHONY: dev-help
dev-help:
	@echo ""
	@echo "  The base layer is not installed yet."
	@echo ""
	@echo "  make dev-bootstrap                  Fetch and install the base layer"
	@echo "  make dev-bootstrap OVERLAY=<url>    Bootstrap with a company overlay"
	@echo ""
endif

# DevContainer targets (wildcard picks up all base .mk files)
-include .devcontainer/base/mk/dev-*.mk
-include .devcontainer/base/mk/features/dev-*.mk
