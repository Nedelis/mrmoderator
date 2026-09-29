FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Зависимости отдельным слоем, чтобы не переустанавливать их при каждой правке кода
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# /app/data — точка монтирования volume с SQLite; права задаются здесь,
# чтобы новый volume унаследовал владельца app
RUN useradd --create-home --uid 1000 app \
    && mkdir -p /app/data \
    && chown -R app:app /app
USER app

EXPOSE 8000

# По умолчанию: миграции + API. Бот и планировщик запускаются из того же образа
# командами `python -m app.bot.main` и `python -m app.scheduler` (см. docker-compose.yml)
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000"]
