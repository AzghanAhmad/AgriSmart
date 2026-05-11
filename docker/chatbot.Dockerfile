FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY chatbot_service/requirements.txt /app/chatbot_service/requirements.txt
RUN pip install --no-cache-dir -r /app/chatbot_service/requirements.txt

COPY chatbot_service/ /app/chatbot_service/
COPY common/ /app/common/
COPY Backend/chatbot/ /app/Backend/chatbot/
COPY scripts/docker-entrypoint-chatbot.sh /app/scripts/docker-entrypoint-chatbot.sh

RUN chmod +x /app/scripts/docker-entrypoint-chatbot.sh

EXPOSE 8002

ENTRYPOINT ["/app/scripts/docker-entrypoint-chatbot.sh"]
