"use client";

import { BoxType } from "@/lib/api";

interface BoxTypeSelectProps {
  boxTypes: BoxType[];
  value: string;
  onChange: (value: string) => void;
  loading?: boolean;
  inline?: boolean;
  compact?: boolean;
}

export default function BoxTypeSelect({
  boxTypes,
  value,
  onChange,
  loading,
  inline = false,
  compact = false,
}: BoxTypeSelectProps) {
  const content = (
    <>
      <label
        htmlFor="box-type"
        className={`block font-semibold tracking-wide text-slate-500 uppercase ${
          compact ? "mb-1 text-xs" : "mb-2 text-sm"
        }`}
      >
        Box Type
      </label>
      <select
        id="box-type"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        className={`w-full appearance-none rounded-lg border-2 border-slate-300 bg-white px-3 font-medium text-slate-800 focus:border-blue-500 focus:outline-none disabled:opacity-50 ${
          compact ? "min-h-[44px] py-2 text-base" : "min-h-[48px] rounded-xl px-4 py-3 text-lg"
        }`}
      >
        <option value="">Select box type...</option>
        {boxTypes.map((bt) => (
          <option key={bt.id} value={bt.name}>
            {bt.name}
          </option>
        ))}
      </select>
    </>
  );

  if (inline) return <div>{content}</div>;

  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm">{content}</div>
  );
}
