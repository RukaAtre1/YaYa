import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { NextResponse } from "next/server";
import {
  fetchImportFileNormalization,
  fetchImportNormalization,
  toApiErrorResponse
} from "@/lib/yaya-backend";
import type { SupportedSource } from "@/types/yaya";

function sanitizeFileName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export async function POST(request: Request) {
  let temporaryPath = "";

  try {
    const formData = await request.formData();
    const source = String(formData.get("source") ?? "discord") as SupportedSource;
    const contactName = String(formData.get("contactName") ?? "").trim();
    const listContacts = String(formData.get("listContacts") ?? "").toLowerCase() === "true";
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: {
            code: "upload_file_missing",
            message: "No import file was provided."
          }
        },
        { status: 400 }
      );
    }

    const uploadDir = path.join(os.tmpdir(), "yaya-imports");
    await mkdir(uploadDir, { recursive: true });
    temporaryPath = path.join(uploadDir, `${Date.now()}-${sanitizeFileName(file.name)}`);
    await writeFile(temporaryPath, Buffer.from(await file.arrayBuffer()));

    if (source === "wechat") {
      return NextResponse.json(
        await fetchImportFileNormalization({
          source,
          filePath: temporaryPath,
          fileName: file.name,
          contactName: contactName || undefined,
          listContacts
        })
      );
    }

    const rawInput = await readFile(temporaryPath, "utf8");

    return NextResponse.json(
      await fetchImportNormalization({
        source,
        rawInput,
        fileName: file.name
      })
    );
  } catch (error) {
    const apiError = toApiErrorResponse(error);
    return NextResponse.json(apiError.body, { status: apiError.status });
  } finally {
    if (temporaryPath) {
      await rm(temporaryPath, { force: true }).catch(() => {});
    }
  }
}
