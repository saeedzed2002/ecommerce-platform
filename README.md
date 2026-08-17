# Ecommerce Platform

A production-oriented e-commerce platform built as a monorepo. It currently provides a Django catalog API, OTP-based authentication, a React storefront, product administration, PostgreSQL persistence, and MinIO-backed product image uploads.

## Current status

The catalog, accounts, cart, and checkout foundations are merged into `main`.

- Catalog domain: categories, products, stock, discounts, product images, migrations, and Django admin.
- Public API: versioned catalog endpoints under `/api/v1/`.
- Storefront: responsive Persian (`RTL`) landing page that reads catalog data from the API.
- Media: product images uploaded from the Django admin panel are stored in MinIO.
- Accounts: phone-number-based custom user model, OTP verification API, JWT access and refresh tokens, rate limiting, and single-use verification challenges.
- Cart and checkout: authenticated carts, delivery addresses, transactional stock reduction, price snapshots, and pending orders.
- Quality: backend linting, formatting checks, tests, Django system checks, and frontend builds run in CI.

The project is still pre-release (`v0.1.0`). Checkout reserves stock for fifteen minutes, starts a Zarinpal sandbox payment, verifies the callback, and restores stock for expired orders. Fulfillment, cancellation/refunds, and chat are not implemented yet.

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
- `backend/apps/`: accounts, catalog, cart, and orders domain apps, including models, APIs, migrations, and tests.
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

## OTP authentication API

Authentication endpoints are versioned under `/api/v1/auth/`.

| Endpoint | Description |
| --- | --- |
| `POST /api/v1/auth/otp/request/` | Send a six-digit code to an Iranian mobile number |
| `POST /api/v1/auth/otp/verify/` | Verify the code, create the customer if needed, and return JWT tokens |
| `POST /api/v1/auth/admin/login/` | Authenticate an `admin` user with phone number and password |
| `POST /api/v1/auth/token/refresh/` | Rotate a refresh token and return a new access token |
| `GET /api/v1/auth/me/` | Return the authenticated user; requires `Authorization: Bearer <access-token>` |

The verification code is hashed in the database, expires after five minutes, is single-use, allows at most five failed attempts, and cannot be requested again for the same phone number for sixty seconds. The API also applies an anonymous-IP throttle.

The storefront has one `ورود | ثبت‌نام` action: customers use the OTP flow, while administrators select the dedicated password form. Browser-session tokens are held in `sessionStorage` until the user signs out or closes the tab.

## Zarinpal sandbox payment

Checkout creates a `pending` order with a fifteen-minute stock reservation. The customer is redirected to Zarinpal after `POST /api/v1/orders/<order-number>/payment/`; the callback verifies the authority and redirects the browser to the storefront payment result page. Celery Beat expires unpaid orders every minute and restores their stock.

For local sandbox testing, keep `ZARINPAL_SANDBOX=true`, set any UUID-formatted value for `ZARINPAL_MERCHANT_ID`, and use the default localhost callback URL. The redirect returns in the same browser, so it can reach the local backend. In a deployed environment, set `ZARINPAL_CALLBACK_URL` and `FRONTEND_URL` to the public HTTPS backend and storefront URLs.

### SMS.ir configuration

OTP uses the `SMS.ir` bulk endpoint because this development account has no approved verification template. Put the replacement API key and the sending line number only in the untracked `.env` file:

```dotenv
SMSIR_API_KEY=replace-with-a-new-rotated-key
SMSIR_LINE_NUMBER=your-sending-line-number
SMSIR_BULK_ENDPOINT=https://api.sms.ir/v1/send/bulk
```

Do not commit or paste an API key into GitHub, a ticket, or chat. A non-service line cannot deliver to recipients who have blocked promotional SMS. Before a public launch, switch to the `SMS.ir` verification endpoint with an approved template and service line.

## Quality checks and tests

Run backend checks inside the container:

```powershell
docker compose exec backend ruff check .
docker compose exec backend ruff format --check .
docker compose exec backend pytest -q
docker compose exec backend python manage.py check
```

The backend test suite covers catalog behavior, OTP authentication, cart access, checkout ownership, price snapshots, stock reduction, and address contracts. Tests use an in-memory SQLite database and do not require live infrastructure.

## CI

GitHub Actions runs on pull requests and pushes to `main`:

- Backend: dependency installation, Ruff linting, Ruff format check, Pytest, and Django system checks.
- Frontend: clean dependency installation and production build.

## Versioning

The project uses Semantic Versioning (`MAJOR.MINOR.PATCH`) for releases and URL-based versioning for public APIs. The current development release is `v0.1.0`, while the catalog API is `/api/v1/`.

Read the complete policy in [versioning.md](docs/versioning.md).
