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
RUN pip install gunicorn==26.0.0
CMD ["gunicorn", "config.asgi:application", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
