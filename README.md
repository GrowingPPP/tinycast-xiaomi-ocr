# Xiaomi OCR Local

A Tinycast extension that captures a screen region and recognizes it with
[Xiaomi-OCR-0](https://github.com/SeerRay-Lab/Xiaomi-OCR-0) running locally through
Ollama. The recognized Markdown is copied to the clipboard.

[中文说明](README.zh-CN.md)

[![CI](https://github.com/GrowingPPP/tinycast-xiaomi-ocr/actions/workflows/ci.yml/badge.svg)](https://github.com/GrowingPPP/tinycast-xiaomi-ocr/actions/workflows/ci.yml)

## What it does

1. Bind a global hotkey to **OCR Screen Region**.
2. Press it and drag a selection anywhere on screen.
3. The capture is sent to a local demo server running Xiaomi-OCR-0.
4. The result, including Markdown tables and LaTeX formulas, lands in the clipboard.

Typical screenshots return in about 2 seconds on an M1 Pro. Dense document pages
take longer because the model generates more tokens.

A second command, **Check OCR Server Status**, opens a panel with the server URL,
a **Check Connection** button, and an inline **Ready** / **Not ready** result with
the model and mode. The capture command runs the same check first, so a stopped
server fails before the selection UI opens.

## Requirements

- macOS with Tinycast (or Raycast)
- A local Xiaomi-OCR-0 demo server on `http://127.0.0.1:8787`
  ([setup guide](docs/server-setup.md))
- Screen Recording permission for the launcher app

## Prepare Ollama and the model

```sh
bash scripts/setup-ollama.sh
```

The script installs Ollama with Homebrew when missing, starts the service, and
pulls `longwayxu/xiaomi-ocr-0:bf16` (about 1.8 GB). It is idempotent; rerunning it
only verifies the model. Override the tag with `XIAOMI_OCR_MODEL` if needed:

```sh
XIAOMI_OCR_MODEL=longwayxu/xiaomi-ocr-0:bf16 bash scripts/setup-ollama.sh
```

## Set up the demo server

```sh
bash scripts/setup-server.sh
```

This clones the upstream runtime to `~/Developer/Xiaomi-OCR-0`, creates its
virtual environment, installs dependencies, writes a launchd plist, and waits for
`/api/health`. Options:

```sh
bash scripts/setup-server.sh --dir ~/Developer/Xiaomi-OCR-0 --port 8787
bash scripts/setup-server.sh --no-launchd
```

The [manual steps](docs/server-setup.md) remain available.

## Install the extension

```sh
git clone https://github.com/GrowingPPP/tinycast-xiaomi-ocr.git
cd tinycast-xiaomi-ocr
npm install
npm run build
npm run install:tinycast
```

Then open Tinycast → Settings → Extensions and enable **Xiaomi OCR Local**. Assign a
hotkey in Settings → Shortcuts.

To install through the UI instead, choose **Add from folder** and select the
`build/` directory, not the repository root. Tinycast needs `package.json` and
`ocr-screen.js` in the same folder.

Set `TINYCAST_BUNDLE_ID=com.tinycast.app.beta` before `npm run install:tinycast` if
you use the beta channel.

## Preferences

| Preference | Default | Meaning |
| --- | --- | --- |
| OCR Server URL | `http://127.0.0.1:8787` | Address of the local demo server |
| Max Output Tokens | `8192` | Lower is faster; dense pages need more |

## How it works

The extension is a standard Raycast-format extension. Its single `no-view` command
runs `/usr/sbin/screencapture -i` to grab a region, posts the PNG to the demo
server's `/api/ocr` endpoint, and copies the returned `content` field.

It does not run the model itself and does not send anything to the network beyond
the configured server URL.

## Document modes

Upstream Xiaomi-OCR-0 has two modes:

| Mode | What it does | Best for |
| --- | --- | --- |
| `page` | Sends the whole image to the model | Screenshots, handwriting, calligraphy, irregular layouts, scene text |
| `region` | Detects layout regions with PP-DocLayoutV3, crops them, and recognizes regions concurrently | Printed, regular documents; keeps reading order and tables |

This extension always uses `page`: it posts to `/api/ocr` and never calls
`/api/parse/regions`. That is deliberate for screenshots and mixed content, and it
means region mode cannot be selected from the extension.

The status panel may show `page mode` even when the server has region dependencies
installed. Region mode also requires PaddlePaddle, PaddleX, and PP-DocLayoutV3 on
the server; the setup scripts do not install them. Without those dependencies the
server reports `region.available: false`.

## Raycast compatibility

The manifest and API usage match Raycast's extension format. Raycast users can run
the project with the Raycast CLI (`npx ray develop`) after installing it, but only
Tinycast is tested and supported here.

## Limitations

- Tinycast's HTTP layer times out after 60 seconds, so very dense pages can fail.
- Only whole-image mode is used. Upstream region mode needs PaddlePaddle, PaddleX,
  and PP-DocLayoutV3, which are not installed by this project.
- The Ollama backend and the community BF16 GGUF package are marked experimental
  upstream. Accuracy is not guaranteed to match the authors' benchmark numbers.

More in [troubleshooting](docs/troubleshooting.md).

## Development

```sh
npm run typecheck
npm test
npm run build
```

`npm run package` produces `xiaomi-ocr-local.zip` with the built extension files.

## Acknowledgements

- [Xiaomi-OCR-0](https://github.com/SeerRay-Lab/Xiaomi-OCR-0) by SeerRay-Lab
  (Apache-2.0)
- [Tinycast](https://tinycast.dev/) by abue-ammar
- The community Ollama package `longwayxu/xiaomi-ocr-0:bf16`

## License

Apache-2.0. See [LICENSE](LICENSE).
