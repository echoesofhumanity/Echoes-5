#!/usr/bin/env bash
set -euo pipefail
cd governance-translation-ct2
python -m pip install -r requirements.txt
# Conversion tools are build-only; they are not installed in the runtime image on Render.
python -m pip install --extra-index-url https://download.pytorch.org/whl/cpu 'torch==2.5.1+cpu' 'transformers==4.44.2' 'huggingface_hub==0.26.5'
python - <<'PY'
from huggingface_hub import snapshot_download
snapshot_download(repo_id="Helsinki-NLP/opus-mt-tr-en", local_dir="/tmp/echoes-opus-tr-en")
PY
ct2-transformers-converter --model /tmp/echoes-opus-tr-en --output_dir model --quantization int8 --copy_files source.spm target.spm
python - <<'PY'
from pathlib import Path
assert (Path("model") / "model.bin").exists()
assert (Path("model") / "source.spm").exists()
assert (Path("model") / "target.spm").exists()
print("CT2 model conversion completed", flush=True)
PY
