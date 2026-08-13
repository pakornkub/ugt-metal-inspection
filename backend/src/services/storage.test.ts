import { describe, expect, it, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const tmpDir = path.join(os.tmpdir(), `ugt-storage-test-${Date.now()}`);
process.env.UPLOAD_DIR = tmpDir;

const { ensureUploadDir, getUploadPath } = await import("./storage.js");

describe("storage", () => {
  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("creates the upload dir if missing", () => {
    const dir = ensureUploadDir();
    expect(fs.existsSync(dir)).toBe(true);
  });

  it("joins filenames under the upload dir", () => {
    expect(getUploadPath("foo.jpg")).toBe(path.join(tmpDir, "foo.jpg"));
  });
});
