# Ecommerce Platform

A production-oriented e-commerce platform built as a monorepo. It currently provides a Django catalog API, a React storefront, product administration, PostgreSQL persistence, and MinIO-backed product image uploads.

## Current status

The catalog milestone is complete and merged into `main`.

- Catalog domain: categories, products, stock, discounts, product images, migrations, and Django admin.
- Public API: versioned catalog endpoints under `/api/v1/`.
- Storefront: responsive Persian (`RTL`) landing page that reads catalog data from the API.
- Media: product images uploaded from the Django admin panel are stored in MinIO.
- Quality: backend linting, formatting checks, tests, Django system checks, and frontend builds run in CI.

The project is still pre-release (`v0.1.0`); a complete checkout flow, authentication, payments, and chat have not been implemented yet.

## Architecture

```text
React + TypeScript (5173)
        |
        v
Django REST API (8000) ---- PostgreSQL
        |                      Redis
        |                      RabbitMQ / Celery
        v
MinIO object storage (9000)
```

This repository is a monorepo:

- `backend/`: Django 6, Django REST Framework, Channels, Celery, and domain apps.
- `backend/apps/catalog/`: catalog models, API, admin, migrations, and tests.
- `frontend/`: React, TypeScript, Vite, and the storefront UI.
- `compose.yaml`: local development stack.
- `docs/`: architecture and project policies.

See [architecture.md](docs/architecture.md) for service boundaries and [versioning.md](docs/versioning.md) for the versioning policy.

## Technology stack

| Area | Technology |
| --- | --- |
| Backend | Django 6, Django REST Framework, Channels, Celery |
| Frontend | React, TypeScript, Vite |
| Database | PostgreSQL 17 |
| Cache and messaging | Redis, RabbitMQ |
| Object storage | MinIO, S3-compatible storage backend |
| Quality | Pytest, Ruff, GitHub Actions |

## Local development

### Prerequisites

- Docker Desktop with Linux containers enabled.
- Git.

### Start the stack

Copy the example environment file once:

```powershell
Copy-Item .env.example .env
```

Replace placeholder secrets in `.env` before using the setup outside local development. Then build and start every service:

```powershell
docker compose up -d --build
```

Apply database migrations:

```powershell
docker compose exec backend python manage.py migrate
```

Create an administrator account if one does not exist:

```powershell
docker compose exec backend python manage.py createsuperuser
```

Stop the stack when it is no longer needed:

```powershell
docker compose down
```

## Local URLs

| Service | URL | Purpose |
| --- | --- | --- |
| Storefront | `http://localhost:5173` | React storefront |
| Django admin | `http://localhost:8000/admin/` | Create categories, products, and product images |
| API health | `http://localhost:8000/health/` | Backend health check |
| MinIO API | `http://localhost:9000` | Object storage endpoint |
| MinIO Console | `http://localhost:9001` | Inspect the `ecommerce-media` bucket |
| RabbitMQ management | `http://localhost:15672` | RabbitMQ management interface |

MinIO credentials are provided by `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` in `.env`. The development defaults are defined in `.env.example`; do not reuse them in production.

## Catalog API

All public catalog endpoints are versioned under `/api/v1/`.

| Endpoint | Description |
| --- | --- |
| `GET /api/v1/catalog/categories/` | Active product categories |
| `GET /api/v1/catalog/products/` | Published products in active categories |
| `GET /api/v1/catalog/products/?category=<slug>` | Products in one category |
| `GET /api/v1/catalog/products/?featured=true` | Featured products |
| `GET /api/v1/catalog/products/<slug>/` | Product details and images |

Only published products in active categories are returned by the public API. Product images uploaded in Django admin are stored in the `ecommerce-media` MinIO bucket and returned as browser-accessible image URLs.

## Product administration and image uploads

1. Sign in to Django admin.
2. Create a category, then create a product in that category.
3. Set the product status to `Published` to expose it through the public API.
4. In the `Product images` inline section, choose an image file from the local computer and save the product.

The image object is stored in MinIO; PostgreSQL stores only its object key and product metadata.

## Quality checks and tests

Run backend checks inside the container:

```powershell
docker compose exec backend ruff check .
docker compose exec backend ruff format --check .
docker compose exec backend pytest -q
docker compose exec backend python manage.py check
```

The catalog test suite covers product stock and discount behavior, price validation, public category visibility, published-product visibility, and MinIO image URL serialization. Tests use an in-memory SQLite database and do not require a live MinIO instance.

## CI

GitHub Actions runs on pull requests and pushes to `main`:

- Backend: dependency installation, Ruff linting, Ruff format check, Pytest, and Django system checks.
- Frontend: clean dependency installation and production build.

## Versioning

The project uses Semantic Versioning (`MAJOR.MINOR.PATCH`) for releases and URL-based versioning for public APIs. The current development release is `v0.1.0`, while the catalog API is `/api/v1/`.

Read the complete policy in [versioning.md](docs/versioning.md).
