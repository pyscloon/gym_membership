import { useCallback, useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { processQRCheckIn, type QRData, type CheckInResponse } from "../lib/checkInService";
import { useAuth } from "../hooks";

type ScanResult = {
  id: string;
  message: string;
  type: "success" | "error";
  timestamp: string;
};

interface QRScannerProps {
  onScanSuccess?: (result: CheckInResponse) => void;
  onScanError?: (error: string) => void;
}

export default function QRScanner({ onScanSuccess, onScanError }: QRScannerProps) {
  const { user } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScannedRef = useRef<string>("");
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleQRCodeDetected = useCallback(async (decodedText: string) => {
    try {
      // Prevent duplicate scans within 2 seconds
      if (lastScannedRef.current === decodedText) {
        return;
      }

      lastScannedRef.current = decodedText;

      // Reset duplicate prevention after 2 seconds
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
      scanTimeoutRef.current = setTimeout(() => {
        lastScannedRef.current = "";
      }, 2000);

      // Parse QR data
      const qrData: QRData = JSON.parse(decodedText);

      // Validate QR data structure
      if (!qrData.type || !["checkin", "checkout", "walkin"].includes(qrData.type)) {
        throw new Error("Invalid QR code format");
      }

      // Process the QR code
      if (!user) {
        throw new Error("User not authenticated");
      }

      const result = await processQRCheckIn(qrData, user.id);

      // Add to results and notify parent
      const scanResult: ScanResult = {
        id: Date.now().toString(),
        message: result.message,
        type: result.success ? "success" : "error",
        timestamp: new Date().toISOString(),
      };

      setLastScan(scanResult);
      setScanResults((prev) => [scanResult, ...prev].slice(0, 10)); // Keep last 10 results

      if (result.success) {
        onScanSuccess?.(result);
        // Auto-clear success message after 3 seconds
        setTimeout(() => {
          setLastScan(null);
        }, 3000);
      } else {
        onScanError?.(result.error || result.message);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Failed to process QR code";
      console.error("QR processing error:", error);

      const scanResult: ScanResult = {
        id: Date.now().toString(),
        message: `Error: ${errorMsg}`,
        type: "error",
        timestamp: new Date().toISOString(),
      };

      setLastScan(scanResult);
      setScanResults((prev) => [scanResult, ...prev].slice(0, 10));
      onScanError?.(errorMsg);
    }
  }, [onScanError, onScanSuccess, user]);

  useEffect(() => {
    const initializeScanner = async () => {
      if (!containerRef.current || !isScanning || !user) return;

      try {
        setIsCameraLoading(true);
        setCameraError(null);

        // Create new scanner instance
        scannerRef.current = new Html5Qrcode("qr-scanner-container");

        // Start camera
        await scannerRef.current.start(
          { facingMode: "environment" }, // Use back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            handleQRCodeDetected(decodedText);
          },
          (error) => {
            // Ignore scanning errors (they happen frequently)
            console.debug("Scanning error:", error);
          }
        );

        setIsCameraLoading(false);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to initialize camera";
        console.error("Scanner initialization error:", err);
        setCameraError(errorMsg);
        setIsCameraLoading(false);
        setIsScanning(false);
      }
    };

    initializeScanner();

    // Cleanup on unmount
    return () => {
      if (scannerRef.current && isScanning) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current = null;
      }
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [handleQRCodeDetected, isScanning, user]);

  const toggleScanning = async () => {
    if (isScanning) {
      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
          scannerRef.current = null;
        } catch (err) {
          console.error("Error stopping scanner:", err);
        }
      }
      setIsScanning(false);
    } else {
      setIsScanning(true);
    }
  };

  const clearResults = () => {
    setScanResults([]);
    setLastScan(null);
  };

  return (
    <div className="rounded-2xl border border-flexNavy/15 bg-flexWhite/70 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-flexNavy">QR Scanner</p>
          <p className="text-sm text-flexNavy/60 mt-0.5">
            {isScanning ? "Point camera at QR code to scan" : "Click Start Scanning to begin"}
          </p>
        </div>
        <button
          onClick={toggleScanning}
          className={`px-4 py-2 rounded-lg font-semibold text-white transition ${
            isScanning
              ? "bg-red-600 hover:bg-red-700"
              : "bg-flexBlue hover:bg-flexNavy"
          }`}
        >
          {isScanning ? "Stop Scanning" : "Start Scanning"}
        </button>
      </div>

      {/* Camera Container */}
      {isScanning && (
        <div className="mb-6">
          {isCameraLoading && (
            <div className="bg-gray-100 rounded-xl border border-flexNavy/10 h-64 flex items-center justify-center">
              <p className="text-flexNavy/60">Loading camera...</p>
            </div>
          )}

          {cameraError && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-red-700 text-sm">
              <p className="font-semibold">Camera Error</p>
              <p className="text-xs mt-1">{cameraError}</p>
              <p className="text-xs mt-2">
                Please make sure you have camera permissions enabled in your browser settings.
              </p>
            </div>
          )}

          {!isCameraLoading && !cameraError && (
            <div
              id="qr-scanner-container"
              ref={containerRef}
              className="rounded-xl overflow-hidden border border-flexNavy/10 shadow-sm"
              style={{ height: "400px" }}
            />
          )}
        </div>
      )}

      {/* Last Scan Result */}
      {lastScan && (
        <div
          className={`mb-6 p-4 rounded-xl border ${
            lastScan.type === "success"
              ? "bg-green-50 border-green-200 text-green-700"
              : "bg-red-50 border-red-200 text-red-700"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="text-xl mt-0.5">
              {lastScan.type === "success" ? "✓" : "✕"}
            </span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{lastScan.message}</p>
              <p className="text-xs opacity-70 mt-1">
                {new Date(lastScan.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Scan Results History */}
      {scanResults.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-[0.16em] text-flexNavy font-semibold">
              Scan History ({scanResults.length})
            </p>
            <button
              onClick={clearResults}
              className="text-xs text-flexNavy/60 hover:text-flexNavy font-semibold transition"
            >
              Clear
            </button>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scanResults.map((result) => (
              <div
                key={result.id}
                className={`p-3 rounded-lg border text-xs ${
                  result.type === "success"
                    ? "bg-green-50 border-green-200 text-green-700"
                    : "bg-red-50 border-red-200 text-red-700"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="mt-0.5">
                    {result.type === "success" ? "✓" : "✕"}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{result.message}</p>
                    <p className="opacity-70 mt-0.5">
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results Message */}
      {isScanning && scanResults.length === 0 && !lastScan && !isCameraLoading && !cameraError && (
        <p className="text-center text-sm text-flexNavy/60 py-8">
          Waiting for QR code scan...
        </p>
      )}
    </div>
  );
}
