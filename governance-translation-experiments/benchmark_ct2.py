"""Isolated CPU benchmark for an already-converted OPUS-MT TR->EN CTranslate2 model.

Not connected to the Echoes meeting API. No credentials or real speech.
Model directory must contain model.bin, config.json and source.spm/target.spm
(or supply a shared sentencepiece.model as both).
"""
import argparse
import json
import statistics
import time
from pathlib import Path

SAMPLES = [
    "Her insan saygıyı hak eder.",
    "Birlikte daha adil bir gelecek kurabiliriz.",
    "Toplantımız şimdi başlıyor.",
    "Her ses değerlidir.",
    "Çocukların güvenliği hepimizin sorumluluğudur.",
]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model-dir", required=True)
    parser.add_argument("--threads", type=int, default=1)
    args = parser.parse_args()
    import ctranslate2
    import sentencepiece as spm

    model = Path(args.model_dir)
    source_file = next((p for p in [model / "source.spm", model / "sentencepiece.model"] if p.exists()), None)
    target_file = next((p for p in [model / "target.spm", model / "sentencepiece.model"] if p.exists()), None)
    if not source_file or not target_file:
        raise SystemExit("Missing SentencePiece tokenizer files")
    source = spm.SentencePieceProcessor(model_file=str(source_file))
    target = spm.SentencePieceProcessor(model_file=str(target_file))
    translator = ctranslate2.Translator(str(model), device="cpu", compute_type="int8",
                                         inter_threads=1, intra_threads=args.threads)
    results = []
    for sample in SAMPLES:
        tokens = source.encode(sample, out_type=str)
        started = time.perf_counter()
        prediction = translator.translate_batch([tokens], beam_size=1)[0].hypotheses[0]
        duration_ms = round((time.perf_counter() - started) * 1000)
        output = target.decode(prediction)
        if not output.strip():
            raise RuntimeError("Empty translation")
        results.append({"durationMs": duration_ms, "translatedText": output})
    print(json.dumps({"engine": "ctranslate2-int8", "synthetic": True,
                      "durationsMs": [r["durationMs"] for r in results],
                      "meanMs": round(statistics.mean(r["durationMs"] for r in results)),
                      "results": results}, ensure_ascii=False))


if __name__ == "__main__":
    main()
