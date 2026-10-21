# Troubleshooting

## "无法连接本地 OCR 服务"

The extension cannot reach the demo server.

```sh
curl -s http://127.0.0.1:8787/api/health
```

- Connection refused: the server is not running. Start `demo/server.py` or the
  launchd service.
- `"ready": false`: Ollama is not running or the model name is wrong. Check
  `ollama ps` and `XIAOMI_OCR_MODEL`.
- Wrong port: update the **OCR Server URL** preference.

## `ollama pull` is slow or stalls

The model is about 1.8 GB. Downloads resume, so rerun the same pull after a
failure:

```sh
ollama pull longwayxu/xiaomi-ocr-0:bf16
```

Check progress with `ollama list` or by watching `~/.ollama/models`. A stalled
connection usually recovers on the next attempt.

## The selection does not appear or the image is black

Grant Screen Recording permission to the launcher app:

System Settings → Privacy & Security → Screen Recording → enable Tinycast (or
Raycast). Restart the launcher after changing the permission.

## Recognition times out

Tinycast's HTTP layer limits a request to 60 seconds. Options:

- Select a smaller region.
- Lower **Max Output Tokens** to 4096.
- Keep the model loaded by using the feature regularly; Ollama unloads it after
  5 minutes of idle time, and the first request after that is slower.

The formula-dense validation page from upstream takes about 40 seconds on an M1
Pro, which is close to the limit.

## Output looks different from the hosted service

The local path uses the community BF16 GGUF through Ollama. Upstream reports small
differences from the vLLM/SGLang path on formulas. Compare results on your own
documents before relying on the local path for exact reproduction.

## Region mode

This extension sends whole images and does not crop by layout. Region mode would
require PaddlePaddle, PaddleX, and PP-DocLayoutV3 on the server; it is slower on
macOS because layout detection runs on CPU.

## Where things live

| Item | Path |
| --- | --- |
| Extension source | this repository |
| Installed extension | `~/Library/Application Support/<bundle-id>/extensions/xiaomi-ocr-local` |
| Server runtime | the upstream checkout, e.g. `~/Developer/Xiaomi-OCR-0` |
| Ollama models | `~/.ollama/models` |
