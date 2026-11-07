'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Html5Qrcode } from 'html5-qrcode';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  ArrowLeft, QrCode, Camera, CheckCircle2, AlertTriangle,
  XCircle, Volume2, VolumeX, Keyboard, RefreshCw, Box, Building2
} from 'lucide-react';

export default function StockOpnameScannerPage() {
  const { id } = useParams();
  const router = useRouter();
  const { showToast } = useToast();

  const [sessionData, setSessionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [scannerActive, setScannerActive] = useState(false);
  const [selectedCondition, setSelectedCondition] = useState('Baik');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Manual input state
  const [manualCode, setManualCode] = useState('');
  const [processing, setProcessing] = useState(false);

  // Recent Scan Result Card
  const [lastScanResult, setLastScanResult] = useState<any>(null);

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const isScanningRef = useRef(false);

  useEffect(() => {
    fetchSession();
    return () => {
      stopScanner();
    };
  }, [id]);

  const fetchSession = async () => {
    try {
      const res = await fetch(`/api/stock-opname/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSessionData(data);
      }
    } catch {
      showToast('Gagal memuat sesi opname', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Web Audio Synthesizer Beep
  const playSound = (type: 'SUCCESS' | 'WARNING' | 'ERROR') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'SUCCESS') {
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08); // D6
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.2);
      } else if (type === 'WARNING') {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(370, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      }
    } catch {
      // AudioContext not allowed or not supported
    }
  };

  const startScanner = async () => {
    try {
      if (html5QrCodeRef.current) {
        await stopScanner();
      }

      const qrCode = new Html5Qrcode('qr-reader-container');
      html5QrCodeRef.current = qrCode;

      await qrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          if (!isScanningRef.current) {
            isScanningRef.current = true;
            await handleProcessScan(decodedText);
            // Brief pause before next scan to prevent duplicate trigger
            setTimeout(() => {
              isScanningRef.current = false;
            }, 1800);
          }
        },
        () => {
          // Ignore frame errors
        }
      );

      setScannerActive(true);
    } catch (err) {
      console.error(err);
      showToast('Tidak dapat mengakses kamera. Pastikan izin kamera aktif.', 'error');
      setScannerActive(false);
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch {
        // already stopped
      }
      html5QrCodeRef.current = null;
      setScannerActive(false);
    }
  };

  const handleProcessScan = async (codeToVerify: string) => {
    if (!codeToVerify || processing) return;

    try {
      setProcessing(true);
      const res = await fetch(`/api/stock-opname/${id}/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: codeToVerify.trim(),
          condition: selectedCondition,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setLastScanResult(data);
        if (data.scanResult === 'MATCH') {
          playSound('SUCCESS');
          showToast(`✓ Cocok: ${data.asset.name}`, 'success');
        } else if (data.scanResult === 'WRONG_LOCATION') {
          playSound('WARNING');
          showToast(`⚠ Salah Kamar: ${data.asset.name}`, 'warning');
        }
        fetchSession();
      } else {
        playSound('ERROR');
        showToast(data.error || 'Aset tidak terdaftar', 'error');
        setLastScanResult({
          scanResult: 'NOT_FOUND',
          message: data.error,
          code: codeToVerify,
        });
      }
    } catch {
      playSound('ERROR');
      showToast('Gagal memproses pemindaian', 'error');
    } finally {
      setProcessing(false);
      setManualCode('');
    }
  };

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: '3rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link
          href={`/dashboard/stock-opname/${id}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600 }}
        >
          <ArrowLeft size={16} /> Kembali ke Rekap
        </Link>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          style={{
            background: 'var(--color-surface2)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-sm)',
            padding: '0.4rem 0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            cursor: 'pointer',
            fontSize: '0.8rem',
            color: soundEnabled ? 'var(--color-success)' : 'var(--color-muted)',
            fontWeight: 600,
          }}
        >
          {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
          {soundEnabled ? 'Suara Aktif' : 'Senyap'}
        </button>
      </div>

      {/* Target Room Header */}
      <Card style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Target Ruangan Opname
          </div>
          <div style={{ fontSize: '1.15rem', fontWeight: 800, marginTop: '0.15rem' }}>
            {sessionData?.location?.name || sessionData?.location?.building}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
            Lt. {sessionData?.location?.floor || '1'} {sessionData?.location?.room ? `(${sessionData.location.room})` : ''}
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>
            Progres Fisik
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary-light)' }}>
            {sessionData?.totalScanned || 0} / {sessionData?.totalExpected || 0}
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
            {sessionData?.totalMatch || 0} Cocok &bull; {sessionData?.totalWrongLoc || 0} Nyasar
          </div>
        </div>
      </Card>

      {/* Condition Preset Selector */}
      <Card style={{ padding: '0.85rem 1.25rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.5rem' }}>
          Pilih Kondisi Fisik Default untuk Hasil Scan Berikutnya:
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          {[
            { id: 'Baik', label: 'Baik', color: 'var(--color-success)' },
            { id: 'Rusak Ringan', label: 'Rusak Ringan', color: '#eab308' },
            { id: 'Rusak Berat', label: 'Rusak Berat', color: '#ef4444' },
          ].map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCondition(c.id)}
              style={{
                padding: '0.5rem',
                borderRadius: 'var(--radius-sm)',
                border: selectedCondition === c.id ? `2px solid ${c.color}` : '1px solid var(--color-border)',
                background: selectedCondition === c.id ? 'var(--color-surface2)' : 'var(--color-surface)',
                fontWeight: 700,
                fontSize: '0.82rem',
                color: selectedCondition === c.id ? c.color : 'var(--color-muted)',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </Card>

      {/* Camera Viewfinder */}
      <Card style={{ padding: '1rem', textAlign: 'center' }}>
        <div
          id="qr-reader-container"
          style={{
            width: '100%',
            minHeight: '260px',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            background: '#0f172a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto',
            border: scannerActive ? '2px solid var(--color-primary)' : '1px dashed var(--color-border)',
          }}
        >
          {!scannerActive && (
            <div style={{ padding: '2rem 1rem', color: '#94a3b8' }}>
              <Camera size={44} style={{ margin: '0 auto 0.75rem', opacity: 0.6 }} />
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Kamera Sedang Nonaktif</div>
              <p style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>
                Tekan tombol di bawah untuk menyalakan kamera HP Anda.
              </p>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
          {!scannerActive ? (
            <Button variant="primary" onClick={startScanner} style={{ width: '100%' }}>
              <Camera size={16} /> Aktifkan Kamera Scanner HP
            </Button>
          ) : (
            <Button variant="danger" onClick={stopScanner} style={{ width: '100%' }}>
              Matikan Kamera
            </Button>
          )}
        </div>
      </Card>

      {/* Manual Input Bar */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-muted)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Keyboard size={15} /> Input Manual / Scanner Barcode Laser:
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessScan(manualCode);
          }}
          style={{ display: 'flex', gap: '0.5rem' }}
        >
          <input
            type="text"
            className="input-field"
            placeholder="Ketik atau scan kode aset (misal: AST-2026-0001)..."
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value)}
            style={{ flex: 1 }}
          />
          <Button type="submit" variant="primary" loading={processing} disabled={!manualCode.trim()}>
            Verifikasi
          </Button>
        </form>
      </Card>

      {/* Live Result Toast Card */}
      {lastScanResult && (
        <Card
          style={{
            padding: '1.25rem',
            borderLeft: `5px solid ${
              lastScanResult.scanResult === 'MATCH'
                ? 'var(--color-success)'
                : lastScanResult.scanResult === 'WRONG_LOCATION'
                ? '#eab308'
                : '#ef4444'
            }`,
            background: 'var(--color-surface)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <div style={{ marginTop: '0.2rem' }}>
              {lastScanResult.scanResult === 'MATCH' && <CheckCircle2 size={24} color="var(--color-success)" />}
              {lastScanResult.scanResult === 'WRONG_LOCATION' && <AlertTriangle size={24} color="#eab308" />}
              {lastScanResult.scanResult === 'NOT_FOUND' && <XCircle size={24} color="#ef4444" />}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.98rem' }}>
                {lastScanResult.scanResult === 'MATCH' && 'ASET COCOK DI RUANGAN INI'}
                {lastScanResult.scanResult === 'WRONG_LOCATION' && 'ASET SALAH KAMAR / NYASAR!'}
                {lastScanResult.scanResult === 'NOT_FOUND' && 'ASET TIDAK DITEMUKAN'}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                {lastScanResult.message}
              </div>

              {lastScanResult.asset && (
                <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', fontSize: '0.82rem' }}>
                  <div style={{ fontWeight: 700 }}>{lastScanResult.asset.name}</div>
                  <div style={{ fontFamily: 'monospace', color: 'var(--color-primary-light)' }}>{lastScanResult.asset.code}</div>
                  <div style={{ color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                    Lokasi Seharusnya: <strong>{lastScanResult.asset.expectedLocation}</strong>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Bottom Action: Return to Summary */}
      <Link href={`/dashboard/stock-opname/${id}`} className="btn btn-secondary" style={{ width: '100%', textAlign: 'center' }}>
        Selesai Scan & Buka Rekapitulasi Sesi
      </Link>
    </div>
  );
}
