import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { ServiceError } from "./errors.js";
import { normalizeImportPayload } from "./import-normalizer.js";

const currentFilePath = fileURLToPath(import.meta.url);
const backendRoot = path.resolve(path.dirname(currentFilePath), "..", "..");
const workspaceRoot = path.resolve(backendRoot, "..", "..");
const wechatParserPath = path.join(workspaceRoot, "scripts", "parse_wechat_history.py");

function ensureAbsolutePath(filePath) {
  if (!filePath || typeof filePath !== "string") {
    throw new ServiceError("A local file path is required.", {
      status: 400,
      code: "import_file_path_missing"
    });
  }

  return path.isAbsolute(filePath) ? filePath : path.resolve(workspaceRoot, filePath);
}

async function readUtf8File(filePath) {
  try {
    return await fs.readFile(filePath, "utf8");
  } catch (error) {
    throw new ServiceError("Failed to read the import file.", {
      status: 400,
      code: "import_file_read_failed",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}

function runPythonWechatParser(filePath, options = {}) {
  return new Promise((resolve, reject) => {
    const args = [wechatParserPath, "--db", filePath];

    if (options.listContacts) {
      args.push("--list-contacts");
    }

    if (options.contactName) {
      args.push("--contact-name", String(options.contactName));
    }

    if (options.contactId) {
      args.push("--contact-id", String(options.contactId));
    }

    const child = spawn("python", args, {
      cwd: workspaceRoot
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(
        new ServiceError("Failed to launch the WeChatHistory parser.", {
          status: 500,
          code: "wechat_history_parser_launch_failed",
          details: error.message
        })
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        let details = stderr || stdout;

        try {
          details = JSON.parse(stdout || stderr);
        } catch {
          // ignore parse failures and keep raw text details
        }

        reject(
          new ServiceError("WeChatHistory parsing failed.", {
            status: 400,
            code: "wechat_history_parse_failed",
            details
          })
        );
        return;
      }

      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(
          new ServiceError("WeChatHistory parser returned invalid JSON.", {
            status: 500,
            code: "wechat_history_parser_invalid_json",
            details: error instanceof Error ? error.message : String(error)
          })
        );
      }
    });
  });
}

function listWechatContacts(filePath) {
  return runPythonWechatParser(filePath, { listContacts: true });
}

export async function normalizeImportFile(input = {}) {
  const filePath = ensureAbsolutePath(input.filePath);
  const extension = path.extname(filePath).toLowerCase();

  if (input.source === "wechat" && [".db", ".sqlite", ".sqlite3"].includes(extension)) {
    if (input.listContacts) {
      return listWechatContacts(filePath);
    }

    return runPythonWechatParser(filePath, {
      contactName: input.contactName,
      contactId: input.contactId
    });
  }

  const rawInput = await readUtf8File(filePath);
  return normalizeImportPayload({
    source: input.source,
    rawInput,
    fileName: input.fileName ?? path.basename(filePath)
  });
}
