"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Loader2 } from "lucide-react";

interface QrLiveScannerProps {
  open: boolean;
  title: string;
  hint?: string;
  onClose: () => void;
  onDetect: (text: string) => void;
}

const CONTAINER_ID = "qr-live-reader";

export default function QrLiveScanner({
  open,
  title,
  hint,
  onClose,
  onDetect,
}: QrLiveScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const startedRef = useRef(false);
  const handledRef = useRef(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    handledRef.current = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets scan state before starting the external QR scanner, not a cascading update
    setError(null);
    setStarting(true);

    // Continuous scanning retries many frames per second, so a single blurry
    // frame (common on iPhone cameras that refocus at close range) no longer
    // fails the whole scan — a later sharp frame decodes. This is why this
    // works on iOS Safari where a single still-photo capture didn't.
    const scanner = new Html5Qrcode(CONTAINER_ID, { verbose: false });
    scannerRef.current = scanner;

    async function stop() {
      const active = scannerRef.current;
      if (!active) return;
      scannerRef.current = null;
      try {
        if (startedRef.current) await active.stop();
        active.clear();
      } catch {
        // ignore stop/teardown errors
      } finally {
        startedRef.current = false;
      }
    }

    scanner
      .start(
        { facingMode: "environment" },
        { fps: 10, qrbox: undefined, aspectRatio: 1 },
        (decodedText) => {
          if (handledRef.current) return;
          handledRef.current = true;
          const text = decodedText.trim();
          void stop().then(() => {
            onDetect(text);
            onClose();
          });
        },
        undefined // per-frame "not found" callbacks fire constantly — ignore them
      )
      .then(() => {
        startedRef.current = true;
        if (!cancelled) setStarting(false);
      })
      .catch((err) => {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(
          msg.includes("Permission") || msg.includes("NotAllowed")
            ? "ไม่ได้รับอนุญาตใช้กล้อง กรุณาอนุญาตในเบราว์เซอร์"
            : "เปิดกล้องไม่ได้ — ลองใหม่อีกครั้ง"
        );
        setStarting(false);
      });

    return () => {
      cancelled = true;
      void stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleClose() {
    const active = scannerRef.current;
    scannerRef.current = null;
    if (active && startedRef.current) {
      active
        .stop()
        .then(() => active.clear())
        .catch(() => {})
        .finally(() => {
          startedRef.current = false;
        });
    }
    onClose();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="font-semibold">{title}</p>
        <button
          type="button"
          onClick={handleClose}
          className="rounded-full p-2 active:bg-white/10"
          aria-label="ปิดกล้อง"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-black">
        {/* Let html5-qrcode size the <video> to the container width at the
            stream's natural aspect ratio. Do NOT force object-cover / a
            non-square box — the library maps its decode canvas from the
            element's client dimensions, so a stretched video produces a
            stretched (undecodable) QR canvas. */}
        <div id={CONTAINER_ID} className="w-full max-w-[100vmin]" />

        {!starting && !error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
            <p className="rounded-lg bg-black/50 px-3 py-1 text-center text-sm font-medium text-white">
              {hint ?? "เล็ง QR ให้อยู่ในกรอบ ระบบจะอ่านให้เองอัตโนมัติ"}
            </p>
          </div>
        )}

        {starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        )}

        {error && (
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-red-600/90 px-4 py-3 text-center text-sm text-white">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
