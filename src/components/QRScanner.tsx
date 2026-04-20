import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  processQRCheckIn,
  type QRData,
  type CheckInResponse,
} from "../lib/checkInService";
import { useAuth } from "../hooks";

type ScanResult = {
  id: string;
  message: string;
  type: "success" | "error";
  actionType?: "checkin" | "checkout" | "walk_in";
  timestamp: string;
};

interface QRScannerProps {
  onScanSuccess?: (result: CheckInResponse) => void;
  onScanError?: (error: string) => void;
}

type PlaywrightQrScannerDriver = {
  register: (handler: (decodedText: string) => void) => () => void;
};

export default function QRScanner({
  onScanSuccess,
  onScanError,
}: QRScannerProps) {
  const { user } = useAuth();

  const [isScanning, setIsScanning] = useState(false);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isScannerRunningRef = useRef(false);
  const containerId = "qr-scanner-container";

  const lastScannedRef = useRef<string>("");
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getPlaywrightDriver = useCallback((): PlaywrightQrScannerDriver | null => {
    if (typeof window === "undefined") {
      return null;
    }

    const testWindow = window as typeof window & {
      __PLAYWRIGHT_QR_SCANNER__?: PlaywrightQrScannerDriver;
    };

    return testWindow.__PLAYWRIGHT_QR_SCANNER__ ?? null;
  }, []);

  const handleQRCodeDetected = useCallback(
    async (decodedText: string) => {
      try {
        const qrData: QRData = JSON.parse(decodedText);

        if (
          !qrData.type ||
          !["checkin", "checkout", "walk_in"].includes(qrData.type)
        ) {
          throw new Error("Invalid QR code format");
        }

        if (!user) {
          throw new Error("User not authenticated");
        }

        // Dedup key includes both the raw payload AND the action type so that:
        // • Identical scans within 2 s are suppressed (spam prevention).
        // • A check-in followed by a check-out for the same member is always
        //   allowed through immediately (different key → different action).
        const dedupKey = `${decodedText}::${qrData.type}`;
        if (lastScannedRef.current === dedupKey) return;
        lastScannedRef.current = dedupKey;

        if (scanTimeoutRef.current) {
          clearTimeout(scanTimeoutRef.current);
        }
        scanTimeoutRef.current = setTimeout(() => {
          lastScannedRef.current = "";
        }, 2000);

        const result = await processQRCheckIn(qrData, user.id);

        const scanResult: ScanResult = {
          id: Date.now().toString(),
          message: result.message,
          type: result.success ? "success" : "error",
          actionType: qrData.type,
          timestamp: new Date().toISOString(),
        };

        setLastScan(scanResult);
        setScanResults((prev) => [scanResult, ...prev].slice(0, 10));

        if (result.success) {
          onScanSuccess?.(result);
          setTimeout(() => setLastScan(null), 3000);
        } else {
          onScanError?.(result.error || result.message);
        }
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to process QR code";

        const scanResult: ScanResult = {
          id: Date.now().toString(),
          message: `Error: ${msg}`,
          type: "error",
          timestamp: new Date().toISOString(),
        };

        setLastScan(scanResult);
        setScanResults((prev) => [scanResult, ...prev].slice(0, 10));

        onScanError?.(msg);
      }
    },
    [user, onScanSuccess, onScanError]
  );

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(containerId);
    }

    return () => {
      if (scannerRef.current && isScannerRunningRef.current) {
        scannerRef.current.stop().catch(() => {});
        isScannerRunningRef.current = false;
      }

      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }

      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const playwrightDriver = getPlaywrightDriver();

    if (playwrightDriver && isScanning && user) {
      setIsCameraLoading(false);
      setCameraError(null);

      return playwrightDriver.register((decodedText) => {
        void handleQRCodeDetected(decodedText);
      });
    }

    const startScanner = async () => {
      if (!scannerRef.current || !isScanning || !user) return;
      if (isScannerRunningRef.current) return;

      try {
        setIsCameraLoading(true);
        setCameraError(null);

        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          handleQRCodeDetected,
          () => {}
        );

        isScannerRunningRef.current = true;
        setIsCameraLoading(false);
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Failed to start camera";

        setCameraError(msg);
        setIsCameraLoading(false);
        setIsScanning(false);
      }
    };

    const stopScanner = async () => {
      if (!scannerRef.current) return;
      if (!isScannerRunningRef.current) return;

      try {
        await scannerRef.current.stop();
      } catch {
        // ignore
      } finally {
        isScannerRunningRef.current = false;
      }
    };

    if (isScanning) {
      startScanner();
    } else {
      stopScanner();
    }
  }, [getPlaywrightDriver, handleQRCodeDetected, isScanning, user]);

  const toggleScanning = () => {
    setIsScanning((prev) => !prev);
  };

  const clearResults = () => {
    setScanResults([]);
    setLastScan(null);
  };

  return (
    <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy">
            QR Scanner
          </p>
          <p className="mt-0.5 text-sm text-flexNavy/60">
            {isScanning
              ? "Point camera at QR code"
              : "Click Start Scanning"}
          </p>
        </div>

        <button
          onClick={toggleScanning}
          className={`rounded-lg px-4 py-2 font-semibold text-white transition ${
            isScanning
              ? "bg-red-600 hover:bg-red-700"
              : "bg-flexBlue hover:bg-flexNavy"
          }`}
        >
          {isScanning ? "Stop" : "Start"}
        </button>
      </div>

      <div className="relative mb-6">
        <div
          id={containerId}
          className="overflow-hidden rounded-xl border border-flexNavy/10 shadow-sm"
          style={{ height: "400px" }}
        />

        {isCameraLoading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-gray-100/90">
            Loading camera...
          </div>
        )}

        {cameraError && (
          <div className="absolute inset-0 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Camera Error</p>
            <p className="mt-1 text-xs">{cameraError}</p>
          </div>
        )}
      </div>

      {lastScan && (
        <div
          className={`mb-6 rounded-xl border p-4 ${
            lastScan.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <div className="flex items-center gap-2">
            {lastScan.actionType && (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase tracking-wide ${
                  lastScan.actionType === "checkin"
                    ? "bg-blue-100 text-blue-700"
                    : lastScan.actionType === "checkout"
                      ? "bg-orange-100 text-orange-700"
                      : "bg-purple-100 text-purple-700"
                }`}
              >
                {lastScan.actionType === "checkin"
                  ? "Check-In"
                  : lastScan.actionType === "checkout"
                    ? "Check-Out"
                    : "Walk-In"}
              </span>
            )}
            <p className="text-sm font-semibold">{lastScan.message}</p>
          </div>
        </div>
      )}

      {scanResults.length > 0 && (
        <div>
          <div className="mb-3 flex justify-between">
            <p className="text-xs font-semibold">
              Scan History ({scanResults.length})
            </p>
            <button onClick={clearResults} className="text-xs">
              Clear
            </button>
          </div>

          <div className="max-h-64 space-y-2 overflow-y-auto">
            {scanResults.map((r) => (
              <div
                key={r.id}
                className={`rounded-lg border p-3 text-xs ${
                  r.type === "success"
                    ? "border-green-200 bg-green-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <div className="flex items-center gap-1.5">
                  {r.actionType && (
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                        r.actionType === "checkin"
                          ? "bg-blue-100 text-blue-700"
                          : r.actionType === "checkout"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-purple-100 text-purple-700"
                      }`}
                    >
                      {r.actionType === "checkin"
                        ? "IN"
                        : r.actionType === "checkout"
                          ? "OUT"
                          : "WALK"}
                    </span>
                  )}
                  <span>{r.message}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
