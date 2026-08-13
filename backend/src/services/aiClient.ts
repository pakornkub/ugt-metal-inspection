import axios from "axios";
import FormData from "form-data";
import fs from "fs";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export type InspectionResult = "LOCK" | "UNLOCK" | "NO_DETECTION";

export interface PredictResult {
  result: InspectionResult;
  annotated_image?: string;
}

export async function predictImage(filePath: string): Promise<PredictResult> {
  const form = new FormData();
  form.append("image", fs.createReadStream(filePath));

  const response = await axios.post<PredictResult>(`${AI_SERVICE_URL}/predict`, form, {
    headers: form.getHeaders(),
    timeout: 60000,
  });

  return response.data;
}

export async function predictImageBuffer(buffer: Buffer, filename: string): Promise<PredictResult> {
  const form = new FormData();
  form.append("image", buffer, { filename, contentType: "image/jpeg" });

  const response = await axios.post<PredictResult>(`${AI_SERVICE_URL}/predict`, form, {
    headers: form.getHeaders(),
    timeout: 60000,
  });

  return response.data;
}
