import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { describeError, normalizeServerUrl } from "./lib";
import { checkHealth } from "./server";

interface Preferences {
  serverUrl?: string;
}

export default async function Command(): Promise<void> {
  const preferences = getPreferenceValues<Preferences>();
  const serverUrl = normalizeServerUrl(preferences.serverUrl);

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
    const mode = health.regionAvailable ? "区域模式可用" : "整页模式";
    await showToast({
      style: Toast.Style.Success,
      title: "OCR 服务就绪",
      message: `${health.model || "模型已加载"} · ${mode}`,
    });
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "OCR 服务未就绪",
      message: describeError(error, serverUrl),
    });
  }
}
