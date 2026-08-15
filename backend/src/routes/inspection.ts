import { Router } from "express";
import { PrismaClient } from "@prisma/client";
import { upload } from "../middleware/upload.js";
import { predictImage } from "../services/aiClient.js";
import { saveUploadedFile } from "../services/storage.js";

const router = Router();
const prisma = new PrismaClient();

type InspectionResult = "LOCK" | "UNLOCK";

interface ImageEntry {
  path: string;
  result: InspectionResult;
}

function computeOverallResult(results: InspectionResult[]): "PASS" | "FAIL" {
  return results.every((r) => r === "LOCK") ? "PASS" : "FAIL";
}

router.get("/", async (req, res) => {
  const lotNo = typeof req.query.lot_no === "string" ? req.query.lot_no.trim() : "";
  const caseNo = typeof req.query.case_no === "string" ? req.query.case_no.trim() : "";
  const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
  const pageSize = Math.min(
    100,
    Math.max(1, parseInt(String(req.query.pageSize ?? "20"), 10) || 20)
  );

  const where = {
    ...(lotNo ? { lotNo: { contains: lotNo } } : {}),
    ...(caseNo ? { caseNo: { contains: caseNo } } : {}),
  };

  try {
    const [records, total] = await Promise.all([
      prisma.boxInspection.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.boxInspection.count({ where }),
    ]);

    res.json({
      // API wire format stays snake_case (unchanged contract with frontend) —
      // only the underlying Prisma/DB column names are PascalCase now.
      data: records.map((r) => ({
        id: r.id.toString(),
        name: r.name,
        lot_no: r.lotNo,
        case_no: r.caseNo,
        box_type: r.boxType,
        image_1: r.image1,
        result_1: r.result1,
        image_2: r.image2,
        result_2: r.result2,
        image_3: r.image3,
        result_3: r.result3,
        image_4: r.image4,
        result_4: r.result4,
        overall_result: r.overallResult,
        created_at: r.createdAt,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Failed to fetch inspections:", error);
    res.status(500).json({ error: "Failed to fetch inspections" });
  }
});

router.post("/predict", upload.single("image"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Image file is required" });
    return;
  }

  try {
    const { result, annotated_image } = await predictImage(req.file.path);

    if (result === "NO_DETECTION") {
      res.json({
        result,
        path: "",
        annotated_image: annotated_image ?? null,
      });
      return;
    }

    const savedPath = saveUploadedFile(req.file, "angle");
    res.json({
      result,
      path: savedPath,
      annotated_image: annotated_image ?? null,
    });
  } catch (error) {
    console.error("Prediction failed:", error);
    res.status(500).json({ error: "Prediction failed" });
  }
});

router.post("/", async (req, res) => {
  const { name, lot_no, case_no, box_type, images } = req.body as {
    name?: string;
    lot_no?: string;
    case_no?: string;
    box_type?: string;
    images?: ImageEntry[];
  };

  if (!name?.trim()) {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!/^\d{6}$/.test(lot_no?.trim() ?? "")) {
    res.status(400).json({ error: "lot_no must be exactly 6 digits" });
    return;
  }
  if (!/^\d{3}$/.test(case_no?.trim() ?? "")) {
    res.status(400).json({ error: "case_no must be exactly 3 digits" });
    return;
  }
  if (!box_type?.trim()) {
    res.status(400).json({ error: "box_type is required" });
    return;
  }
  if (!images || images.length !== 4) {
    res.status(400).json({ error: "Exactly 4 images are required" });
    return;
  }

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    if (!img.path?.trim()) {
      res.status(400).json({ error: `Image ${i + 1} path is required` });
      return;
    }
    if (img.result !== "LOCK" && img.result !== "UNLOCK") {
      res.status(400).json({ error: `Image ${i + 1} result must be LOCK or UNLOCK` });
      return;
    }
  }

  const results = images.map((img) => img.result);
  const overall_result = computeOverallResult(results);

  try {
    const record = await prisma.boxInspection.create({
      data: {
        name: name.trim(),
        lotNo: lot_no!.trim(),
        caseNo: case_no!.trim(),
        boxType: box_type.trim(),
        image1: images[0].path,
        result1: images[0].result,
        image2: images[1].path,
        result2: images[1].result,
        image3: images[2].path,
        result3: images[2].result,
        image4: images[3].path,
        result4: images[3].result,
        overallResult: overall_result,
      },
    });

    res.status(201).json({
      id: record.id.toString(),
      name: record.name,
      lot_no: record.lotNo,
      case_no: record.caseNo,
      box_type: record.boxType,
      overall_result: record.overallResult,
      created_at: record.createdAt,
    });
  } catch (error) {
    console.error("Failed to save inspection:", error);
    res.status(500).json({ error: "Failed to save inspection" });
  }
});

export default router;
