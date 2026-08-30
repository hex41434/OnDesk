import { execFile } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import { gpus, matchHostSku, type Hardware } from "@ondesk/core";

export const dynamic = "force-dynamic";

const exec = promisify(execFile);

async function run(cmd: string, args: string[]): Promise<string | null> {
  try {
    const { stdout } = await exec(cmd, args, { timeout: 2500 });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function probe(): Promise<{ hint: string; memoryGb: number }> {
  const memoryGb = Math.round(os.totalmem() / 1024 ** 3);
  const nvsmi = await run("nvidia-smi", [
    "--query-gpu=name,memory.total",
    "--format=csv,noheader,nounits",
  ]);
  if (nvsmi) {
    const line = nvsmi.split("\n")[0] ?? "";
    const [name, mem] = line.split(",").map((s) => s.trim());
    const vram = mem ? Math.round(Number(mem) / 1024) : memoryGb;
    return { hint: name || "nvidia", memoryGb: vram || memoryGb };
  }
  const brand = await run("sysctl", ["-n", "machdep.cpu.brand_string"]);
  return { hint: brand || os.cpus()[0]?.model || os.arch(), memoryGb };
}

export async function GET(req: Request) {
  const hostname = new URL(req.url).hostname;
  if (!["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    return Response.json({
      hardware: null,
      hint: "Host detection is available only during local development.",
      memoryGb: 0,
    });
  }

  const raw = await probe();
  const hardware: Hardware | undefined = matchHostSku(
    raw.hint,
    raw.memoryGb,
    gpus,
  );
  return Response.json({
    hardware: hardware ?? null,
    hint: raw.hint,
    memoryGb: raw.memoryGb,
  });
}
