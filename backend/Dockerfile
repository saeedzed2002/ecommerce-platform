FROM python:3.13-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /app
RUN apt-get update && apt-get install --no-install-recommends -y build-essential libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements/base.txt requirements/dev.txt ./requirements/
RUN pip install --upgrade pip && pip install -r requirements/base.txt
COPY . .
FROM base AS development
RUN pip install -r requirements/dev.txt
CMD ["uvicorn", "config.asgi:application", "--host", "0.0.0.0", "--port", "8000", "--reload"]
FROM base AS production
ENV DJANGO_SETTINGS_MODULE=config.settings.production
RUN pip install gunicorn==26.0.0 \
 && DJANGO_SECRET_KEY=build-only-secret-key-not-for-production DJANGO_DEBUG=false DJANGO_ALLOWED_HOSTS=localhost python manage.py collectstatic --noinput
CMD ["gunicorn", "config.asgi:application", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
