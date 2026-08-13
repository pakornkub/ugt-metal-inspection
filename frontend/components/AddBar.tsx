"use client";

import { PlusCircle } from "lucide-react";

interface AddBarProps {
  onAdd: () => void;
  disabled: boolean;
  count: number;
}

export default function AddBar({ onAdd, disabled, count }: AddBarProps) {
  return (
    <div className="sticky bottom-0 bg-gradient-to-t from-slate-100 via-slate-100 to-transparent pt-4 pb-[env(safe-area-inset-bottom)]">
      <p className="mb-2 text-center text-sm font-semibold text-slate-500">
        ถ่ายไปแล้ว {count} กล่อง
      </p>

      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className="flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl bg-slate-800 py-5 text-xl font-bold text-white shadow-lg active:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <PlusCircle className="h-6 w-6" />
        Add
      </button>
    </div>
  );
}
