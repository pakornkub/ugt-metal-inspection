"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  ListChecks,
  Pencil,
  ChevronRight,
} from "lucide-react";
import QrScanner from "@/components/QrScanner";
import NameScanner from "@/components/NameScanner";
import BoxTypeSelect from "@/components/BoxTypeSelect";
import AngleCapture, { AngleData } from "@/components/AngleCapture";
import AddBar from "@/components/AddBar";
import { fetchBoxTypes, submitInspection, BoxType, ImageEntry } from "@/lib/api";

const EMPTY_ANGLE: AngleData = {
  path: "",
  result: null,
  previewUrl: null,
  processing: false,
};

function createEmptyAngles(): AngleData[] {
  return [1, 2, 3, 4].map(() => ({ ...EMPTY_ANGLE }));
}

interface StagedBox {
  name: string;
  lot_no: string;
  case_no: string;
  box_type: string;
  images: ImageEntry[];
}

interface BatchSummary {
  pass: number;
  fail: number;
}

export default function InspectionPage() {
  const [step, setStep] = useState<"scan" | "capture">("scan");

  const [name, setName] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [boxType, setBoxType] = useState("");
  const [boxTypes, setBoxTypes] = useState<BoxType[]>([]);
  const [boxTypesLoading, setBoxTypesLoading] = useState(true);
  const [angles, setAngles] = useState<AngleData[]>(createEmptyAngles);

  const [batch, setBatch] = useState<StagedBox[]>([]);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchSummary, setBatchSummary] = useState<BatchSummary | null>(null);
  const [batchError, setBatchError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoxTypes()
      .then(setBoxTypes)
      .catch(() => {
        // Keep UI usable even if backend is down
        setBoxTypes([
          { id: 1, name: "Gps5" },
          { id: 2, name: "Cimc" },
          { id: 3, name: "Gp1" },
          { id: 4, name: "Nikken" },
          { id: 5, name: "Eneos" },
          { id: 6, name: "Anqing" },
        ]);
      })
      .finally(() => setBoxTypesLoading(false));
  }, []);

  const handleAngleUpdate = useCallback((index: number, data: Partial<AngleData>) => {
    setAngles((prev) => {
      const next = [...prev];
      next[index - 1] = { ...next[index - 1], ...data };
      return next;
    });
  }, []);

  const scanReady = name.trim() !== "" && boxType.trim() !== "";

  const lotCaseReady = /^\d{6}$/.test(lotNo) && /^\d{3}$/.test(caseNo);

  const anglesReady = angles.every(
    (a) => a.path && (a.result === "LOCK" || a.result === "UNLOCK") && !a.processing
  );

  const canAdd = lotCaseReady && anglesReady;

  function handleNext() {
    if (!scanReady) return;
    setStep("capture");
  }

  function handleAdd() {
    if (!canAdd) return;

    setBatch((prev) => [
      ...prev,
      {
        name,
        lot_no: lotNo,
        case_no: caseNo,
        box_type: boxType,
        images: angles.map((a) => ({ path: a.path, result: a.result! })),
      },
    ]);
    setBatchSummary(null);
    setBatchError(null);

    // Keep the same inspector name + box type for the next box in the batch;
    // only reset the per-box fields and stay on the lot/capture page so the
    // user can scan the next Lot No right away.
    setLotNo("");
    setCaseNo("");
    setAngles(createEmptyAngles());
    setStep("capture");
  }

  async function handleSubmitAll() {
    if (batch.length === 0) return;

    setBatchSubmitting(true);
    setBatchError(null);

    const remaining: StagedBox[] = [];
    let pass = 0;
    let fail = 0;

    for (const box of batch) {
      try {
        const response = await submitInspection(box);
        if (response.overall_result === "PASS") pass++;
        else fail++;
      } catch {
        remaining.push(box);
      }
    }

    setBatch(remaining);
    setBatchSummary({ pass, fail });
    setBatchError(
      remaining.length > 0 ? `ส่งไม่สำเร็จ ${remaining.length} กล่อง — ลองใหม่อีกครั้ง` : null
    );
    setBatchSubmitting(false);

    if (remaining.length === 0) {
      // All boxes sent — clear the box type (must be re-selected) and the
      // per-box fields, then return to the name/type page for the next batch.
      // The inspector name is kept (clear it manually via the name card).
      setBoxType("");
      setLotNo("");
      setCaseNo("");
      setAngles(createEmptyAngles());
      setStep("scan");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[768px] flex-col bg-slate-100 px-4 pt-[env(safe-area-inset-top)] pb-4">
      <div className="flex flex-1 flex-col gap-4 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">UGT Metal Inspection</h1>
          {step === "scan" ? (
            <Link
              href="/records"
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border-2 border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm active:bg-slate-50"
            >
              <ListChecks className="h-4 w-4" />
              Records
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleSubmitAll}
              disabled={batch.length === 0 || batchSubmitting}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm font-semibold text-white shadow-sm active:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {batchSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              ส่ง ({batch.length})
            </button>
          )}
        </div>

        {batchSummary && (
          <div className="flex items-center justify-center gap-4 rounded-2xl border-2 border-slate-200 bg-white px-4 py-3 text-base font-bold">
            <span className="flex items-center gap-1.5 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              PASS {batchSummary.pass}
            </span>
            <span className="flex items-center gap-1.5 text-red-700">
              <XCircle className="h-5 w-5" />
              FAIL {batchSummary.fail}
            </span>
          </div>
        )}

        {batchError && <p className="text-center font-medium text-red-600">{batchError}</p>}

        {step === "scan" ? (
          <>
            <NameScanner name={name} onNameChange={setName} />

            <BoxTypeSelect
              boxTypes={boxTypes}
              value={boxType}
              onChange={setBoxType}
              loading={boxTypesLoading}
            />

            <button
              type="button"
              onClick={handleNext}
              disabled={!scanReady}
              className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 py-5 text-xl font-bold text-white shadow-lg active:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ต่อไป
              <ChevronRight className="h-6 w-6" />
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-slate-200 bg-white p-3 shadow-sm">
              <div>
                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                  ชื่อผู้ตรวจ
                </p>
                <p className="text-base font-bold text-slate-800">{name}</p>
                <p className="mt-1 text-sm font-medium text-slate-600">{boxType}</p>
              </div>
              <button
                type="button"
                onClick={() => setStep("scan")}
                className="flex shrink-0 items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-600 active:bg-blue-100"
              >
                <Pencil className="h-3.5 w-3.5" />
                แก้ไข
              </button>
            </div>

            <QrScanner
              lotNo={lotNo}
              onLotNoChange={setLotNo}
              caseNo={caseNo}
              onCaseNoChange={setCaseNo}
            />

            <div className="grid grid-cols-2 gap-3">
              {angles.map((angleData, i) => (
                <AngleCapture key={i} angle={i + 1} data={angleData} onUpdate={handleAngleUpdate} />
              ))}
            </div>

            <AddBar onAdd={handleAdd} disabled={!canAdd} count={batch.length} />
          </>
        )}
      </div>
    </main>
  );
}
