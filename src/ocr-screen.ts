import { Clipboard, getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import {
  buildOcrRequest,
  describeError,
  extractMarkdown,
  normalizeMaxTokens,
  normalizeServerUrl,
} from "./lib";
import { checkHealth } from "./server";

const run = promisify(execFile);
const CAPTURE_BIN = "/usr/sbin/screencapture";

interface Preferences {
  serverUrl?: string;
  maxTokens?: string;
}

async function captureRegion(file: string): Promise<boolean> {
  try {
    await run(CAPTURE_BIN, ["-i", "-x", "-o", "-t", "png", file]);
  } catch {
    return false;
  }
  return fs
    .stat(file)
    .then((info) => info.size > 0)
    .catch(() => false);
}

async function recognize(serverUrl: string, image: Buffer, maxTokens: number): Promise<unknown> {
  const response = await fetch(`${serverUrl}/api/ocr`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildOcrRequest(image, maxTokens)),
  });
  if (response.status < 200 || response.status >= 300) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`服务返回 ${response.status}${detail ? "：" + detail : ""}`);
  }
  return response.json();
}

export default async function Command(): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const serverUrl = normalizeServerUrl(preferences.serverUrl);
  const maxTokens = normalizeMaxTokens(preferences.maxTokens);
  const file = path.join(os.tmpdir(), `xiaomi-ocr-${Date.now()}.png`);

  try {
    const health = await checkHealth(serverUrl);
    if (!health.ready) {
      await showToast({
        style: Toast.Style.Failure,
        title: "OCR 服务未就绪",
        message: health.error || "服务已响应，但模型未加载。检查 Ollama 和模型名。",
      });
      return;
    }
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "OCR 服务未就绪",
      message: describeError(error, serverUrl),
    });
    return;
  }

  if (!(await captureRegion(file))) {
    await showHUD("已取消");
    return;
  }

  await showHUD("识别中…");

  try {
    const image = await fs.readFile(file);
    const result = await recognize(serverUrl, image, maxTokens);
    const markdown = extractMarkdown(result);
    if (!markdown) {
      await showHUD("未识别到文字");
      return;
    }
    await Clipboard.copy(markdown);
    await showHUD(`已复制 ${markdown.length} 字符`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "识别失败",
      message: describeError(error, serverUrl),
    });
  } finally {
    await fs.unlink(file).catch(() => undefined);
  }
}
