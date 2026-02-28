FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends build-essential && \
    rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Download spaCy model required by Presidio (PII detection)
RUN python -m spacy download en_core_web_lg

COPY config.py .

EXPOSE 8000

CMD ["guardrails", "start", "--config", "config.py", "--port", "8000", "--host", "0.0.0.0"]
