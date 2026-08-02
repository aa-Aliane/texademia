import json
import redis
from src.config.settings import settings

redis_conn = redis.from_url(settings.REDIS_URL)


def publish_document_event(document_id: str, event: dict) -> None:
    try:
        result = redis_conn.publish(f"document:{document_id}", json.dumps(event))
        print(f"[pubsub] published to document:{document_id}, {result} subscriber(s)")
    except redis.RedisError as e:
        print(f"[pubsub] FAILED to publish: {e}")
