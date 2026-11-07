'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import QRCode from 'qrcode';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ArrowLeft, Pencil, Printer, QrCode, Building2, Tag, Box,
  Calendar, Clock, CheckCircle2, AlertTriangle, ArrowRightLeft,
  Wrench, Shield, ShoppingBag, CreditCard, ChevronRight, Download, Trash2
} from 'lucide-react';

export default function AssetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();
  const userRole = (session?.user as any)?.role;
  const canManage = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  const [asset, setAsset] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'specs' | 'loans' | 'maintenance' | 'transfers'>('specs');
  const [selectedImg, setSelectedImg] = useState<string>('');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Mutation/Transfer modal state
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [locations, setLocations] = useState<any[]>([]);
  const [targetLocationId, setTargetLocationId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferring, setTransferring] = useState(false);

  // Disposal States (Penghapusan / Pemutihan Aset)
  const [disposalModalOpen, setDisposalModalOpen] = useState(false);
  const [disposalReason, setDisposalReason] = useState('Rusak Berat Tidak Dapat Diperbaiki');
  const [salvageValue, setSalvageValue] = useState('');
  const [disposing, setDisposing] = useState(false);

  useEffect(() => {
    if (id) fetchAssetData();
  }, [id]);

  const fetchAssetData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/assets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setAsset(data);

        // Parse images
        try {
          const imgs = JSON.parse(data.images || '[]');
          if (Array.isArray(imgs) && imgs.length > 0) setSelectedImg(imgs[0]);
        } catch {
          // ignore
        }

        // Generate QR code with direct link
        const qrContent = typeof window !== 'undefined'
          ? `${window.location.origin}/assets/${data.id}`
          : data.code;
        const qrUrl = await QRCode.toDataURL(qrContent, {
          width: 200,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
        });
        setQrDataUrl(qrUrl);
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat detail aset', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openTransferModal = async () => {
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        setLocations(await res.json());
      }
      setTargetLocationId(asset?.locationId || '');
      setTransferReason('');
      setTransferModalOpen(true);
    } catch {
      showToast('Gagal memuat daftar lokasi ruangan', 'error');
    }
  };

  const handleExecuteTransfer = async () => {
    if (!targetLocationId && targetLocationId === asset?.locationId) {
      showToast('Pilih lokasi tujuan baru yang berbeda', 'warning');
      return;
    }

    try {
      setTransferring(true);
      const res = await fetch(`/api/assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...asset,
          locationId: targetLocationId || null,
          transferReason: transferReason.trim() || 'Mutasi lokasi aset via dashboard',
        }),
      });

      if (res.ok) {
        showToast('Mutasi penempatan aset berhasil dicatat!', 'success');
        setTransferModalOpen(false);
        fetchAssetData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memindahkan lokasi aset', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setTransferring(false);
    }
  };

  const handleExecuteDisposal = async () => {
    if (!disposalReason.trim()) {
      showToast('Alasan pemutihan / penghapusan wajib diisi', 'warning');
      return;
    }

    try {
      setDisposing(true);
      const res = await fetch(`/api/assets/${id}/disposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          disposalReason: disposalReason.trim(),
          salvageValue: salvageValue ? parseFloat(salvageValue) : 0,
        }),
      });

      if (res.ok) {
        showToast('Aset berhasil diafkirkan / dihapus dari buku inventaris aktif', 'success');
        setDisposalModalOpen(false);
        fetchAssetData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menghapuskan aset', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setDisposing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <Skeleton height="30px" width="220px" />
        <Skeleton height="400px" borderRadius="var(--radius-lg)" />
      </div>
    );
  }

  if (!asset) {
    return (
      <Card style={{ padding: '3rem', textAlign: 'center', maxWidth: '600px', margin: '3rem auto' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Aset Tidak Ditemukan</h2>
        <p style={{ color: 'var(--color-muted)', marginBottom: '1.5rem' }}>Data aset dengan ID ini tidak ada atau telah dihapus.</p>
        <Link href="/dashboard/assets" className="btn btn-secondary">
          <ArrowLeft size={16} /> Kembali ke Daftar Aset
        </Link>
      </Card>
    );
  }

  let imagesList: string[] = [];
  try {
    imagesList = JSON.parse(asset.images || '[]');
  } catch {}
  if (imagesList.length === 0) {
    imagesList = ['https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop'];
  }
  const currentImg = selectedImg || imagesList[0];

  let customAttrs: Record<string, string> = {};
  try {
    if (asset.customAttributes) {
      customAttrs = JSON.parse(asset.customAttributes);
    }
  } catch {}

  let checklist: string[] = [];
  try {
    if (asset.checklistItems) {
      checklist = JSON.parse(asset.checklistItems);
    }
  } catch {}

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Top Breadcrumb & Action Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link
            href="/dashboard/assets"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              fontSize: '0.85rem',
              color: 'var(--color-muted)',
              fontWeight: 600,
              marginBottom: '0.4rem',
            }}
          >
            <ArrowLeft size={16} /> Kembali ke Daftar Aset
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{asset.name}</h1>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, background: 'var(--color-surface2)', border: '1px solid var(--color-border)', padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
              {asset.code}
            </span>
            <Badge status={asset.status} />
          </div>
        </div>

        {/* Toolbar Buttons */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {asset.status !== 'DISPOSED' && (
            <Button variant="secondary" size="sm" onClick={openTransferModal}>
              <ArrowRightLeft size={15} /> Mutasi Lokasi
            </Button>
          )}
          <Link href={`/dashboard/assets/qr-labels?ids=${asset.id}`} className="btn btn-secondary btn-sm">
            <Printer size={15} /> Cetak Label QR
          </Link>
          {asset.status !== 'DISPOSED' && (
            <Link href={`/dashboard/assets/${asset.id}/edit`} className="btn btn-primary btn-sm">
              <Pencil size={15} /> Edit Aset
            </Link>
          )}
          {asset.status !== 'DISPOSED' && canManage && (
            <Button variant="danger" size="sm" onClick={() => setDisposalModalOpen(true)}>
              <Trash2 size={15} /> Afkir / Hapus Buku
            </Button>
          )}
          {asset.status === 'DISPOSED' && (
            <Link
              href={`/dashboard/assets/${asset.id}/disposal-report`}
              target="_blank"
              className="btn btn-secondary btn-sm"
              style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
            >
              <Printer size={15} /> Berita Acara Pemutihan
            </Link>
          )}
        </div>
      </div>

      {/* Disposed Warning Banner if Asset is decommissioned */}
      {asset.status === 'DISPOSED' && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            borderRadius: 'var(--radius-md)',
            padding: '1.2rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <AlertTriangle size={22} color="#ef4444" />
            </div>
            <div>
              <div style={{ fontWeight: 800, color: '#ef4444', fontSize: '1rem' }}>
                STATUS ASET: DIAFKIRKAN / DIHAPUS DARI BUKU AKTIF
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                Alasan Penghapusan: <strong>{asset.disposalReason || 'Kondisi Rusak Berat/Afkir'}</strong> &bull; Nilai Sisa (Salvage Value): <strong>{formatCurrency(asset.salvageValue || 0)}</strong>
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/assets/${asset.id}/disposal-report`}
            target="_blank"
            className="btn btn-secondary btn-sm"
            style={{ fontWeight: 700, borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444' }}
          >
            <Printer size={15} /> Buka Berita Acara (BA) Pemutihan
          </Link>
        </div>
      )}

      {/* Main Grid: 2 Columns */}
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '1.5rem', alignItems: 'start' }}>
        
        {/* Left Column: Media Gallery, QR Box, Financial Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Photos Card */}
          <Card style={{ padding: '1rem' }}>
            <div style={{ height: '240px', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: `url(${currentImg}) center/cover`, border: '1px solid var(--color-border)', marginBottom: '0.75rem' }} />
            {imagesList.length > 1 && (
              <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
                {imagesList.map((img, idx) => (
                  <img
                    key={idx}
                    src={img}
                    alt={`Thumb ${idx}`}
                    onClick={() => setSelectedImg(img)}
                    style={{
                      width: '60px',
                      height: '45px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-sm)',
                      cursor: 'pointer',
                      border: currentImg === img ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
                    }}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* QR Code & Identification Card */}
          <Card style={{ padding: '1.25rem', textAlign: 'center' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem' }}>
              Identifikasi QR Code Aset
            </div>
            {qrDataUrl && (
              <img
                src={qrDataUrl}
                alt="QR Code Aset"
                style={{ width: '150px', height: '150px', margin: '0 auto 0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', padding: '0.35rem', background: '#fff' }}
              />
            )}
            <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginBottom: '0.75rem' }}>
              Scan QR ini dengan kamera HP untuk verifikasi fisik aset secara instan.
            </div>
            {qrDataUrl && (
              <a
                href={qrDataUrl}
                download={`QR-${asset.code}.png`}
                className="btn btn-secondary btn-sm"
                style={{ width: '100%', display: 'inline-flex', justifyContent: 'center', gap: '0.4rem' }}
              >
                <Download size={14} /> Download Gambar QR
              </a>
            )}
          </Card>

          {/* Placement & Status Info */}
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Building2 size={16} style={{ color: 'var(--color-primary)' }} /> Penempatan & Pengelola
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.85rem' }}>
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Fakultas / Unit:</span>{' '}
                <strong>{asset.department?.name || 'Milik Pusat / Umum'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Tipe Penempatan:</span>{' '}
                <strong>{asset.isFixedToRoom ? '🏢 Terikat Ruangan (Fixed)' : '📦 Aset Bergerak (Mobile)'}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Lokasi Fisik:</span>{' '}
                <strong>
                  {asset.location ? `${asset.location.name || asset.location.building} (Lt. ${asset.location.floor || '1'} ${asset.location.room ? `- ${asset.location.room}` : ''})` : 'Gudang Umum / Tanpa Ruangan'}
                </strong>
              </div>
              <div>
                <span style={{ color: 'var(--color-muted)' }}>Kondisi Fisik:</span>{' '}
                <span style={{ fontWeight: 700, color: asset.condition === 'Baik' ? 'var(--color-success)' : 'var(--color-warning)' }}>
                  {asset.condition || 'Baik'}
                </span>
              </div>
            </div>
          </Card>

          {/* Finance & Valuation Summary */}
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CreditCard size={16} style={{ color: 'var(--color-primary)' }} /> Nilai Aset & Tarif
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>Harga Perolehan:</span>
                <strong>{formatCurrency(asset.purchaseCost || 0)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>Tgl Perolehan:</span>
                <span>{asset.purchaseDate ? formatDate(asset.purchaseDate) : '-'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>Tarif Sewa Harian:</span>
                <strong style={{ color: 'var(--color-primary)' }}>{formatCurrency(asset.dailyRentRate || 0)}/hari</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--color-muted)' }}>Tarif Add-on Sesi:</span>
                <strong>{formatCurrency(asset.sessionRentRate || 0)}/sesi</strong>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Tabbed Specifications & History */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Tab Navigation Header */}
          <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--color-border)', paddingBottom: '0.25rem' }}>
            <button
              onClick={() => setActiveTab('specs')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.6rem 1rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                color: activeTab === 'specs' ? 'var(--color-primary)' : 'var(--color-muted)',
                borderBottom: activeTab === 'specs' ? '2px solid var(--color-primary)' : 'none',
                marginBottom: '-2px',
              }}
            >
              📋 Spesifikasi Teknis
            </button>
            <button
              onClick={() => setActiveTab('transfers')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.6rem 1rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                color: activeTab === 'transfers' ? 'var(--color-primary)' : 'var(--color-muted)',
                borderBottom: activeTab === 'transfers' ? '2px solid var(--color-primary)' : 'none',
                marginBottom: '-2px',
              }}
            >
              🔄 Mutasi & Perpindahan ({asset.transfers?.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('loans')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.6rem 1rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                color: activeTab === 'loans' ? 'var(--color-primary)' : 'var(--color-muted)',
                borderBottom: activeTab === 'loans' ? '2px solid var(--color-primary)' : 'none',
                marginBottom: '-2px',
              }}
            >
              📅 Riwayat Peminjaman & Sewa
            </button>
            <button
              onClick={() => setActiveTab('maintenance')}
              style={{
                background: 'none',
                border: 'none',
                padding: '0.6rem 1rem',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                color: activeTab === 'maintenance' ? 'var(--color-primary)' : 'var(--color-muted)',
                borderBottom: activeTab === 'maintenance' ? '2px solid var(--color-primary)' : 'none',
                marginBottom: '-2px',
              }}
            >
              🛠️ Riwayat Servis / Perawatan
            </button>
          </div>

          {/* TAB 1: SPESIFIKASI TEKNIS & ATRIBUT */}
          {activeTab === 'specs' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Card style={{ padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Data Dasar Sarana</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Kategori</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{asset.category?.name || '-'}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Merek / Brand</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{asset.brand || '-'}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Nomor Seri / SN</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', fontFamily: 'monospace' }}>{asset.serialNumber || '-'}</div>
                  </div>
                  <div style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'uppercase' }}>Stok Fisik</div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{asset.quantity} unit ({asset.availableQty} tersedia)</div>
                  </div>
                </div>

                {/* Deskripsi */}
                <div style={{ marginTop: '1.25rem' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--color-muted)' }}>Deskripsi & Catatan</div>
                  <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: 'var(--color-text)' }}>
                    {asset.description || 'Tidak ada deskripsi rinci untuk sarana ini.'}
                  </p>
                </div>
              </Card>

              {/* Dynamic Attributes Card (FR-01) */}
              {Object.keys(customAttrs).length > 0 && (
                <Card style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Atribut Spesifik Kategori</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
                    Spesifikasi dinamis khusus yang tercatat untuk kategori ini.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {Object.entries(customAttrs).map(([k, v]) => (
                      <div key={k} style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', textTransform: 'capitalize' }}>
                          {k.replace(/([A-Z])/g, ' $1').toLowerCase()}
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>{v}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Checklist Kelengkapan Aksesori */}
              {checklist.length > 0 && (
                <Card style={{ padding: '1.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem' }}>Checklist Kelengkapan Sarana</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
                    Komponen wajib yang harus diperiksa pada saat serah terima dan pengembalian aset.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                    {checklist.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--color-surface2)', padding: '0.6rem 0.85rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem', fontWeight: 600 }}>
                        <CheckCircle2 size={16} style={{ color: 'var(--color-success)', flexShrink: 0 }} />
                        {item}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: MUTASI & PERPINDAHAN LOKASI */}
          {activeTab === 'transfers' && (
            <Card style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Riwayat Mutasi & Perpindahan Fisik</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>Catatan perpindahan penempatan sarana antar gedung, ruangan, atau gudang.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={openTransferModal}>
                  <ArrowRightLeft size={14} /> Mutasi Lokasi Baru
                </Button>
              </div>

              {asset.transfers && asset.transfers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {asset.transfers.map((t: any) => (
                    <div
                      key={t.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '1rem',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        background: 'var(--color-surface2)',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                          <span>{t.fromLocation || 'Gudang'}</span>
                          <span style={{ color: 'var(--color-primary)' }}>➔</span>
                          <span style={{ color: 'var(--color-success)' }}>{t.toLocation}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                          Alasan: <em>&quot;{t.reason || 'Mutasi penempatan'}&quot;</em> • Oleh: <strong>{t.transferredBy}</strong>
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                          {formatDate(t.transferredAt, 'dd MMM yyyy HH:mm')}
                        </div>
                        <Link
                          href={`/dashboard/assets/transfers/${t.id}/bast`}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: '0.75rem', padding: '0.25rem 0.6rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
                        >
                          <Printer size={13} /> Cetak BAST
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                  Aset ini belum memiliki riwayat mutasi lokasi. Lokasi saat ini masih sesuai penempatan awal.
                </div>
              )}
            </Card>
          )}

          {/* TAB 3: RIWAYAT PEMINJAMAN & SEWA */}
          {activeTab === 'loans' && (
            <Card style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Riwayat Transaksi Penggunaan</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-muted)' }}>Peminjaman Internal</h4>
                  {asset.loans && asset.loans.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {asset.loans.map((l: any) => (
                        <div key={l.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                          <div>
                            <strong>{l.user?.name || 'Peminjam'}</strong> • Tujuan: {l.purpose}
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                              {formatDate(l.startDate)} s.d. {formatDate(l.endDate)}
                            </div>
                          </div>
                          <Badge status={l.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>Belum ada transaksi peminjaman.</p>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--color-muted)' }}>Penyewaan Berbayar</h4>
                  {asset.rentals && asset.rentals.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {asset.rentals.map((r: any) => (
                        <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem' }}>
                          <div>
                            <strong>{r.renter?.name || 'Penyewa'}</strong> • Total: {formatCurrency(r.totalAmount || 0)}
                            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                              {formatDate(r.startDate)} s.d. {formatDate(r.endDate)}
                            </div>
                          </div>
                          <Badge status={r.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>Belum ada riwayat sewa komersial.</p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* TAB 4: RIWAYAT PEMELIHARAAN */}
          {activeTab === 'maintenance' && (
            <Card style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Riwayat Servis & Perawatan</h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>Catatan perbaikan teknis, penggantian suku cadang, dan kalibrasi rutin.</p>
                </div>
                <Link href="/dashboard/maintenance" className="btn btn-secondary btn-sm">
                  Kelola Modul Servis
                </Link>
              </div>

              {asset.maintenance && asset.maintenance.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {asset.maintenance.map((m: any) => (
                    <div key={m.id} style={{ padding: '0.85rem 1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                        <strong>{m.title || 'Servis Rutin'}</strong>
                        <Badge status={m.status} />
                      </div>
                      <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', margin: 0 }}>
                        {m.description || 'Pemeriksaan rutin sarana.'} • Biaya: <strong>{formatCurrency(m.cost || 0)}</strong> • Vendor: {m.vendor || 'Teknisi Internal'}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-muted)' }}>
                  Aset ini dalam kondisi prima dan belum memiliki catatan perawatan/servis.
                </div>
              )}
            </Card>
          )}

        </div>
      </div>

      {/* Modal Mutasi Lokasi Fisik */}
      {transferModalOpen && (
        <Modal
          isOpen={transferModalOpen}
          onClose={() => setTransferModalOpen(false)}
          title="Catat Mutasi / Perpindahan Penempatan Sarana"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginBottom: '0.25rem' }}>Aset yang Dipindahkan:</div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{asset.name} ({asset.code})</div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Lokasi Ruangan / Gedung Tujuan *
              </label>
              <select
                className="input-field"
                value={targetLocationId}
                onChange={(e) => setTargetLocationId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Pos / Gudang Penyimpanan Umum --</option>
                {locations.map((l: any) => (
                  <option key={l.id} value={l.id}>
                    {l.name || l.building} (Lt. {l.floor || '1'} {l.room ? `- ${l.room}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Alasan Mutasi / Catatan Berita Acara
              </label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Misal: Dipindahkan ke Lab Komputer 2 untuk kebutuhan praktikum semester ganjil..."
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setTransferModalOpen(false)} disabled={transferring}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleExecuteTransfer} loading={transferring}>
                Simpan Mutasi Lokasi
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Disposal / Afkir Modal */}
      {disposalModalOpen && (
        <Modal
          isOpen={disposalModalOpen}
          onClose={() => setDisposalModalOpen(false)}
          title="Berita Acara Penghapusan / Pemutihan Aset"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '0.85rem',
              fontSize: '0.85rem',
              color: 'var(--color-text)',
            }}>
              <strong>Peringatan Penghapusan Aset:</strong> Tindakan ini akan mengubah status aset menjadi <strong>DISPOSED</strong>, menghentikan ketersediaan peminjaman &amp; penyewaan, serta menerbitkan Berita Acara Penghapusan Aset resmi untuk keperluan audit dan inventarisasi sarpras.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Nama &amp; Kode Aset
              </label>
              <input
                className="input-field"
                value={`${asset.name} (${asset.code})`}
                disabled
                style={{ width: '100%', opacity: 0.7 }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Alasan Penghapusan / Afkir *
              </label>
              <select
                className="input-field"
                value={disposalReason}
                onChange={(e) => setDisposalReason(e.target.value)}
                style={{ width: '100%', marginBottom: '0.5rem' }}
              >
                <option value="Rusak Berat Tidak Dapat Diperbaiki">Rusak Berat Tidak Dapat Diperbaiki</option>
                <option value="Hilang / Tidak Ditemukan saat Stock Opname">Hilang / Tidak Ditemukan saat Stock Opname</option>
                <option value="Usang Secara Teknologi (Obsolete)">Usang Secara Teknologi (Obsolete)</option>
                <option value="Dihibahkan / Diserahkan ke Pihak Lain">Dihibahkan / Diserahkan ke Pihak Lain</option>
                <option value="Dijual / Dilelang Resmi">Dijual / Dilelang Resmi</option>
                <option value="Lainnya">Alasan Lainnya (Ketik Manual)</option>
              </select>
              {disposalReason === 'Lainnya' && (
                <input
                  type="text"
                  className="input-field"
                  placeholder="Ketikkan alasan penghapusan secara spesifik..."
                  style={{ width: '100%' }}
                  onChange={(e) => setDisposalReason(e.target.value)}
                />
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Estimasi Nilai Sisa / Hasil Penjualan Rongsok (Rp)
              </label>
              <input
                type="number"
                min="0"
                className="input-field"
                placeholder="0"
                value={salvageValue}
                onChange={(e) => setSalvageValue(e.target.value)}
                style={{ width: '100%' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                Opsional. Isi jika aset dijual kiloan/rongsok atau memiliki nilai residu.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setDisposalModalOpen(false)} disabled={disposing}>
                Batal
              </Button>
              <Button variant="danger" onClick={handleExecuteDisposal} loading={disposing}>
                <Trash2 size={15} /> Konfirmasi Penghapusan
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
