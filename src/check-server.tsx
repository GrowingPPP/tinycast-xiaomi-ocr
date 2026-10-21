import {
  Action,
  ActionPanel,
  Form,
  Icon,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { describeError, normalizeServerUrl } from "./lib";
import { checkHealth } from "./server";

interface Preferences {
  serverUrl?: string;
}

type CheckResult =
  | { state: "checking" }
  | { state: "ready"; model: string; mode: string }
  | { state: "not-ready"; model: string; message: string }
  | { state: "error"; message: string };

export default function Command() {
  const preferences = getPreferenceValues<Preferences>();
  const [serverUrl, setServerUrl] = useState(normalizeServerUrl(preferences.serverUrl));
  const [result, setResult] = useState<CheckResult>({ state: "checking" });

  async function runCheck(url: string) {
    setResult({ state: "checking" });
    try {
      const health = await checkHealth(normalizeServerUrl(url));
      if (health.ready) {
        setResult({
          state: "ready",
          model: health.model || "model loaded",
          mode: health.regionAvailable ? "region mode available" : "page mode",
        });
      } else {
        setResult({
          state: "not-ready",
          model: health.model,
          message: health.error || "Server responded but the model is not loaded.",
        });
      }
    } catch (error) {
      setResult({ state: "error", message: describeError(error, normalizeServerUrl(url)) });
    }
  }

  useEffect(() => {
    void runCheck(serverUrl);
    // The initial preference value is the only URL checked on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Form
      actions={
        <ActionPanel>
          <Action
            title="Check Connection"
            icon={Icon.ArrowClockwise}
            onAction={() => void runCheck(serverUrl)}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Open Extension Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="serverUrl"
        title="OCR Server URL"
        value={serverUrl}
        onChange={setServerUrl}
        placeholder="http://127.0.0.1:8787"
        info="Used for this check only. Change the persisted value in extension preferences."
      />
      <Form.Description title="Status" text={statusText(result)} />
      <Form.Description title="Details" text={detailsText(result)} />
    </Form>
  );
}

function statusText(result: CheckResult): string {
  switch (result.state) {
    case "checking":
      return "Checking…";
    case "ready":
      return "Ready";
    case "not-ready":
    case "error":
      return "Not ready";
  }
}

function detailsText(result: CheckResult): string {
  switch (result.state) {
    case "checking":
      return "Contacting the local server.";
    case "ready":
      return `${result.model} · ${result.mode}`;
    case "not-ready":
      return result.message;
    case "error":
      return result.message;
  }
}
