# Xiaomi OCR Local

Tinycast 扩展：框选屏幕区域，交给本地运行的
[Xiaomi-OCR-0](https://github.com/SeerRay-Lab/Xiaomi-OCR-0) 识别，结果直接写入剪贴板。

[English](README.md)

[![CI](https://github.com/GrowingPPP/tinycast-xiaomi-ocr/actions/workflows/ci.yml/badge.svg)](https://github.com/GrowingPPP/tinycast-xiaomi-ocr/actions/workflows/ci.yml)

## 功能

1. 给 **OCR Screen Region** 绑定全局热键。
2. 按下后拖选屏幕区域。
3. 截图发送到本机 Xiaomi-OCR-0 demo server。
4. 识别结果（含 Markdown 表格和 LaTeX 公式）进入剪贴板。

M1 Pro 上普通截图约 2 秒返回；密集文档页会更久，因为输出 token 更多。

另有 **Check OCR Server Status** 命令：打开一个面板，显示 server URL、
**Check Connection** 按钮，点一下内联显示 **Ready** / **Not ready**，并给出模型和
模式。截图命令会先做同样的检查，服务未启动时不会先弹出框选界面。

## 环境要求

- macOS + Tinycast（或 Raycast）
- 本地 Xiaomi-OCR-0 demo server，监听 `http://127.0.0.1:8787`
  （[安装说明](docs/server-setup.md)）
- 启动器需要屏幕录制权限

## 准备 Ollama 和模型

```sh
bash scripts/setup-ollama.sh
```

脚本会：安装 Ollama（缺少时用 Homebrew）、启动服务、拉取
`longwayxu/xiaomi-ocr-0:bf16`（约 1.8 GB）。可重复执行，已安装时只做校验。
需要换模型标签时：

```sh
XIAOMI_OCR_MODEL=longwayxu/xiaomi-ocr-0:bf16 bash scripts/setup-ollama.sh
```

## 部署 demo server

```sh
bash scripts/setup-server.sh
```

脚本会：克隆上游到 `~/Developer/Xiaomi-OCR-0`、创建 venv、安装依赖、写入 launchd
plist，并等待 `/api/health` 就绪。可用参数：

```sh
bash scripts/setup-server.sh --dir ~/Developer/Xiaomi-OCR-0 --port 8787
bash scripts/setup-server.sh --no-launchd
```

也可以按[手动步骤](docs/server-setup.md)操作。

## 安装扩展

```sh
git clone https://github.com/GrowingPPP/tinycast-xiaomi-ocr.git
cd tinycast-xiaomi-ocr
npm install
npm run build
npm run install:tinycast
```

打开 Tinycast → Settings → Extensions，启用 **Xiaomi OCR Local**；再到 Settings →
Shortcuts 绑定热键。

如果改用界面手动安装：**Add from folder** 选 `build/` 目录，不要选仓库根目录。
Tinycast 要求 `package.json` 和 `ocr-screen.js` 在同一层。

使用 beta 版时，在安装命令前设置 `TINYCAST_BUNDLE_ID=com.tinycast.app.beta`。

## 偏好设置

| 偏好 | 默认值 | 说明 |
| --- | --- | --- |
| OCR Server URL | `http://127.0.0.1:8787` | 本地 demo server 地址 |
| Max Output Tokens | `8192` | 越小越快，密集页面需要更大 |

## 工作原理

标准 Raycast 格式扩展。唯一的 `no-view` 命令调用
`/usr/sbin/screencapture -i` 截取区域，把 PNG 发到 demo server 的 `/api/ocr`，
再把返回的 `content` 写入剪贴板。

扩展本身不跑模型，除配置的 server 地址外不向网络发送任何内容。

## 文档模式

上游 Xiaomi-OCR-0 有两种模式：

| 模式 | 行为 | 适用 |
| --- | --- | --- |
| `page` | 整张图直接交给模型 | 截图、手写、书法、不规则版式、场景文字 |
| `region` | 用 PP-DocLayoutV3 检测版面，裁剪后并发识别各区域 | 印刷体、规整文档；阅读顺序和表格更稳 |

本扩展固定使用 `page`：只调用 `/api/ocr`，不会调用 `/api/parse/regions`。这是
针对截图和混合内容的取舍，也意味着扩展里无法选择 region 模式。

即使服务端装了区域依赖，状态面板仍可能显示 `page mode`。region 模式还要求服务端
安装 PaddlePaddle、PaddleX 和 PP-DocLayoutV3；setup 脚本不安装这些依赖。缺少时
服务返回 `region.available: false`。

## Raycast 兼容性

manifest 和 API 用法符合 Raycast 扩展格式。Raycast 用户可以安装 Raycast CLI 后用
`npx ray develop` 运行，但本项目只在 Tinycast 上测试和支持。

## 限制

- Tinycast 的 HTTP 层 60 秒超时，非常密集的页面可能失败。
- 只用整页识别模式。上游的区域模式需要 PaddlePaddle、PaddleX 和
  PP-DocLayoutV3，本项目不安装。
- Ollama 后端和社区 BF16 GGUF 包在上游标记为 experimental，准确率不保证与
  官方 benchmark 一致。

更多见[故障排查](docs/troubleshooting.md)。

## 开发

```sh
npm run typecheck
npm test
npm run build
```

`npm run package` 会生成包含构建产物的 `xiaomi-ocr-local.zip`。

## 致谢

- [Xiaomi-OCR-0](https://github.com/SeerRay-Lab/Xiaomi-OCR-0)，SeerRay-Lab，
  Apache-2.0
- [Tinycast](https://tinycast.dev/)，abue-ammar
- 社区 Ollama 包 `longwayxu/xiaomi-ocr-0:bf16`

## 许可证

Apache-2.0，见 [LICENSE](LICENSE)。
