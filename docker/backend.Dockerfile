FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY Backend/requirements.docker.txt /app/Backend/requirements.docker.txt
COPY Backend/requirements-voice.txt /app/Backend/requirements-voice.txt
RUN pip install --no-cache-dir -r /app/Backend/requirements.docker.txt

COPY Backend/ /app/Backend/
COPY common/ /app/common/
COPY scripts/docker-entrypoint-backend.sh /app/scripts/docker-entrypoint-backend.sh

RUN chmod +x /app/scripts/docker-entrypoint-backend.sh

EXPOSE 5000

ENTRYPOINT ["/app/scripts/docker-entrypoint-backend.sh"]
