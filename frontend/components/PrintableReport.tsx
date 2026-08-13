"use client";

import { getImageUrl, InspectionRecord, InspectionResult } from "@/lib/api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function resultClass(result: InspectionResult): string {
  return result === "LOCK" ? "print-badge-lock" : "print-badge-unlock";
}

interface PrintableReportProps {
  records: InspectionRecord[];
}

export default function PrintableReport({ records }: PrintableReportProps) {
  if (records.length === 0) return null;

  const angles: Array<1 | 2 | 3 | 4> = [1, 2, 3, 4];

  return (
    <div className="printable-report" aria-hidden="true">
      {records.map((r) => (
        <article key={r.id} className="print-card">
          <header className="print-card-header">
            <div className="print-card-title">{r.name}</div>
            <div className="print-card-meta">
              <span>
                Lot-Case: {r.lot_no}-{r.case_no}
              </span>
              <span>Box Type: {r.box_type}</span>
              <span
                className={
                  r.overall_result === "PASS" ? "print-overall-pass" : "print-overall-fail"
                }
              >
                Overall: {r.overall_result}
              </span>
              <span>{formatDate(r.created_at)}</span>
            </div>
          </header>

          <div className="print-angle-grid">
            {angles.map((n) => {
              const image = r[`image_${n}` as const];
              const result = r[`result_${n}` as const];
              return (
                <figure key={n} className="print-angle">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(image)}
                    alt={`Angle ${n} ${result}`}
                    className="print-angle-img"
                  />
                  <figcaption className="print-angle-caption">
                    <span>มุม {n}</span>
                    <span className={resultClass(result)}>{result}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </article>
      ))}
    </div>
  );
}

/** Preload image URLs; resolves when all have loaded (or errored). */
export function preloadImages(urls: string[]): Promise<void> {
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = url;
        })
    )
  ).then(() => undefined);
}
