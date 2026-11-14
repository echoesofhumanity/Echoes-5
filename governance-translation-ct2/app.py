"""Isolated Echoes Governance TR->EN CT2 pilot; never logs participant text."""
import hmac
import hashlib
import secrets
import time
import json
import os
import threading
from urllib.parse import urlsplit
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent / "model"
API_KEY = os.environ.get("ECHOES_TRANSLATE_API_KEY", "")
MAX_BYTES = 4096
PILOT_PASSCODE = os.environ.get("ECHOES_PILOT_PASSCODE", "")
SESSIONS = {}
LOGIN_ATTEMPTS = {}
STATE_LOCK = threading.Lock()
SESSION_TTL = 3600
LOCK = threading.Lock()
translator = None
source_tokenizer = None
target_tokenizer = None


def load_model():
    global translator, source_tokenizer, target_tokenizer
    import ctranslate2
    import sentencepiece as spm
    translator = ctranslate2.Translator(str(MODEL_DIR), device="cpu",
                                         compute_type="int8", inter_threads=1,
                                         intra_threads=1)
    source_tokenizer = spm.SentencePieceProcessor(model_file=str(MODEL_DIR / "source.spm"))
    target_tokenizer = spm.SentencePieceProcessor(model_file=str(MODEL_DIR / "target.spm"))


def verify_translation_engine():
    """One synthetic, non-participant TR->EN inference on startup."""
    phrase = "Merhaba dünya."
    tokens = source_tokenizer.encode(phrase, out_type=str) + ["</s>"]
    with LOCK:
        result = translator.translate_batch([tokens], beam_size=1,
                                            max_decoding_length=64)[0].hypotheses[0]
    output = target_tokenizer.decode([t for t in result if t not in ("</s>", "<pad>")])
    normalized = output.lower()
    if not output.strip() or not ("hello" in normalized and "world" in normalized):
        print("CT2_SELFTEST failed: unexpected translation", flush=True)
        raise RuntimeError("CT2 startup translation verification failed")
    print("CT2_SELFTEST passed: synthetic TR->EN inference", flush=True)


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data, cookie=None):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        if cookie:
            self.send_header("Set-Cookie", cookie)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def same_origin(self):
        origin = self.headers.get("Origin", "")
        return origin == "https://echoes-governance-ct2.onrender.com"

    def body_json(self):
        length = self.headers.get("Content-Length", "")
        if (not length.isdecimal() or not 0 < int(length) <= MAX_BYTES
                or self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json"):
            raise ValueError()
        data = json.loads(self.rfile.read(int(length)).decode("utf-8"))
        if not isinstance(data, dict):
            raise ValueError()
        return data

    def session(self):
        raw = self.headers.get("Cookie", "")
        cookie = SimpleCookie()
        try:
            cookie.load(raw)
            token = cookie["echoes_pilot"].value
        except (KeyError, ValueError):
            return None
        now = time.time()
        with STATE_LOCK:
            entry = SESSIONS.get(token)
            if entry is None or entry["expires"] < now:
                SESSIONS.pop(token, None)
                return None
            return token

    def translate(self, phrase):
        with LOCK:
            tokens = source_tokenizer.encode(phrase, out_type=str) + ["</s>"]
            result = translator.translate_batch([tokens], beam_size=1,
                                                max_decoding_length=64)[0].hypotheses[0]
            output = target_tokenizer.decode([t for t in result if t not in ("</s>", "<pad>")])
        if not output.strip() or len(output.split()) > max(24, len(phrase.split()) * 4):
            raise ValueError()
        return output

    def do_GET(self):
        route = urlsplit(self.path).path
        if route in ("/pilot", "/meeting"):
            page = Path(__file__).resolve().parent / ("meeting.html" if route == "/meeting" else "pilot.html")
            body = page.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.send_header("X-Content-Type-Options", "nosniff")
            self.send_header("Content-Security-Policy", ("default-src 'none'; script-src 'unsafe-inline' https://8x8.vc; "
                        "style-src 'unsafe-inline'; connect-src 'self' https://8x8.vc; "
                        "frame-src https://8x8.vc; img-src 'self' data: https:; "
                        "base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
                        if route == "/meeting" else
                        "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return
        return self.reply(200, {"status": "ready", "engine": "ct2", "liveMeeting": False,
                                "pilotAvailable": bool(PILOT_PASSCODE)})

    def do_POST(self):
        route = urlsplit(self.path).path
        if route.startswith("/pilot/"):
            if not self.same_origin():
                return self.reply(403, {"error": "Origin denied"})
            try:
                data = self.body_json()
            except (ValueError, UnicodeError):
                return self.reply(400, {"error": "Invalid request"})
            if route == "/pilot/login":
                ip = self.client_address[0]
                now = time.time()
                with STATE_LOCK:
                    attempts = [t for t in LOGIN_ATTEMPTS.get(ip, []) if t > now - 900]
                    if len(attempts) >= 5:
                        return self.reply(429, {"error": "Too many attempts; wait 15 minutes"})
                    attempts.append(now)
                    LOGIN_ATTEMPTS[ip] = attempts
                provided = data.get("passcode", "")
                if (not PILOT_PASSCODE or not isinstance(provided, str)
                        or not hmac.compare_digest(provided, PILOT_PASSCODE)):
                    return self.reply(401, {"error": "Invalid access code"})
                token = secrets.token_urlsafe(32)
                with STATE_LOCK:
                    SESSIONS[token] = {"expires": now + SESSION_TTL, "requests": []}
                    LOGIN_ATTEMPTS.pop(ip, None)
                return self.reply(200, {"status": "authorized"},
                                  "echoes_pilot=" + token + "; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600")
            token = self.session()
            if not token:
                return self.reply(401, {"error": "Session expired; sign in again"})
            if route == "/pilot/logout":
                with STATE_LOCK:
                    SESSIONS.pop(token, None)
                return self.reply(200, {"status": "signed_out"},
                                  "echoes_pilot=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0")
            if route != "/pilot/translate":
                return self.reply(404, {"error": "Not found"})
            phrase = data.get("text")
            if not isinstance(phrase, str) or not phrase.strip() or len(phrase) > 1200:
                return self.reply(400, {"error": "Invalid text"})
            now = time.time()
            with STATE_LOCK:
                entry = SESSIONS.get(token)
                if entry is None:
                    return self.reply(401, {"error": "Session expired"})
                requests = [t for t in entry["requests"] if t > now - 60]
                if len(requests) >= 20:
                    return self.reply(429, {"error": "Rate limit; try later"})
                requests.append(now)
                entry["requests"] = requests
            try:
                output = self.translate(phrase)
            except Exception:
                return self.reply(503, {"error": "Translation unavailable"})
            return self.reply(200, {"source": "tr", "target": "en", "translatedText": output,
                                    "liveMeeting": False})
        if route != "/translate":
            return self.reply(404, {"error": "Not found"})
        if not API_KEY or not hmac.compare_digest(self.headers.get("X-API-Key", ""), API_KEY):
            return self.reply(401, {"error": "Unauthorized"})
        try:
            data = self.body_json()
            if data.get("source") != "tr" or data.get("target") != "en":
                raise ValueError()
            phrase = data.get("text")
            if not isinstance(phrase, str) or not phrase.strip() or len(phrase) > 1200:
                raise ValueError()
        except (ValueError, UnicodeError):
            return self.reply(400, {"error": "Invalid request"})
        try:
            output = self.translate(phrase)
        except Exception:
            return self.reply(503, {"error": "Translation unavailable"})
        return self.reply(200, {"source": "tr", "target": "en",
                                "translatedText": output, "liveMeeting": False})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    load_model()
    verify_translation_engine()
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "10000"))), Handler).serve_forever()
