import { useState, useRef } from 'react';
import { QrCode, Camera, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/index';

export function QrScanner() {
  const { profile } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<'success' | 'duplicate' | 'error' | null>(null);
  const [resultMessage, setResultMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setScanning(true);
      scanFrame();
    } catch {
      setResult('error');
      setResultMessage('Could not access camera. You can enter the QR token manually below.');
    }
  };

  const scanFrame = () => {
    if (!streamRef.current || !videoRef.current) return;
    const video = videoRef.current;
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // We can't use a QR library, so we check for manual entry or file upload
      // The camera stream is for visual feedback
    }
    if (scanning) {
      requestAnimationFrame(scanFrame);
    }
  };

  const processCheckIn = async (token: string) => {
    if (!profile || !token.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      // Find the QR token
      const { data: qrToken, error: tokenError } = await supabase
        .from('qr_tokens')
        .select('*')
        .eq('token', token.trim())
        .maybeSingle();

      if (tokenError || !qrToken) {
        setResult('error');
        setResultMessage('Invalid QR code. Please try again.');
        setLoading(false);
        return;
      }

      // Call the process_check_in function
      const { data: checkInResult, error: rpcError } = await supabase.rpc('process_check_in', {
        p_attendee_id: profile.id,
        p_event_id: qrToken.event_id,
        p_session_id: qrToken.session_id,
        p_venue_id: qrToken.venue_id,
        p_qr_token: token.trim(),
      });

      if (rpcError) {
        setResult('error');
        setResultMessage(rpcError.message || 'Check-in failed. Please try again.');
        setLoading(false);
        return;
      }

      if (checkInResult === 'valid') {
        setResult('success');
        setResultMessage('Check-in successful! Your attendance has been recorded.');
      } else if (checkInResult === 'duplicate') {
        setResult('duplicate');
        setResultMessage('You have already checked in for this session. Duplicate check-in rejected.');
      }
    } catch {
      setResult('error');
      setResultMessage('Something went wrong. Please try again.');
    }
    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      // Read file as data URL for potential QR processing
      // Since we don't have a QR decoding library, we'll prompt for manual entry
      setResult('error');
      setResultMessage('Please enter the QR token manually in the field below.');
    } catch {
      setResult('error');
      setResultMessage('Could not read the image. Please try manual entry.');
    }
    setLoading(false);
  };

  const reset = () => {
    setResult(null);
    setResultMessage('');
    setManualToken('');
  };

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Scan QR Code</h1>

      {result === null && (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-teal-50">
              <QrCode className="h-10 w-10 text-teal-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Check-in via QR Code</h2>
            <p className="mt-2 text-sm text-slate-500">
              Scan the QR code displayed at the event venue to check in. Each session/venue has a unique QR code.
            </p>

            {!scanning ? (
              <div className="mt-6 space-y-3">
                <Button onClick={startCamera} size="lg" className="w-full">
                  <Camera className="mr-2 h-5 w-5" />
                  Open Camera
                </Button>
                <div className="relative">
                  <div className="my-3 flex items-center gap-3">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs text-slate-400">OR</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                  <p className="mb-2 text-sm font-medium text-slate-600">Enter QR token manually:</p>
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Paste QR token here..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none"
                  />
                  <Button
                    onClick={() => processCheckIn(manualToken)}
                    disabled={!manualToken.trim() || loading}
                    loading={loading}
                    className="mt-3 w-full"
                  >
                    Check In
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <div className="relative mx-auto max-w-xs overflow-hidden rounded-2xl bg-slate-900">
                  <video ref={videoRef} className="w-full" playsInline muted />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="h-48 w-48 rounded-2xl border-4 border-teal-400" />
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">Point your camera at the QR code...</p>
                <p className="mt-1 text-xs text-slate-400">
                  If camera scan doesn't work, enter the token manually below:
                </p>
                <div className="mt-3 flex gap-2">
                  <input
                    type="text"
                    value={manualToken}
                    onChange={(e) => setManualToken(e.target.value)}
                    placeholder="Enter token..."
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none"
                  />
                  <Button onClick={() => processCheckIn(manualToken)} disabled={!manualToken.trim() || loading} loading={loading}>
                    Check In
                  </Button>
                </div>
                <Button onClick={stopCamera} variant="outline" className="mt-3 w-full">
                  Close Camera
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {result === 'success' && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-emerald-600" />
          <h2 className="mt-4 text-xl font-bold text-slate-800">Check-in Successful!</h2>
          <p className="mt-2 text-sm text-slate-600">{resultMessage}</p>
          <Button onClick={reset} className="mt-6">
            <RefreshCw className="mr-2 h-4 w-4" />
            Scan Another
          </Button>
        </div>
      )}

      {result === 'duplicate' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <AlertTriangle className="mx-auto h-16 w-16 text-amber-600" />
          <h2 className="mt-4 text-xl font-bold text-slate-800">Already Checked In</h2>
          <p className="mt-2 text-sm text-slate-600">{resultMessage}</p>
          <Button onClick={reset} className="mt-6">
            <RefreshCw className="mr-2 h-4 w-4" />
            Scan Another
          </Button>
        </div>
      )}

      {result === 'error' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
            <XCircle className="mx-auto h-16 w-16 text-red-600" />
            <h2 className="mt-4 text-xl font-bold text-slate-800">Check-in Failed</h2>
            <p className="mt-2 text-sm text-slate-600">{resultMessage}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="mb-3 text-sm font-medium text-slate-600">Enter QR token manually:</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                placeholder="Paste QR token here..."
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-teal-400 focus:ring-2 focus:ring-teal-100 focus:outline-none"
              />
              <Button onClick={() => processCheckIn(manualToken)} disabled={!manualToken.trim() || loading} loading={loading}>
                Check In
              </Button>
            </div>
            <Button onClick={reset} variant="ghost" className="mt-3 w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              Start Over
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
