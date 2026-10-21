import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { parseHealth, type ServerHealth } from "./lib";

const run = promisify(execFile);

export async function checkHealth(serverUrl: string): Promise<ServerHealth> {
  const { stdout } = await run("/usr/bin/curl", [
    "-fsS",
    "--max-time",
    "2",
    `${serverUrl}/api/health`,
  ]);
  return parseHealth(JSON.parse(String(stdout)));
}
