"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileDown, Loader2, Search } from "lucide-react";
import { fetchInspections, getImageUrl, InspectionRecord, InspectionResult } from "@/lib/api";
import ImageViewerModal from "@/components/ImageViewerModal";
import PrintableReport, { preloadImages } from "@/components/PrintableReport";

const PAGE_SIZE = 20;

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function AngleBadge({ result, onClick }: { result: InspectionResult; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-[36px] rounded-lg border-2 px-2.5 py-1 text-xs font-bold ${
        result === "LOCK"
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {result}
    </button>
  );
}

export default function RecordsPage() {
  const [lotNoInput, setLotNoInput] = useState("");
  const [lotNo, setLotNo] = useState("");
  const [caseNoInput, setCaseNoInput] = useState("");
  const [caseNo, setCaseNo] = useState("");
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<InspectionRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const load = useCallback(() => {
    fetchInspections({ lotNo, caseNo, page, pageSize: PAGE_SIZE })
      .then((res) => {
        setRecords(res.data);
        setTotal(res.total);
        setError(null);
        setSelectedIds(new Set());
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
    // reloadToken forces a refetch even when lotNo/caseNo/page are unchanged
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotNo, caseNo, page, reloadToken]);

  useEffect(() => {
    load();
  }, [load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setPage(1);
    setLotNo(lotNoInput.trim());
    setCaseNo(caseNoInput.trim());
    setReloadToken((t) => t + 1);
  }

  function goToPage(next: number) {
    setLoading(true);
    setPage(next);
  }

  const pageIds = useMemo(() => records.map((r) => r.id), [records]);
  const allPageSelected = pageIds.length > 0 && pageIds.every((id) => selectedIds.has(id));
  const somePageSelected = pageIds.some((id) => selectedIds.has(id)) && !allPageSelected;

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (pageIds.every((id) => prev.has(id))) {
        return new Set();
      }
      return new Set(pageIds);
    });
  }

  const selectedRecords = useMemo(
    () => records.filter((r) => selectedIds.has(r.id)),
    [records, selectedIds]
  );

  async function handleExportPdf() {
    if (selectedRecords.length === 0 || exporting) return;
    setExporting(true);
    try {
      const urls = selectedRecords.flatMap((r) =>
        ([1, 2, 3, 4] as const).map((n) => getImageUrl(r[`image_${n}`]))
      );
      await preloadImages(urls);
      // Let React paint PrintableReport imgs before print dialog
      await new Promise((r) => requestAnimationFrame(() => r(undefined)));
      window.print();
    } finally {
      setExporting(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const angleColumns: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];
  const selectedCount = selectedIds.size;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-slate-100 px-4 pt-[env(safe-area-inset-top)] pb-4">
      <div className="flex flex-1 flex-col gap-4 pt-4">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border-2 border-slate-200 bg-white shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5 text-slate-700" />
          </Link>
          <h1 className="flex-1 text-xl font-bold text-slate-800">Records</h1>
          {selectedCount > 0 && (
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={exporting}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 font-bold text-white active:bg-blue-700 disabled:opacity-60"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              Export PDF ({selectedCount})
            </button>
          )}
        </div>

        <form
          onSubmit={handleSearch}
          className="flex gap-2 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-sm"
        >
          <input
            type="text"
            inputMode="numeric"
            placeholder="ค้นหา Lot No..."
            value={lotNoInput}
            onChange={(e) => setLotNoInput(e.target.value)}
            className="min-h-[48px] flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
          />
          <input
            type="text"
            inputMode="numeric"
            placeholder="ค้นหา Case No..."
            value={caseNoInput}
            onChange={(e) => setCaseNoInput(e.target.value)}
            className="min-h-[48px] flex-1 rounded-xl border-2 border-slate-300 bg-white px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 font-bold text-white active:bg-slate-900"
          >
            <Search className="h-5 w-5" />
          </button>
        </form>

        {error && <p className="text-center font-medium text-red-600">{error}</p>}

        <div className="overflow-x-auto rounded-2xl border-2 border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading...
            </div>
          ) : records.length === 0 ? (
            <div className="py-12 text-center text-slate-500">ไม่พบข้อมูล</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                  <th className="w-10 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = somePageSelected;
                      }}
                      onChange={toggleSelectAll}
                      aria-label="เลือกทั้งหมด"
                      className="h-4 w-4 accent-blue-600"
                    />
                  </th>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Lot No</th>
                  <th className="px-4 py-3">Case No</th>
                  <th className="px-4 py-3">Box Type</th>
                  <th className="px-4 py-3">Angle 1</th>
                  <th className="px-4 py-3">Angle 2</th>
                  <th className="px-4 py-3">Angle 3</th>
                  <th className="px-4 py-3">Angle 4</th>
                  <th className="px-4 py-3">Overall</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleRow(r.id)}
                        aria-label={`เลือก ${r.name}`}
                        className="h-4 w-4 accent-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{r.lot_no}</td>
                    <td className="px-4 py-3 text-slate-600">{r.case_no}</td>
                    <td className="px-4 py-3 text-slate-600">{r.box_type}</td>
                    {angleColumns.map((n) => {
                      const image = r[`image_${n}` as const];
                      const result = r[`result_${n}` as const];
                      return (
                        <td key={n} className="px-4 py-3">
                          <AngleBadge
                            result={result}
                            onClick={() => setViewerImage(getImageUrl(image))}
                          />
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-lg border-2 px-2.5 py-1 text-xs font-bold ${
                          r.overall_result === "PASS"
                            ? "border-green-200 bg-green-50 text-green-700"
                            : "border-red-200 bg-red-50 text-red-700"
                        }`}
                      >
                        {r.overall_result}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {formatDate(r.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 pb-4">
          <button
            type="button"
            onClick={() => goToPage(Math.max(1, page - 1))}
            disabled={page <= 1 || loading}
            className="min-h-[44px] rounded-xl bg-slate-800 px-4 py-2 font-bold text-white active:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ก่อนหน้า
          </button>
          <span className="font-medium text-slate-600">
            หน้า {page} / {totalPages}
          </span>
          <button
            type="button"
            onClick={() => goToPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages || loading}
            className="min-h-[44px] rounded-xl bg-slate-800 px-4 py-2 font-bold text-white active:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ถัดไป
          </button>
        </div>
      </div>

      <ImageViewerModal imageUrl={viewerImage} onClose={() => setViewerImage(null)} />

      <PrintableReport records={selectedRecords} />
    </main>
  );
}
