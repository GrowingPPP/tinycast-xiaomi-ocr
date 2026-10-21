import assert from "node:assert/strict";
import test from "node:test";
import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_SERVER_URL,
  buildOcrRequest,
  describeError,
  extractMarkdown,
  normalizeMaxTokens,
  normalizeServerUrl,
} from "../src/lib";

test("normalizeServerUrl falls back to the default", () => {
  assert.equal(normalizeServerUrl(undefined), DEFAULT_SERVER_URL);
  assert.equal(normalizeServerUrl("   "), DEFAULT_SERVER_URL);
});

test("normalizeServerUrl trims whitespace and trailing slashes", () => {
  assert.equal(normalizeServerUrl(" http://127.0.0.1:9000/ "), "http://127.0.0.1:9000");
  assert.equal(normalizeServerUrl("http://127.0.0.1:9000///"), "http://127.0.0.1:9000");
});

test("normalizeMaxTokens keeps valid values and rejects the rest", () => {
  assert.equal(normalizeMaxTokens("4096"), 4096);
  assert.equal(normalizeMaxTokens(""), DEFAULT_MAX_TOKENS);
  assert.equal(normalizeMaxTokens("-1"), DEFAULT_MAX_TOKENS);
  assert.equal(normalizeMaxTokens("abc"), DEFAULT_MAX_TOKENS);
});

test("buildOcrRequest encodes the image and document task", () => {
  const request = buildOcrRequest(Buffer.from("png"), 4096);
  assert.equal(request.image_base64, "cG5n");
  assert.equal(request.image_mime, "image/png");
  assert.equal(request.task, "document");
  assert.equal(request.max_tokens, 4096);
  assert.equal(request.temperature, 0);
});

test("extractMarkdown returns trimmed content only", () => {
  assert.equal(extractMarkdown({ content: "  # Title\n" }), "# Title");
  assert.equal(extractMarkdown({ content: 42 }), "");
  assert.equal(extractMarkdown(null), "");
  assert.equal(extractMarkdown("text"), "");
});

test("describeError explains connection failures", () => {
  const message = describeError(new Error("fetch failed"), "http://127.0.0.1:8787");
  assert.match(message, /无法连接本地 OCR 服务/);
});

test("describeError explains timeouts", () => {
  const message = describeError(new Error("request timeout"), "http://127.0.0.1:8787");
  assert.match(message, /超时/);
});

test("describeError passes other messages through", () => {
  assert.equal(describeError(new Error("服务返回 502"), "http://x"), "服务返回 502");
});
