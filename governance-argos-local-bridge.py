#!/usr/bin/env python3
"""Echoes Governance Argos local bridge — DEVELOPMENT ONLY.

Runs on 127.0.0.1, no public deployment, no participant data, no JaaS audio.
Requires Python 3.11 and argostranslate==1.9.6.
Install eight language models explicitly with --install-models before --serve.
No credentials, CORS headers, persistent transcript storage or cloud billing.
"""
import argparse
import json
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

LANGUAGES = frozenset(("tr", "en", "ru", "es", "de"))
MAX_BYTES = 4096
MAX_CHARS = 1200
LOCK = threading.Lock()


def routes():
    return [(lang, "en") for lang in LANGUAGES if lang != "en"] + [
        ("en", lang) for lang in LANGUAGES if lang != "en"
    ]


def install_models():
    import argostranslate.package as packages
    packages.update_package_index()
    available = packages.get_available_packages()
    for source, target in routes():
        options = [p for p in available if p.from_code == source and p.to_code == target]
        if not options:
            raise RuntimeError("Missing Argos model: %s->%s" % (source, target))
        selected = options[0]
        print("Installing", source, "->", target, "version", selected.package_version, flush=True)
        packages.install_from_path(selected.download())


def ensure_models():
    import argostranslate.translate as translate
    installed = {(lang.from_code, target.to_code)
                 for lang in translate.get_installed_languages()
                 for target in lang.translations_to}
    missing = set(routes()) - installed
    if missing:
        raise RuntimeError("Models missing: %s. Run --install-models first." %
                           ", ".join("%s->%s" % pair for pair in sorted(missing)))


def convert(text, source, target):
    import argostranslate.translate as translate
    if source == target:
        return text
    with LOCK:  # serialize model use until actual service concurrency is validated
        if source != "en" and target != "en":
            intermediate = translate.translate(text, source, "en")
            if not intermediate.strip():
                raise RuntimeError("Empty intermediate translation")
            result = translate.translate(intermediate, "en", target)
        else:
            result = translate.translate(text, source, target)
    if not result.strip():
        raise RuntimeError("Empty translation")
    return result


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, payload):
        data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path == "/health":
            self.reply(200, {"status": "local-dev-only", "languages": sorted(LANGUAGES),
                             "translation": "Argos installed", "liveMeeting": False})
        else:
            self.reply(404, {"error": "Not found"})

    def do_POST(self):
        if self.path != "/translate":
            return self.reply(404, {"error": "Not found"})
        length = self.headers.get("Content-Length")
        if not length or not length.isdecimal() or int(length) > MAX_BYTES:
            return self.reply(413, {"error": "Invalid or oversized request"})
        if self.headers.get("Content-Type", "").split(";")[0].strip().lower() != "application/json":
            return self.reply(415, {"error": "Expected application/json"})
        try:
            body = json.loads(self.rfile.read(int(length)).decode("utf-8"))
            if not isinstance(body, dict):
                raise ValueError("Expected JSON object")
            text = body.get("text")
            source = body.get("source")
            target = body.get("target")
            if not isinstance(text, str) or not text.strip() or len(text) > MAX_CHARS:
                raise ValueError("Text must be 1–1200 characters")
            if source not in LANGUAGES or target not in LANGUAGES:
                raise ValueError("Unsupported language")
            result = convert(text, source, target)
        except (ValueError, UnicodeError) as exc:
            return self.reply(400, {"error": str(exc)})
        except Exception:
            # Never leak source text, internals or a traceback in HTTP responses.
            return self.reply(500, {"error": "Local translation failed"})
        self.reply(200, {"source": source, "target": target,
                         "translatedText": result, "liveMeeting": False})

    def log_message(self, format, *args):
        # Avoid logging participant-supplied content and URLs.
        pass


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--install-models", action="store_true")
    mode.add_argument("--serve", action="store_true")
    args = parser.parse_args()
    if args.install_models:
        install_models()
        return
    ensure_models()
    server = ThreadingHTTPServer(("127.0.0.1", 8765), Handler)
    print("LOCAL ONLY http://127.0.0.1:8765 — no JaaS integration, no public access", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
