FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY yolo_service/requirements.txt /app/yolo_service/requirements.txt
RUN pip install --no-cache-dir -r /app/yolo_service/requirements.txt

COPY yolo_service/ /app/yolo_service/
COPY common/ /app/common/
COPY scripts/docker-entrypoint-yolo.sh /app/scripts/docker-entrypoint-yolo.sh

RUN chmod +x /app/scripts/docker-entrypoint-yolo.sh

EXPOSE 8001

ENTRYPOINT ["/app/scripts/docker-entrypoint-yolo.sh"]
