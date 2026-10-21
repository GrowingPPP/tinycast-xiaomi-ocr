# Local server setup

The extension talks to the demo server shipped with
[Xiaomi-OCR-0](https://github.com/SeerRay-Lab/Xiaomi-OCR-0). The server exposes
`POST /api/ocr` and forwards requests to an OpenAI-compatible endpoint.

Tested with Ollama 0.40.7 on macOS 26 (Apple Silicon), Python 3.13, and the
community BF16 GGUF package `longwayxu/xiaomi-ocr-0:bf16`.

> Upstream marks the Ollama backend as experimental. It applies the same prompts,
> preprocessing, and decoding settings as the demo, but accuracy is not guaranteed
> to match the published benchmark numbers.

## Automated setup

From the extension repository:

```sh
bash scripts/setup-server.sh
```

The script checks the upstream checkout (cloning it when missing), creates its
virtual environment, installs dependencies, writes a launchd plist, and waits for
the health endpoint. Options:

| Flag | Default | Meaning |
| --- | --- | --- |
| `--dir PATH` | `~/Developer/Xiaomi-OCR-0` | Upstream checkout location |
| `--port PORT` | `8787` | Demo server port |
| `--no-launchd` | off | Prepare files only; print the manual start command |

It does not download the model. Run `scripts/setup-ollama.sh` first. Rerunning the
script is safe: the existing checkout and venv are reused, and the launchd job is
replaced.

The rest of this page describes the manual steps.

## 1. Install Ollama and the model

From the extension repository:

```sh
bash scripts/setup-ollama.sh
```

The script installs Ollama with Homebrew when needed, starts the service, pulls
the model, and verifies that it appears in `ollama list`. It is safe to rerun.

Manual equivalent:

```sh
brew install ollama
brew services start ollama
ollama pull longwayxu/xiaomi-ocr-0:bf16
ollama list
```

The model is about 1.8 GB and runs on Metal. `ollama ps` shows roughly 2.1 GB while
loaded. Downloads resume when interrupted; rerun `ollama pull` after a network
failure. The first pull can take a while on a slow connection.

## 2. Get the runtime

```sh
git clone https://github.com/SeerRay-Lab/Xiaomi-OCR-0.git ~/Developer/Xiaomi-OCR-0
cd ~/Developer/Xiaomi-OCR-0
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Python 3.10 or newer is required. No GPU-specific packages are needed for the
Ollama backend.

## 3. Start the demo server

```sh
export XIAOMI_OCR_BACKEND=ollama
export XIAOMI_OCR_MODEL=longwayxu/xiaomi-ocr-0:bf16
export XIAOMI_OCR_LOCAL_URL=http://127.0.0.1:11434/v1
python demo/server.py --port 8787
```

Verify:

```sh
curl -s http://127.0.0.1:8787/api/health
```

A ready server returns `"ready": true` and the model name. `region.available` is
`false` unless PaddlePaddle and PaddleX are installed; this extension does not use
region mode.

## 4. Keep it running

`scripts/setup-server.sh` writes and loads this plist automatically. For a manual
installation, start from the template in
`examples/dev.local.xiaomi-ocr-demo.plist.example`.
Copy it to `~/Library/LaunchAgents/`, replace the placeholder paths, then:

```sh
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/dev.local.xiaomi-ocr-demo.plist
```

Logs go to the path set in the plist. To stop:

```sh
launchctl bootout gui/$(id -u)/dev.local.xiaomi-ocr-demo
```

## Alternatives

- Any compatible OpenAI-style server works; point `XIAOMI_OCR_LOCAL_URL` at it and
  adjust `XIAOMI_OCR_MODEL`.
- Upstream also documents SGLang and vLLM for NVIDIA GPUs. The demo server behavior
  is the same.

## Resource use

On an M1 Pro with 32 GB of unified memory:

| State | Memory |
| --- | --- |
| Model loaded, idle | about 2.1 GB |
| Typical screenshot request | unchanged, short-lived activations |
| Large 2048 px page | peak around 3.5–4.5 GB (estimate) |

Ollama keeps the model resident for 5 minutes after the last request by default.
