import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";

export function ensureUploadDir(): string {
  const dir = path.resolve(UPLOAD_DIR);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

export function saveUploadedFile(file: Express.Multer.File, prefix = "angle"): string {
  const dir = ensureUploadDir();
  const ext = path.extname(file.originalname) || ".jpg";
  const filename = `${prefix}_${randomUUID()}${ext}`;
  const dest = path.join(dir, filename);
  fs.copyFileSync(file.path, dest);
  fs.unlinkSync(file.path);
  return filename;
}

export function getUploadPath(filename: string): string {
  return path.join(ensureUploadDir(), filename);
}

export function deleteFile(filename: string): void {
  const filePath = getUploadPath(filename);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
