import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import boxTypesRouter from "./routes/boxTypes.js";
import inspectionRouter from "./routes/inspection.js";
import { ensureUploadDir } from "./services/storage.js";

const app = express();
const PORT = parseInt(process.env.PORT || "3101", 10);
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

const uploadDir = ensureUploadDir();

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ok" });
  } catch {
    res.status(503).json({ status: "degraded" });
  }
});

app.use("/api/uploads", express.static(uploadDir));
app.use("/api/box-types", boxTypesRouter);
app.use("/api/inspection", inspectionRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: err.message || "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
