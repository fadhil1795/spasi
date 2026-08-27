'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/Button';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function QRLabelsContent() {
  const searchParams = useSearchParams();
  const ids = searchParams.get('ids')?.split(',') || [];

  const [assets, setAssets] = useState<any[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length > 0) fetchAssetsData();
  }, [searchParams]);

  const fetchAssetsData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/assets');
      if (res.ok) {
        const all = await res.json();
        const selected = all.filter((a: any) => ids.includes(a.id));
        setAssets(selected);

        // Generate QR Code images
        const qrMap: Record<string, string> = {};
        for (const ast of selected) {
          const qrDataUrl = await QRCode.toDataURL(ast.qrToken || ast.code, {
            width: 150,
            margin: 1,
            color: { dark: '#000000', light: '#FFFFFF' },
          });
          qrMap[ast.id] = qrDataUrl;
        }
        setQrImages(qrMap);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      {/* Non-printable Controls Header */}
      <div className="no-print" style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <Link href="/dashboard/assets" style={{ color: 'var(--color-muted)', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
            <ArrowLeft size={16} /> Kembali ke Daftar Aset
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Cetak Label QR Code Aset ({assets.length})</h1>
        </div>

        <Button variant="primary" size="lg" onClick={handlePrint}>
          <Printer size={20} /> Cetak Label Sekarang
        </Button>
      </div>

      {/* Printable Sheet Layout */}
      {loading ? (
        <p>Meng-generate label QR Code...</p>
      ) : assets.length > 0 ? (
        <div className="printable-labels-grid">
          {assets.map((ast) => (
            <div key={ast.id} className="qr-label-card">
              <div className="qr-label-header">
                <div className="brand-title">SPASI PLATFORM</div>
                <div className="asset-code">{ast.code}</div>
              </div>

              <div className="qr-label-body">
                {qrImages[ast.id] && <img src={qrImages[ast.id]} alt="QR Code" className="qr-img" />}
                <div className="qr-details">
                  <div className="asset-name">{ast.name}</div>
                  <div className="asset-cat">{ast.category?.name || 'Inventaris Instansi'}</div>
                  {ast.brand && <div className="asset-brand">Brand: {ast.brand}</div>}
                </div>
              </div>

              <div className="qr-label-footer">MILIK ORGANISASI / INSTANSI — JANGAN DILEPAS</div>
            </div>
          ))}
        </div>
      ) : (
        <p>Tidak ada aset yang dipilih untuk dicetak.</p>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          .no-print, header, aside, topbar {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-labels-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
            padding: 10px !important;
          }
          .qr-label-card {
            border: 2px solid #000000 !important;
            break-inside: avoid !important;
          }
        }

        .printable-labels-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.25rem;
        }

        .qr-label-card {
          border: 2px solid var(--color-border);
          border-radius: var(--radius-md);
          padding: 0.85rem;
          background: #ffffff;
          color: #000000;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          box-shadow: var(--shadow-sm);
        }

        .qr-label-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid #000000;
          padding-bottom: 0.35rem;
        }

        .brand-title {
          font-size: 0.75rem;
          font-weight: 900;
          letter-spacing: 0.05em;
        }

        .asset-code {
          font-family: monospace;
          font-weight: 800;
          font-size: 0.85rem;
          background: #000000;
          color: #ffffff;
          padding: 0.1rem 0.4rem;
          border-radius: 4px;
        }

        .qr-label-body {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }

        .qr-img {
          width: 90px;
          height: 90px;
          object-fit: contain;
        }

        .qr-details {
          flex: 1;
        }

        .asset-name {
          font-size: 0.88rem;
          font-weight: 800;
          line-height: 1.2;
          margin-bottom: 0.2rem;
        }

        .asset-cat {
          font-size: 0.75rem;
          color: #555555;
          font-weight: 600;
        }

        .asset-brand {
          font-size: 0.7rem;
          color: #777777;
        }

        .qr-label-footer {
          border-top: 1px dashed #777777;
          padding-top: 0.3rem;
          font-size: 0.65rem;
          font-weight: 700;
          text-align: center;
          letter-spacing: 0.05em;
        }
      `}</style>
    </div>
  );
}

export default function QRLabelsPrintPage() {
  return (
    <Suspense fallback={<p>Memuat QR Code Labels...</p>}>
      <QRLabelsContent />
    </Suspense>
  );
}
