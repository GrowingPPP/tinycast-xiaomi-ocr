export const DEFAULT_SERVER_URL = "http://127.0.0.1:8787";
export const DEFAULT_MAX_TOKENS = 8192;

export interface OcrRequest {
  image_base64: string;
  image_mime: "image/png";
  task: "document";
  max_tokens: number;
  temperature: number;
}

export function normalizeServerUrl(value?: string): string {
  const trimmed = (value ?? "").trim();
  return (trimmed || DEFAULT_SERVER_URL).replace(/\/+$/, "");
}

export function normalizeMaxTokens(value?: string): number {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_TOKENS;
}

export function buildOcrRequest(image: Buffer, maxTokens: number): OcrRequest {
  return {
    image_base64: image.toString("base64"),
    image_mime: "image/png",
    task: "document",
    max_tokens: maxTokens,
    temperature: 0,
  };
}

export function extractMarkdown(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const content = (payload as { content?: unknown }).content;
  return typeof content === "string" ? content.trim() : "";
}

export function describeError(error: unknown, serverUrl: string): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (
    /fetch failed|failed to fetch|could not connect|connection refused|econnrefused|network is down|socket/i.test(
      raw,
    )
  ) {
    return `无法连接本地 OCR 服务（${serverUrl}）。请确认 demo/server.py 正在运行。`;
  }
  if (/timed? ?out|timeout/i.test(raw)) {
    return "识别超时。Tinycast 的 HTTP 请求上限为 60 秒，可缩小框选区域或降低输出长度。";
  }
  return raw.slice(0, 300) || "未知错误";
}
