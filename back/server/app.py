"""LORD Security development server and optional assistant API.

Run from the repository root: python back/server/app.py
Set LORD_SECRET_KEY and LORD_GROQ_API_KEY through environment variables in deployment.
"""
from __future__ import annotations

import datetime as dt
import os
import re
import secrets
import sqlite3
import time
from collections import defaultdict, deque
from pathlib import Path
from urllib import error as urlerror
from urllib import request as urlrequest
import json

from flask import Flask, jsonify, redirect, request, session
from flask_bcrypt import Bcrypt

ROOT = Path(__file__).resolve().parents[2]
FRONT = ROOT / "front"
DB_PATH = Path(os.environ.get("LORD_DB_PATH", Path(__file__).with_name("secure_db.sqlite")))
SUPABASE_URL = os.environ.get("LORD_SUPABASE_URL", "").rstrip("/")
SUPABASE_KEY = os.environ.get("LORD_SUPABASE_PUBLISHABLE_KEY", "")
DB_GATE_KEY = os.environ.get("LORD_DB_GATE_KEY", "")
REMOTE_DB = bool(SUPABASE_URL and SUPABASE_KEY and DB_GATE_KEY)
app = Flask(__name__, static_folder=str(FRONT), static_url_path="")
app.secret_key = os.environ.get("LORD_SECRET_KEY") or secrets.token_hex(32)
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("LORD_HTTPS_ONLY") == "1",
    PERMANENT_SESSION_LIFETIME=dt.timedelta(minutes=30),
    MAX_CONTENT_LENGTH=16 * 1024,
)
bcrypt = Bcrypt(app)
attempts: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_assistant_model: str | None = None


def database():
    connection = sqlite3.connect(DB_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def init_db():
    if REMOTE_DB or os.environ.get("LORD_HOSTED") == "1":
        return
    with database() as connection:
        connection.execute(
            """CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT,
                email TEXT,
                role TEXT DEFAULT 'User',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )"""
        )


def rate_limited(bucket: str, limit: int, interval: int) -> bool:
    key = (bucket, request.remote_addr or "unknown")
    now = time.monotonic()
    hits = attempts[key]
    while hits and now - hits[0] > interval:
        hits.popleft()
    if len(hits) >= limit:
        return True
    hits.append(now)
    return False


def same_origin() -> bool:
    origin = request.headers.get("Origin")
    if not origin:
        return True
    expected = os.environ.get("LORD_PUBLIC_ORIGIN") or os.environ.get("RENDER_EXTERNAL_URL") or request.host_url
    return origin.rstrip("/") == expected.rstrip("/")


@app.before_request
def protect_mutations():
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        if not same_origin():
            return jsonify(error="Invalid origin"), 403
        if request.mimetype != "application/json":
            return jsonify(error="JSON required"), 415


@app.after_request
def security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(self), geolocation=()"
    return response


@app.get("/")
def home():
    return redirect("/homepage/home.html")


@app.get("/healthz")
def healthz():
    return jsonify(status="ok", database="supabase" if REMOTE_DB else "local")


def supabase_rpc(name: str, **params):
    """Call the narrow, server-gated account functions; no database key reaches the browser."""
    body = json.dumps({"p_gate": DB_GATE_KEY, **params}).encode("utf-8")
    upstream = urlrequest.Request(
        f"{SUPABASE_URL}/rest/v1/rpc/{name}",
        data=body,
        headers={"apikey": SUPABASE_KEY, "Content-Type": "application/json"},
        method="POST",
    )
    with urlrequest.urlopen(upstream, timeout=8) as response:
        return json.load(response)


def hosted_db_unavailable():
    return os.environ.get("LORD_HOSTED") == "1" and not REMOTE_DB


@app.post("/api/register")
def register():
    if hosted_db_unavailable():
        return jsonify(error="Регистрация временно недоступна."), 503
    if rate_limited("register", 8, 3600):
        return jsonify(error="Слишком много попыток. Повторите позже."), 429
    data = request.get_json(silent=True) or {}
    username = str(data.get("username") or "").strip()
    password = str(data.get("password") or "")
    if not re.fullmatch(r"[A-Za-z0-9_]{3,20}", username):
        return jsonify(error="Имя: 3–20 латинских букв, цифр или _."), 400
    if len(password) < 12 or len(password.encode("utf-8")) > 72:
        return jsonify(error="Пароль: не менее 12 символов и не более 72 байт UTF-8."), 400
    password_hash = bcrypt.generate_password_hash(password).decode()
    if REMOTE_DB:
        try:
            result = supabase_rpc("lord_register", p_username=username, p_password_hash=password_hash)
        except (urlerror.URLError, ValueError, TimeoutError):
            return jsonify(error="База данных временно недоступна."), 503
        if not result.get("created"):
            return jsonify(error="Это имя уже занято."), 409
    else:
        try:
            with database() as connection:
                connection.execute(
                    "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                    (username, password_hash, "User"),
                )
        except sqlite3.IntegrityError:
            return jsonify(error="Это имя уже занято."), 409
    return jsonify(message="Аккаунт создан."), 201


@app.post("/api/login")
def login():
    if hosted_db_unavailable():
        return jsonify(error="Вход временно недоступен."), 503
    if rate_limited("login", 10, 900):
        return jsonify(error="Слишком много попыток. Повторите позже."), 429
    data = request.get_json(silent=True) or {}
    username = str(data.get("username") or "").strip()
    password = str(data.get("password") or "")
    if len(password.encode("utf-8")) > 72:
        return jsonify(error="Неверное имя пользователя или пароль."), 401
    if REMOTE_DB:
        try:
            user = supabase_rpc("lord_lookup_user", p_username=username)
        except (urlerror.URLError, ValueError, TimeoutError):
            return jsonify(error="База данных временно недоступна."), 503
    else:
        with database() as connection:
            user = connection.execute("SELECT id, username, password_hash FROM users WHERE username = ?", (username,)).fetchone()
    if not user or not bcrypt.check_password_hash(user["password_hash"], password):
        return jsonify(error="Неверное имя пользователя или пароль."), 401
    session.clear()
    session["user_id"] = user["id"]
    session.permanent = True
    return jsonify(message="Вход выполнен.", username=user["username"])


@app.post("/api/logout")
def logout():
    session.clear()
    return jsonify(message="Сессия завершена.")


@app.get("/api/profile")
def profile():
    if hosted_db_unavailable():
        return jsonify(error="Профиль временно недоступен."), 503
    user_id = session.get("user_id")
    if not user_id:
        return jsonify(error="Требуется вход."), 401
    if REMOTE_DB:
        try:
            user = supabase_rpc("lord_profile", p_user_id=user_id)
        except (urlerror.URLError, ValueError, TimeoutError):
            return jsonify(error="База данных временно недоступна."), 503
    else:
        with database() as connection:
            user = connection.execute(
                "SELECT id, username, full_name, email, role, created_at FROM users WHERE id = ?",
                (user_id,),
            ).fetchone()
    if not user:
        session.clear()
        return jsonify(error="Пользователь не найден."), 404
    return jsonify(dict(user))


@app.post("/api/assistant")
def assistant():
    global _assistant_model
    data = request.get_json(silent=True) or {}
    language = "en" if data.get("language") == "en" else "ru"
    errors = {
        "rate": "Too many requests. Try again later." if language == "en" else "Лимит запросов. Повторите позже.",
        "unavailable": "The AI assistant is not configured on the server yet." if language == "en" else "AI помощник пока не настроен на сервере.",
        "input": "Enter a question of up to 1,500 characters." if language == "en" else "Введите вопрос до 1500 символов.",
        "upstream": "Service temporarily unavailable." if language == "en" else "Сервис временно недоступен.",
    }
    if rate_limited("assistant", 15, 900):
        return jsonify(error=errors["rate"]), 429
    api_key = (os.environ.get("LORD_GROQ_API_KEY") or "").strip()
    if not api_key:
        return jsonify(error=errors["unavailable"]), 503
    prompt = str(data.get("message") or "").strip()
    if not prompt or len(prompt) > 1500:
        return jsonify(error=errors["input"]), 400
    system_prompt = (
        "You are a cybersecurity education assistant. Reply clearly and concisely in English. "
        "Never claim to have audited a system or invent facts about the company."
        if language == "en" else
        "Ты образовательный помощник по кибербезопасности. Отвечай по-русски ясно и кратко. "
        "Не утверждай, что был проведён аудит, и не выдумывай факты о компании."
    )
    preferred = os.environ.get("LORD_GROQ_MODEL", "openai/gpt-oss-120b")
    models = list(dict.fromkeys(filter(None, (
        _assistant_model, preferred, "openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"
    ))))
    for model in models:
        payload = json.dumps({
            "model": model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 700,
        }).encode()
        upstream = urlrequest.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=payload,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urlrequest.urlopen(upstream, timeout=15) as response:
                result = json.load(response)
            answer = result["choices"][0]["message"]["content"]
            if not answer:
                raise ValueError("Empty answer")
            _assistant_model = model
            return jsonify(answer=answer)
        except urlerror.HTTPError as exc:
            try:
                provider_error = json.loads(exc.read()).get("error") or {}
                provider_code = provider_error.get("code") or provider_error.get("type") or "unknown"
            except (ValueError, AttributeError):
                provider_code = "unknown"
            provider_code = re.sub(r"[^a-zA-Z0-9_-]", "", str(provider_code))[:80]
            app.logger.warning("Groq model %s rejected with HTTP %s (%s)", model, exc.code, provider_code)
            if exc.code in (403, 404):
                continue
            details = {
                400: ("Groq rejected the request. Check the configured model.", "Groq отклонил запрос. Проверьте выбранную модель."),
                401: ("Groq rejected the API key. Check LORD_GROQ_API_KEY in Render.", "Groq отклонил API-ключ. Проверьте LORD_GROQ_API_KEY в Render."),
                429: ("Groq request limit reached. Try again later.", "Достигнут лимит запросов Groq. Повторите позже."),
            }
            en, ru = details.get(exc.code, ("Groq is temporarily unavailable.", "Groq временно недоступен."))
            return jsonify(error=en if language == "en" else ru), 502
        except (urlerror.URLError, KeyError, ValueError, TimeoutError):
            app.logger.warning("Groq assistant request failed without an HTTP response")
            return jsonify(error=errors["upstream"]), 502
    return jsonify(error=(
        "No accessible Groq model was found for this API key."
        if language == "en" else "Для этого API-ключа не найдена доступная модель Groq."
    )), 502


@app.get("/api/assistant/status")
def assistant_status():
    return jsonify(configured=bool((os.environ.get("LORD_GROQ_API_KEY") or "").strip()))


init_db()

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
