import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneStaticDir = path.join(standaloneDir, ".next", "static");
const builtStaticDir = path.join(rootDir, ".next", "static");
const builtPublicDir = path.join(rootDir, "public");
const standalonePublicDir = path.join(standaloneDir, "public");
const serverPath = path.join(standaloneDir, "server.js");

if (!fs.existsSync(serverPath)) {
  throw new Error("Standalone build output is missing. Run `npm run build` first.");
}

if (fs.existsSync(builtStaticDir)) {
  fs.mkdirSync(path.dirname(standaloneStaticDir), { recursive: true });
  fs.cpSync(builtStaticDir, standaloneStaticDir, { recursive: true });
}

if (fs.existsSync(builtPublicDir)) {
  fs.cpSync(builtPublicDir, standalonePublicDir, { recursive: true });
}

await import(pathToFileURL(serverPath).href);
