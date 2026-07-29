import asyncio
import json
import uuid

from fastapi import (
    APIRouter,
    WebSocket,
    WebSocketDisconnect,
    Depends,
    HTTPException,
    status,
)
from redis.asyncio import Redis

from src.config.settings import settings
from src.database.session import get_db
from src.features.auth.manager import access_backend, get_user_manager
from .documents import _get_accessible_document

router = APIRouter(tags=["websocket"])

_async_redis: Redis | None = None

PING_INTERVAL_SECONDS = 20


def get_async_redis() -> Redis:
    global _async_redis
    if _async_redis is None:
        _async_redis = Redis.from_url(settings.REDIS_URL)
    return _async_redis


@router.websocket("/ws/documents/{document_id}")
async def document_socket(
    websocket: WebSocket,
    document_id: uuid.UUID,
    session=Depends(get_db),
    user_manager=Depends(get_user_manager),
):
    token = websocket.cookies.get("auth_token")
    if not token:
        print(f"[ws] rejected: no auth_token cookie, doc={document_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    strategy = access_backend.get_strategy()
    user = await strategy.read_token(token, user_manager)
    if user is None or not user.is_active:
        print(f"[ws] rejected: invalid/inactive user, doc={document_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        await _get_accessible_document(document_id, session, user)
    except HTTPException:
        print(f"[ws] rejected: user={user.email} has no access to doc={document_id}")
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    print(f"[ws] connected: user={user.email} doc={document_id}")

    redis = get_async_redis()
    channel_name = f"document:{document_id}"
    pubsub = redis.pubsub()
    await pubsub.subscribe(channel_name)
    print(f"[ws] subscribed: user={user.email} channel={channel_name}")

    async def relay_from_redis():
        async for message in pubsub.listen():
            if message["type"] != "message":
                continue
            data = message["data"]
            text = data.decode() if isinstance(data, bytes) else data
            try:
                await websocket.send_text(text)
            except Exception as e:
                print(f"[ws] send_text failed for user={user.email}: {e}")
                raise

    async def relay_from_client():
        while True:
            raw = await websocket.receive_text()
            try:
                payload = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = payload.get("type")

            if msg_type == "presence":
                payload["userId"] = str(user.id)
                payload["name"] = user.first_name or user.email
                payload["email"] = user.email
                await redis.publish(channel_name, json.dumps(payload))

            elif msg_type == "cursor":
                payload["userId"] = str(user.id)
                payload["name"] = user.first_name or user.email
                payload["email"] = user.email
                await redis.publish(channel_name, json.dumps(payload))

            elif msg_type == "pong":
                # Client's reply to our keepalive ping — nothing to do,
                # just proves the round trip is alive.
                pass

    async def send_pings():
        # App-level keepalive. This matters most during long-running work
        # elsewhere in the system (e.g. a compile job saturating CPU on a
        # shared host) — it guarantees outbound traffic on this socket at a
        # fixed cadence so idle-timeout proxies/load balancers don't reap it,
        # independent of how busy the rest of the stack is.
        while True:
            await asyncio.sleep(PING_INTERVAL_SECONDS)
            try:
                await websocket.send_text(json.dumps({"type": "ping"}))
            except Exception as e:
                print(f"[ws] ping failed for user={user.email}: {e}")
                raise

    redis_task = asyncio.create_task(relay_from_redis())
    client_task = asyncio.create_task(relay_from_client())
    ping_task = asyncio.create_task(send_pings())

    try:
        done, pending = await asyncio.wait(
            {redis_task, client_task, ping_task}, return_when=asyncio.FIRST_COMPLETED
        )
        for task in done:
            if task.exception():
                print(
                    f"[ws] task ended with exception, user={user.email}: {task.exception()!r}"
                )
    except WebSocketDisconnect:
        print(f"[ws] client disconnected: user={user.email} doc={document_id}")
    finally:
        print(f"[ws] cleaning up: user={user.email} doc={document_id}")
        redis_task.cancel()
        client_task.cancel()
        ping_task.cancel()
        await pubsub.unsubscribe(channel_name)
        await pubsub.close()
