.PHONY: help install dev build start lint docker-up docker-down docker-logs docker-reset db-generate db-push db-create-tables db-studio db-reset db-migrate db-migrate-init db-migrate-status db-migrate-deploy clean check-env setup setup-full

# Default target
.DEFAULT_GOAL := help

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
NC := \033[0m # No Color

##@ General

help: ## Display this help message
	@echo "$(BLUE)Available commands:$(NC)"
	@awk 'BEGIN {FS = ":.*##"; printf "\n"} /^[a-zA-Z_-]+:.*?##/ { printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(BLUE)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)

##@ Development

install: ## Install dependencies
	@echo "$(BLUE)Installing dependencies...$(NC)"
	npm install --legacy-peer-deps

dev: ## Start development server
	@echo "$(BLUE)Starting development server...$(NC)"
	npm run dev

build: ## Build for production
	@echo "$(BLUE)Building for production...$(NC)"
	npm run build

start: ## Start production server
	@echo "$(BLUE)Starting production server...$(NC)"
	npm run start

lint: ## Run linter
	@echo "$(BLUE)Running linter...$(NC)"
	npm run lint

##@ Docker

docker-up: ## Start Docker containers (database + app)
	@echo "$(BLUE)Starting all Docker containers...$(NC)"
	@docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
	@docker-compose -f docker-compose.dev.yml up -d
	@echo "$(BLUE)Waiting for services to be ready...$(NC)"
	@timeout=60; \
	while [ $$timeout -gt 0 ]; do \
		if docker exec digital-menu-postgres-dev pg_isready -U postgres >/dev/null 2>&1 && \
		   docker exec digital-menu-app-dev wget -q --spider http://localhost:3000/api/health 2>/dev/null; then \
			echo "$(GREEN)All services are ready!$(NC)"; \
			break; \
		fi; \
		echo "Waiting for services... ($$timeout seconds remaining)"; \
		sleep 2; \
		timeout=$$((timeout - 2)); \
	done; \
	if [ $$timeout -eq 0 ]; then \
		echo "$(YELLOW)Warning: Services may not be fully ready$(NC)"; \
	fi
	@echo "$(GREEN)Application is available at http://localhost:3000$(NC)"

docker-up-full: docker-up ## Alias for docker-up (starts database + app)

docker-up-prod: ## Start Docker containers in production mode
	@echo "$(BLUE)Starting production Docker containers...$(NC)"
	@docker-compose down 2>/dev/null || true
	@docker-compose up -d --build
	@echo "$(BLUE)Waiting for database to be ready...$(NC)"
	@timeout=30; \
	while [ $$timeout -gt 0 ]; do \
		if docker exec digital-menu-postgres pg_isready -U postgres >/dev/null 2>&1; then \
			echo "$(GREEN)Database is ready!$(NC)"; \
			break; \
		fi; \
		echo "Waiting for database... ($$timeout seconds remaining)"; \
		sleep 1; \
		timeout=$$((timeout - 1)); \
	done; \
	if [ $$timeout -eq 0 ]; then \
		echo "$(YELLOW)Warning: Database may not be fully ready$(NC)"; \
	fi
	@echo "$(BLUE)Waiting for application to start...$(NC)"
	@echo "$(GREEN)Application is starting at http://localhost:3000$(NC)"
	@echo "$(YELLOW)Note: First startup may take a minute. Check logs with: docker-compose logs -f app$(NC)"

docker-down: ## Stop Docker containers
	@echo "$(BLUE)Stopping Docker containers...$(NC)"
	docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
	docker-compose down 2>/dev/null || true
	@echo "$(GREEN)Docker containers stopped!$(NC)"

docker-logs: ## View Docker container logs
	@echo "$(BLUE)Viewing Docker logs...$(NC)"
	docker-compose -f docker-compose.dev.yml logs -f

docker-logs-app: ## View application container logs only
	@echo "$(BLUE)Viewing application logs...$(NC)"
	docker-compose -f docker-compose.dev.yml logs -f app

docker-logs-db: ## View database container logs only
	@echo "$(BLUE)Viewing database logs...$(NC)"
	docker-compose -f docker-compose.dev.yml logs -f postgres

docker-reset: ## Reset Docker containers and volumes (WARNING: removes all data)
	@echo "$(YELLOW)WARNING: This will remove all Docker containers and volumes!$(NC)"
	@echo -n "Are you sure? [y/N] "; \
	read REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(BLUE)Resetting Docker containers...$(NC)"; \
		docker-compose -f docker-compose.dev.yml down -v 2>/dev/null || true; \
		docker-compose down -v 2>/dev/null || true; \
		echo "$(GREEN)Docker containers reset!$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled.$(NC)"; \
	fi

docker-ps: ## Show running Docker containers
	@echo "$(BLUE)Running Docker containers:$(NC)"
	@docker-compose -f docker-compose.dev.yml ps 2>/dev/null || docker-compose ps 2>/dev/null || echo "No containers running"

docker-build: ## Build Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	docker-compose -f docker-compose.dev.yml build
	@echo "$(GREEN)Docker images built!$(NC)"

docker-build-prod: ## Build production Docker images
	@echo "$(BLUE)Building production Docker images...$(NC)"
	docker-compose build
	@echo "$(GREEN)Production Docker images built!$(NC)"

##@ Database

db-generate: ## Generate Prisma Client
	@echo "$(BLUE)Generating Prisma Client...$(NC)"
	npx prisma generate
	@echo "$(GREEN)Prisma Client generated!$(NC)"

db-push: ## Push database schema changes
	@echo "$(BLUE)Pushing database schema...$(NC)"
	@npx prisma db push --accept-data-loss || ( \
		echo "$(YELLOW)db-push failed, trying force reset...$(NC)"; \
		npx prisma db push --force-reset --accept-data-loss \
	)
	@echo "$(BLUE)Verifying database tables...$(NC)"
	@tables=$$(docker exec digital-menu-postgres-dev psql -U postgres -d digital_menu -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' '); \
	if [ -z "$$tables" ] || [ "$$tables" = "0" ]; then \
		echo "$(YELLOW)Warning: No tables found. Creating tables manually...$(NC)"; \
		$(MAKE) db-create-tables; \
	else \
		echo "$(GREEN)✓ Found $$tables table(s) in database$(NC)"; \
	fi
	@echo "$(GREEN)Database schema updated!$(NC)"

db-create-tables: ## Manually create database tables (fallback)
	@echo "$(BLUE)Creating database tables manually...$(NC)"
	@if [ -f prisma/create-tables.sql ]; then \
		docker exec -i digital-menu-postgres-dev psql -U postgres -d digital_menu < prisma/create-tables.sql; \
		echo "$(GREEN)Database tables created!$(NC)"; \
	else \
		echo "$(YELLOW)Warning: prisma/create-tables.sql not found$(NC)"; \
	fi

db-studio: ## Open Prisma Studio
	@echo "$(BLUE)Opening Prisma Studio...$(NC)"
	npx prisma studio

db-reset: ## Reset database (WARNING: removes all data)
	@echo "$(YELLOW)WARNING: This will reset the database and remove all data!$(NC)"
	@echo -n "Are you sure? [y/N] "; \
	read REPLY; \
	if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
		echo "$(BLUE)Resetting database...$(NC)"; \
		npx prisma migrate reset --force || npx prisma db push --force-reset; \
		echo "$(GREEN)Database reset!$(NC)"; \
	else \
		echo "$(YELLOW)Cancelled.$(NC)"; \
	fi

db-migrate: ## Create and apply database migration
	@echo "$(BLUE)Creating database migration...$(NC)"
	@echo -n "Migration name: "; \
	read name; \
	npx prisma migrate dev --name $$name

db-migrate-init: ## Initialize Prisma Migrate (baseline existing database)
	@echo "$(BLUE)Initializing Prisma Migrate...$(NC)"
	@if [ ! -d "prisma/migrations" ]; then \
		mkdir -p prisma/migrations; \
	fi; \
	if [ ! -d "prisma/migrations/0_init" ]; then \
		echo "$(BLUE)Creating baseline migration...$(NC)"; \
		mkdir -p prisma/migrations/0_init; \
		npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > prisma/migrations/0_init/migration.sql; \
		npx prisma migrate resolve --applied 0_init; \
		echo "$(GREEN)Baseline migration created and marked as applied!$(NC)"; \
	else \
		echo "$(YELLOW)Migrations already initialized$(NC)"; \
	fi

db-migrate-status: ## Check migration status
	@echo "$(BLUE)Checking migration status...$(NC)"
	@npx prisma migrate status

db-migrate-deploy: ## Apply pending migrations (for production)
	@echo "$(BLUE)Applying pending migrations...$(NC)"
	@npx prisma migrate deploy

db-seed: ## Seed the database (if seed script exists)
	@echo "$(BLUE)Seeding database...$(NC)"
	@if [ -f "prisma/seed.ts" ] || [ -f "prisma/seed.js" ]; then \
		npx prisma db seed; \
		echo "$(GREEN)Database seeded!$(NC)"; \
	else \
		echo "$(YELLOW)No seed script found.$(NC)"; \
	fi

##@ Setup

setup: check-env docker-up db-generate db-push db-migrate-init ## Complete setup: check env, start Docker (database + app), generate Prisma, push schema, init migrations

setup-docker: check-env docker-up db-generate ## Complete Docker setup: check env, start all Docker containers, generate Prisma
	@echo "$(BLUE)Verifying setup...$(NC)"
	@tables=$$(docker exec digital-menu-postgres-dev psql -U postgres -d digital_menu -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' '); \
	if [ -n "$$tables" ] && [ "$$tables" != "0" ]; then \
		echo "$(GREEN)✓ Database is ready with $$tables table(s)$(NC)"; \
	else \
		echo "$(YELLOW)⚠ Warning: Database tables may not be created$(NC)"; \
	fi
	@echo "$(BLUE)Checking migration status...$(NC)"
	@npx prisma migrate status 2>/dev/null || echo "$(YELLOW)⚠ Migrations not initialized$(NC)"
	@echo "$(GREEN)Setup complete! You can now run 'make dev' to start the development server.$(NC)"

setup-full: install setup ## Full setup: install dependencies, Docker, and database
	@echo "$(GREEN)Full setup complete!$(NC)"

##@ Cleanup

clean: ## Clean build artifacts and node_modules
	@echo "$(BLUE)Cleaning build artifacts...$(NC)"
	rm -rf .next
	rm -rf node_modules
	rm -rf .turbo
	@echo "$(GREEN)Clean complete!$(NC)"

clean-docker: docker-down ## Stop and remove Docker containers
	@echo "$(GREEN)Docker cleanup complete!$(NC)"

clean-all: clean clean-docker ## Clean everything (build artifacts, Docker)
	@echo "$(GREEN)Full cleanup complete!$(NC)"

##@ Utilities

check-env: ## Check if .env file exists and has required variables
	@echo "$(BLUE)Checking environment variables...$(NC)"
	@if [ ! -f .env ]; then \
		echo "$(YELLOW)Warning: .env file not found!$(NC)"; \
		if [ -f .env.example ]; then \
			echo "Creating .env from .env.example..."; \
			cp .env.example .env; \
			echo "$(GREEN)Created .env from .env.example$(NC)"; \
		else \
			echo "$(YELLOW)No .env.example found. Creating default .env...$(NC)"; \
			echo 'DATABASE_URL="postgresql://postgres:postgres@localhost:5432/digital_menu?schema=public"' > .env; \
			echo "$(GREEN)Created default .env file$(NC)"; \
		fi; \
	fi
	@if [ -f .env ]; then \
		echo "$(GREEN).env file exists$(NC)"; \
		missing=0; \
		grep -q "DATABASE_URL" .env && echo "$(GREEN)✓ DATABASE_URL found$(NC)" || (echo "$(YELLOW)✗ DATABASE_URL missing$(NC)" && missing=1); \
		if [ $$missing -eq 1 ]; then \
			echo "$(YELLOW)Please update your .env file with the missing variables$(NC)"; \
		fi; \
	fi

logs: docker-logs ## Alias for docker-logs

ps: docker-ps ## Alias for docker-ps

