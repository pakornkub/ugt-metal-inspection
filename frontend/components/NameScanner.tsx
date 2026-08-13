"use client";

import { useState } from "react";
import { QrCode, ScanLine, Check, X } from "lucide-react";
import QrLiveScanner from "@/components/QrLiveScanner";

interface NameScannerProps {
  name: string;
  onNameChange: (name: string) => void;
}

export default function NameScanner({ name, onNameChange }: NameScannerProps) {
  const [scanOpen, setScanOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleDetect(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      setError("QR ไม่มีชื่อ — ลองใหม่อีกครั้ง");
      return;
    }
    setError(null);
    onNameChange(trimmed);
  }

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
      <div className="relative flex min-h-[120px] items-center justify-center bg-slate-50">
        {name ? (
          <div className="flex flex-col items-center gap-2 text-slate-700">
            <Check className="h-9 w-9 text-green-500" />
            <span className="text-lg font-bold">{name}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <QrCode className="h-10 w-10" />
            <span className="text-sm font-medium">ชื่อผู้ตรวจ</span>
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
          {name ? "สแกนใหม่" : "สแกนชื่อ"}
        </button>

        {name && (
          <button
            type="button"
            onClick={() => {
              onNameChange("");
              setError(null);
            }}
            className="flex min-h-[48px] items-center justify-center gap-2 border-l-2 border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-red-500 active:bg-slate-50"
          >
            <X className="h-5 w-5" />
            ล้าง
          </button>
        )}
      </div>

      {error && (
        <div className="border-t-2 border-slate-200 px-3 py-2 text-center">
          <p className="text-xs text-red-500">{error}</p>
        </div>
      )}

      <QrLiveScanner
        open={scanOpen}
        title="สแกน QR ชื่อผู้ตรวจ"
        hint="เล็ง QR ชื่อให้อยู่ในกรอบ ระบบจะอ่านให้เองอัตโนมัติ"
        onClose={() => setScanOpen(false)}
        onDetect={handleDetect}
      />
    </div>
  );
}
