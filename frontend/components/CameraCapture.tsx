"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, SwitchCamera, X, Loader2 } from "lucide-react";

interface CameraCaptureProps {
  open: boolean;
  title: string;
  fileName: string;
  qrGuide?: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

const FOCUS_SETTLE_MS = 700;

export default function CameraCapture({
  open,
  title,
  fileName,
  qrGuide = false,
  onClose,
  onCapture,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [ready, setReady] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");

  useEffect(() => {
    if (!open) {
      stopCamera();
      return;
    }

    let cancelled = false;

    async function startCamera() {
      setError(null);
      setReady(false);
      setStarting(true);
      stopCamera();

      if (!navigator.mediaDevices?.getUserMedia) {
        setError("เบราว์เซอร์นี้ไม่รองรับกล้อง กรุณาใช้ HTTPS หรืออัปโหลดรูปแทน");
        setStarting(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 2560 },
            height: { ideal: 1440 },
            // @ts-expect-error advanced focus constraints aren't in the TS lib yet
            advanced: [{ focusMode: "continuous" }],
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        trackRef.current = stream.getVideoTracks()[0] ?? null;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        // Give autofocus/exposure a beat to settle before the shutter is
        // usable — grabbing a frame the instant the stream opens is a common
        // cause of blurry, undecodable QR photos on phone cameras.
        settleTimerRef.current = setTimeout(() => {
          if (!cancelled) setReady(true);
        }, FOCUS_SETTLE_MS);
      } catch (err) {
        const message = err instanceof Error ? err.message : "ไม่สามารถเปิดกล้องได้";
        setError(
          message.includes("Permission") || message.includes("NotAllowed")
            ? "ไม่ได้รับอนุญาตใช้กล้อง กรุณาอนุญาตในเบราว์เซอร์"
            : "เปิดกล้องไม่ได้ — ลองสลับกล้องหรือใช้อัปโหลดแทน"
        );
      } finally {
        if (!cancelled) setStarting(false);
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (settleTimerRef.current) clearTimeout(settleTimerRef.current);
      stopCamera();
    };
  }, [open, facingMode]);

  function stopCamera() {
    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    trackRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }

  function handleClose() {
    stopCamera();
    onClose();
  }

  function finishCapture(blob: Blob) {
    const file = new File([blob], `${fileName}_${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
    stopCamera();
    onCapture(file);
    onClose();
  }

  function captureFromVideoFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Capture the full frame — the on-screen guide (when qrGuide is set) is
    // just a visual aid for framing, not a crop boundary. Cropping tightly to
    // it risks cutting off the QR's position-detection corners whenever the
    // physical code is held larger than the guide box, which breaks decoding.
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (blob) finishCapture(blob);
      },
      "image/jpeg",
      0.95
    );
  }

  async function handleCapture() {
    if (capturing) return;
    setCapturing(true);

    try {
      // ImageCapture.takePhoto() asks the camera hardware for an actual still
      // photo (its own focus/exposure pass, full sensor resolution) instead of
      // grabbing whatever the live preview frame happens to look like — this
      // is what makes phone QR photos decodable where a raw video-frame grab
      // often isn't. Not supported on iOS Safari, hence the fallback below.
      const ImageCaptureCtor = (
        window as unknown as {
          ImageCapture?: new (track: MediaStreamTrack) => {
            takePhoto: () => Promise<Blob>;
          };
        }
      ).ImageCapture;

      if (ImageCaptureCtor && trackRef.current) {
        const imageCapture = new ImageCaptureCtor(trackRef.current);
        const blob = await imageCapture.takePhoto();
        finishCapture(blob);
        return;
      }

      captureFromVideoFrame();
    } catch {
      captureFromVideoFrame();
    } finally {
      setCapturing(false);
    }
  }

  function toggleFacing() {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }

  if (!open) return null;

  const shutterDisabled = starting || !ready || !!error || capturing;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
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
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          className="max-h-full max-w-full object-contain"
        />

        {qrGuide && !starting && !error && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="aspect-square w-[70vmin] max-w-[80%] rounded-2xl border-4 border-dashed border-white/80" />
            <p className="rounded-lg bg-black/50 px-3 py-1 text-sm font-medium text-white">
              จัดให้ QR อยู่ในกรอบ ใกล้และชัดที่สุด
            </p>
          </div>
        )}

        {starting && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-10 w-10 animate-spin text-white" />
          </div>
        )}

        {!starting && !ready && !error && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
            <p className="rounded-lg bg-black/50 px-3 py-1 text-xs font-medium text-white">
              กำลังปรับโฟกัส...
            </p>
          </div>
        )}

        {error && (
          <div className="absolute inset-x-4 bottom-4 rounded-xl bg-red-600/90 px-4 py-3 text-center text-sm text-white">
            {error}
          </div>
        )}
      </div>

      <div className="flex items-center justify-center gap-10 px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={toggleFacing}
          disabled={starting || !!error}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white disabled:opacity-40"
          aria-label="สลับกล้อง"
        >
          <SwitchCamera className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={() => void handleCapture()}
          disabled={shutterDisabled}
          className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/90 active:scale-95 disabled:opacity-40"
          aria-label="ถ่ายรูป"
        >
          {capturing ? (
            <Loader2 className="h-8 w-8 animate-spin text-slate-800" />
          ) : (
            <Camera className="h-8 w-8 text-slate-800" />
          )}
        </button>

        <div className="h-12 w-12" />
      </div>
    </div>
  );
}
