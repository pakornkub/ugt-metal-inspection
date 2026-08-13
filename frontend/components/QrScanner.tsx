"use client";

import { useState } from "react";
import { ScanLine, QrCode, Check } from "lucide-react";
import { parseLotCaseNumber } from "@/lib/api";
import QrLiveScanner from "@/components/QrLiveScanner";

interface QrScannerProps {
  lotNo: string;
  onLotNoChange: (lotNo: string) => void;
  caseNo: string;
  onCaseNoChange: (caseNo: string) => void;
}

export default function QrScanner({
  lotNo,
  onLotNoChange,
  caseNo,
  onCaseNoChange,
}: QrScannerProps) {
  const [scanOpen, setScanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasValue = Boolean(lotNo);

  function handleDetect(text: string) {
    const parsed = parseLotCaseNumber(text);
    if (!parsed) {
      setError("QR ต้องมีตัวเลขอย่างน้อย 9 หลัก — ลองใหม่อีกครั้ง");
      return;
    }
    setError(null);
    onLotNoChange(parsed.lotNo);
    onCaseNoChange(parsed.caseNo);
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
      <div className="relative flex min-h-[120px] items-center justify-center bg-slate-50">
        {hasValue ? (
          <div className="flex flex-col items-center gap-2 text-slate-700">
            <Check className="h-9 w-9 text-green-500" />
            <span className="text-2xl font-bold">{caseNo ? `${lotNo}-${caseNo}` : lotNo}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <QrCode className="h-10 w-10" />
            <span className="text-sm font-medium">Lot No</span>
          </div>
        )}
      </div>

      <div className="flex border-t-2 border-slate-200">
        <button
          type="button"
          onClick={() => setScanOpen(true)}
          className="flex min-h-[48px] flex-1 items-center justify-center gap-2 bg-white py-3 text-sm font-semibold text-slate-700 active:bg-slate-50"
        >
          <ScanLine className="h-5 w-5" />
          {hasValue ? "สแกนใหม่" : "สแกน Lot No"}
        </button>
      </div>

      {error && (
        <div className="border-t-2 border-slate-200 px-3 py-2 text-center">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      <QrLiveScanner
        open={scanOpen}
        title="สแกน QR Lot No"
        hint="เล็ง QR Lot ให้อยู่ในกรอบ ระบบจะอ่านให้เองอัตโนมัติ"
        onClose={() => setScanOpen(false)}
        onDetect={handleDetect}
      />
    </div>
  );
}
