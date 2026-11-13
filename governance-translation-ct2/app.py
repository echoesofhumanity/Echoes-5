"""Isolated Echoes Governance TR->EN CT2 pilot; never logs participant text."""
import hmac
import json
import os
import threading
from urllib.parse import urlsplit
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

MODEL_DIR = Path(__file__).resolve().parent / "model"
API_KEY = os.environ.get("ECHOES_TRANSLATE_API_KEY", "")
MAX_BYTES = 4096
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


class Handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # No public GET resources exist: respond to probes and browser landing URLs.
        # Never log query strings or headers (they may contain private information).
        route = urlsplit(self.path).path
        print("CT2_GET route=" + (route if route in ("/", "/health", "/health/") else "other"), flush=True)
        return self.reply(200, {"status": "ready", "engine": "ct2",
                                "liveMeeting": False})

    def do_POST(self):
        if self.path != "/translate":
            return self.reply(404, {"error": "Not found"})
        if not API_KEY or not hmac.compare_digest(self.headers.get("X-API-Key", ""), API_KEY):
            return self.reply(401, {"error": "Unauthorized"})
        length = self.headers.get("Content-Length", "")
        if not length.isdecimal() or not 0 < int(length) <= MAX_BYTES:
            return self.reply(413, {"error": "Invalid size"})
        if self.headers.get("Content-Type", "").split(";")[0].strip() != "application/json":
            return self.reply(415, {"error": "Expected JSON"})
        try:
            data = json.loads(self.rfile.read(int(length)).decode("utf-8"))
            if not isinstance(data, dict) or data.get("source") != "tr" or data.get("target") != "en":
                raise ValueError()
            phrase = data.get("text")
            if not isinstance(phrase, str) or not phrase.strip() or len(phrase) > 1200:
                raise ValueError()
        except (ValueError, UnicodeError):
            return self.reply(400, {"error": "Invalid request"})
        try:
            with LOCK:
                tokens = source_tokenizer.encode(phrase, out_type=str) + ["</s>"]
                result = translator.translate_batch([tokens], beam_size=1,
                                                    max_decoding_length=64)[0].hypotheses[0]
                output = target_tokenizer.decode([t for t in result if t not in ("</s>", "<pad>")])
            if not output.strip() or len(output.split()) > max(24, len(phrase.split()) * 4):
                raise ValueError()
        except Exception:
            return self.reply(503, {"error": "Translation unavailable"})
        return self.reply(200, {"source": "tr", "target": "en",
                                "translatedText": output, "liveMeeting": False})

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    load_model()
    ThreadingHTTPServer(("0.0.0.0", int(os.environ.get("PORT", "10000"))), Handler).serve_forever()
