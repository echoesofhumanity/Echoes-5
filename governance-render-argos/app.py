"""Echoes Governance isolated Render translation API pilot.

No meeting audio, no transcript persistence, no permissive CORS.
Requires an API token and separately installed Argos language models.
"""
import hmac
import json
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LANGUAGES = frozenset(('tr', 'en', 'ru', 'es', 'de'))
MAX_BYTES = 4096
MAX_CHARS = 1200
TRANSLATE_LOCK = threading.Lock()


def translate_text(text, source, target):
    import argostranslate.translate as argos
    with TRANSLATE_LOCK:
        if source == target:
            return text
        if source != 'en' and target != 'en':
            text = argos.translate(text, source, 'en')
        return argos.translate(text, 'en' if source != 'en' and target != 'en' else source, target)


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, obj):
        body = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path == '/health':
            return self.respond(200, {'status': 'pilot', 'liveMeeting': False})
        return self.respond(404, {'error': 'Not found'})

    def do_POST(self):
        if self.path != '/translate':
            return self.respond(404, {'error': 'Not found'})
        secret = os.environ.get('ECHOES_TRANSLATE_API_KEY', '')
        supplied = self.headers.get('X-API-Key', '')
        if not secret or not hmac.compare_digest(supplied, secret):
            return self.respond(401, {'error': 'Unauthorized'})
        size = self.headers.get('Content-Length', '')
        if not size.isdecimal() or not 0 < int(size) <= MAX_BYTES:
            return self.respond(413, {'error': 'Invalid request size'})
        if self.headers.get('Content-Type', '').split(';')[0].strip().lower() != 'application/json':
            return self.respond(415, {'error': 'Expected JSON'})
        try:
            payload = json.loads(self.rfile.read(int(size)).decode('utf-8'))
            if not isinstance(payload, dict):
                raise ValueError('Invalid request')
            source, target, text = (payload.get(k) for k in ('source', 'target', 'text'))
            if source not in LANGUAGES or target not in LANGUAGES:
                raise ValueError('Unsupported language')
            if not isinstance(text, str) or not text.strip() or len(text) > MAX_CHARS:
                raise ValueError('Invalid text')
        except (ValueError, UnicodeError):
            return self.respond(400, {'error': 'Invalid request'})
        try:
            result = translate_text(text, source, target)
            if not result.strip():
                raise RuntimeError('Empty translation')
        except Exception:
            return self.respond(503, {'error': 'Translation unavailable'})
        return self.respond(200, {'source': source, 'target': target, 'translatedText': result, 'liveMeeting': False})

    def log_message(self, *args):
        pass


def main():
    port = int(os.environ.get('PORT', '10000'))
    server = ThreadingHTTPServer(('0.0.0.0', port), Handler)
    server.serve_forever()


if __name__ == '__main__':
    main()
