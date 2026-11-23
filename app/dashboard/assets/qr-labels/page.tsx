'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import QRCode from 'qrcode';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import {
  Printer, ArrowLeft, Filter, Layers, Building2, CheckSquare,
  Square, Eye, Sliders, RefreshCw, Bookmark, Tag, Sparkles, FolderTree
} from 'lucide-react';
import Link from 'next/link';

type LabelPreset = 'standard_2col' | 'sticker_3col' | 'mini_4col';

function QRLabelsContent() {
  const searchParams = useSearchParams();
  const initialIds = useMemo(() => {
    const raw = searchParams.get('ids');
    return raw ? raw.split(',').filter(Boolean) : [];
  }, [searchParams]);

  const { showToast } = useToast();

  // Data State
  const [allAssets, setAllAssets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generatingQR, setGeneratingQR] = useState(false);

  // Settings State
  const [labelPreset, setLabelPreset] = useState<LabelPreset>('standard_2col');
  const [institutionHeader, setInstitutionHeader] = useState('INVENTARIS KAMPUS / SEKOLAH');
  const [showLocation, setShowLocation] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [showCategory, setShowCategory] = useState(true);
  const [showFooter, setShowFooter] = useState(true);

  // Filter Quick Selectors
  const [categoryFilterSelect, setCategoryFilterSelect] = useState('ALL');
  const [locationFilterSelect, setLocationFilterSelect] = useState('ALL');

  // Modal Asset Selector
  const [selectorModalOpen, setSelectorModalOpen] = useState(false);
  const [modalSearch, setModalSearch] = useState('');

  // Fetch Core Data
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [resA, resC, resL] = await Promise.all([
        fetch('/api/assets'),
        fetch('/api/public/categories'),
        fetch('/api/locations'),
      ]);

      let assetsList: any[] = [];
      if (resA.ok) {
        assetsList = await resA.json();
        setAllAssets(assetsList);
      }
      if (resC.ok) setCategories(await resC.json());
      if (resL.ok) setLocations(await resL.json());

      // Jika URL tidak membawa ids tertentu, default pilih semua aset
      if (initialIds.length === 0 && assetsList.length > 0) {
        setSelectedIds(assetsList.map((a: any) => a.id));
      }
    } catch (e) {
      console.error(e);
      showToast('Gagal memuat data aset untuk cetak label', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Aset yang saat ini terpilih untuk dicetak
  const selectedAssets = useMemo(() => {
    return allAssets.filter((a) => selectedIds.includes(a.id));
  }, [allAssets, selectedIds]);

  // Generate QR Code untuk aset terpilih
  useEffect(() => {
    if (selectedAssets.length === 0) return;

    let isMounted = true;
    const generateQRs = async () => {
      setGeneratingQR(true);
      const newQrMap: Record<string, string> = { ...qrImages };
      const origin = typeof window !== 'undefined' ? window.location.origin : '';

      for (const ast of selectedAssets) {
        if (!newQrMap[ast.id]) {
          try {
            const scanUrl = `${origin}/dashboard/assets/${ast.id}`;
            const qrDataUrl = await QRCode.toDataURL(scanUrl, {
              width: 180,
              margin: 1,
              errorCorrectionLevel: 'M',
              color: { dark: '#000000', light: '#FFFFFF' },
            });
            newQrMap[ast.id] = qrDataUrl;
          } catch (err) {
            console.error('Failed to generate QR for', ast.code, err);
          }
        }
      }

      if (isMounted) {
        setQrImages(newQrMap);
        setGeneratingQR(false);
      }
    };

    generateQRs();
    return () => {
      isMounted = false;
    };
  }, [selectedAssets]);

  // Quick Selection Handlers
  const handleSelectAll = () => {
    setSelectedIds(allAssets.map((a) => a.id));
    showToast(`Memilih semua ${allAssets.length} aset`, 'success');
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleSelectByCategory = (catId: string) => {
    setCategoryFilterSelect(catId);
    if (catId === 'ALL') {
      setSelectedIds(allAssets.map((a) => a.id));
      return;
    }
    const matching = allAssets.filter(
      (a) => a.categoryId === catId || a.category?.parentId === catId
    );
    setSelectedIds(matching.map((a) => a.id));
    showToast(`Memilih ${matching.length} aset dari kategori ini`, 'success');
  };

  const handleSelectByLocation = (locId: string) => {
    setLocationFilterSelect(locId);
    if (locId === 'ALL') {
      setSelectedIds(allAssets.map((a) => a.id));
      return;
    }
    const matching = allAssets.filter((a) => a.locationId === locId);
    setSelectedIds(matching.map((a) => a.id));
    showToast(`Memilih ${matching.length} aset dari lokasi ini`, 'success');
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    if (selectedAssets.length === 0) {
      showToast('Pilih minimal satu aset sebelum mencetak', 'error');
      return;
    }
    window.print();
  };

  // Helper Pemisahan Hirarki Kategori
  const parentCategories = categories.filter((c: any) => !c.parentId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Non-printable Top Header & Action */}
      <div className="no-print" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link
            href="/dashboard/assets"
            style={{
              color: 'var(--color-muted)',
              fontSize: '0.88rem',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.4rem',
              marginBottom: '0.4rem',
            }}
          >
            <ArrowLeft size={16} /> Kembali ke Data Aset
          </Link>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Printer size={28} style={{ color: 'var(--color-primary-light)' }} />
            Cetak Label QR Code & Stiker Fisik Aset
          </h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.2rem' }}>
            Format kertas siap cetak untuk label stiker inventaris kampus dengan berbagai pilihan layout dan ukuran presisi.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="secondary"
            onClick={() => setSelectorModalOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <CheckSquare size={16} /> Pilih Unit Aset ({selectedIds.length})
          </Button>

          <Button
            variant="primary"
            onClick={handlePrint}
            disabled={selectedAssets.length === 0}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.75rem',
              fontSize: '1rem',
              fontWeight: 700,
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.4)',
            }}
          >
            <Printer size={20} /> Cetak Label Sekarang (Ctrl+P)
          </Button>
        </div>
      </div>

      {/* Non-printable Control & Customization Toolbar */}
      <div className="no-print spasi-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sliders size={16} style={{ color: 'var(--color-primary-light)' }} />
            Panel Pengaturan Kertas & Layout Label
          </div>

          <div style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
            <strong style={{ color: selectedAssets.length > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
              {selectedAssets.length}
            </strong>{' '}
            label siap dicetak
          </div>
        </div>

        {/* Baris 1: Pilihan Preset Ukuran & Kop Instansi */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          {/* Format / Ukuran Label */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              Format & Ukuran Kertas Label:
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => setLabelPreset('standard_2col')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: labelPreset === 'standard_2col' ? 700 : 500,
                  border: labelPreset === 'standard_2col' ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                  background: labelPreset === 'standard_2col' ? 'var(--grad-primary)' : 'var(--color-surface2)',
                  color: labelPreset === 'standard_2col' ? '#FFFFFF' : 'var(--color-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Standar A4 (2 Kolom)
              </button>

              <button
                type="button"
                onClick={() => setLabelPreset('sticker_3col')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: labelPreset === 'sticker_3col' ? 700 : 500,
                  border: labelPreset === 'sticker_3col' ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                  background: labelPreset === 'sticker_3col' ? 'var(--grad-primary)' : 'var(--color-surface2)',
                  color: labelPreset === 'sticker_3col' ? '#FFFFFF' : 'var(--color-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Stiker T&J (3 Kolom)
              </button>

              <button
                type="button"
                onClick={() => setLabelPreset('mini_4col')}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.8rem',
                  fontWeight: labelPreset === 'mini_4col' ? 700 : 500,
                  border: labelPreset === 'mini_4col' ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                  background: labelPreset === 'mini_4col' ? 'var(--grad-primary)' : 'var(--color-surface2)',
                  color: labelPreset === 'mini_4col' ? '#FFFFFF' : 'var(--color-muted)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                Mini Thermal (4 Kolom)
              </button>
            </div>
          </div>

          {/* Edit Teks Kop Instansi */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: '0.35rem' }}>
              Nama Instansi / Kop Label:
            </label>
            <input
              className="input-field"
              style={{ height: '38px', fontSize: '0.85rem' }}
              value={institutionHeader}
              onChange={(e) => setInstitutionHeader(e.target.value)}
              placeholder="Contoh: UNIVERSITAS / SEKOLAH SPASI"
            />
          </div>
        </div>

        {/* Baris 2: Pemilihan Cepat per Kategori / Ruangan */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.85rem', background: 'var(--color-surface2)', padding: '0.85rem', borderRadius: 'var(--radius-md)' }}>
          {/* Pilih Cepat Kategori */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
              Pilih Cepat Berdasarkan Kategori:
            </label>
            <select
              className="input-field"
              style={{ height: '36px', fontSize: '0.82rem' }}
              value={categoryFilterSelect}
              onChange={(e) => handleSelectByCategory(e.target.value)}
            >
              <option value="ALL">-- Semua Kategori --</option>
              {parentCategories.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pilih Cepat Ruangan */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--color-muted)', marginBottom: '0.25rem' }}>
              Pilih Cepat Berdasarkan Ruangan:
            </label>
            <select
              className="input-field"
              style={{ height: '36px', fontSize: '0.82rem' }}
              value={locationFilterSelect}
              onChange={(e) => handleSelectByLocation(e.target.value)}
            >
              <option value="ALL">-- Semua Ruangan / Gedung --</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.building} {loc.room ? `- ${loc.room}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Aksi Seleksi Massal */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
            <Button variant="secondary" size="sm" onClick={handleSelectAll} style={{ flex: 1 }}>
              Pilih Semua ({allAssets.length})
            </Button>
            <Button variant="ghost" size="sm" onClick={handleClearSelection} style={{ color: 'var(--color-danger)' }}>
              Kosongkan
            </Button>
          </div>
        </div>

        {/* Baris 3: Toggles Elemen Tampilan Label */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap', fontSize: '0.8rem', color: 'var(--color-text)' }}>
          <span style={{ fontWeight: 700, color: 'var(--color-muted)' }}>Opsi Cetak:</span>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showCategory}
              onChange={(e) => setShowCategory(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Kategori & Sub</span>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showBrand}
              onChange={(e) => setShowBrand(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Merek Barang</span>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showLocation}
              onChange={(e) => setShowLocation(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Lokasi Penempatan</span>
          </label>

          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={showFooter}
              onChange={(e) => setShowFooter(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            <span>Footer Peringatan</span>
          </label>
        </div>
      </div>

      {/* Printable Sheet Canvas Container */}
      <div
        className="printable-sheet-wrapper"
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
        }}
      >
        {loading ? (
          <div className="spasi-card" style={{ padding: '3rem', textAlign: 'center', width: '100%', maxWidth: '800px' }}>
            <RefreshCw size={36} className="animate-spin" style={{ margin: '0 auto 1rem auto', color: 'var(--color-primary-light)' }} />
            <p style={{ color: 'var(--color-muted)' }}>Menyiapkan data label & QR Code...</p>
          </div>
        ) : selectedAssets.length === 0 ? (
          <div className="spasi-card" style={{ padding: '3.5rem 1.5rem', textAlign: 'center', width: '100%', maxWidth: '800px' }}>
            <Printer size={48} style={{ color: 'var(--color-muted)', margin: '0 auto 1rem auto', opacity: 0.3 }} />
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--color-text)' }}>Tidak Ada Aset yang Dipilih</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--color-muted)', marginTop: '0.35rem', maxWidth: '400px', margin: '0.35rem auto 1.25rem auto' }}>
              Silakan pilih aset melalui filter di atas atau klik tombol "Pilih Unit Aset" untuk menentukan aset yang ingin dicetak.
            </p>
            <Button variant="primary" onClick={handleSelectAll}>
              Pilih Semua Aset ({allAssets.length} unit)
            </Button>
          </div>
        ) : (
          /* Lembar Kertas Putih A4 */
          <div className={`printable-page-canvas preset-${labelPreset}`}>
            {selectedAssets.map((ast) => {
              const qrSrc = qrImages[ast.id];
              const parentCat = ast.category?.parent?.name;
              const catName = ast.category?.name || 'Inventaris Sarpras';

              return (
                <div key={ast.id} className="qr-label-card">
                  {/* Header / Kop Instansi & Kode Aset */}
                  <div className="qr-label-header">
                    <div className="institution-title">{institutionHeader}</div>
                    <div className="asset-tag-code">{ast.code}</div>
                  </div>

                  {/* Body: QR Code + Informasi Spesifikasi */}
                  <div className="qr-label-body">
                    <div className="qr-img-wrapper">
                      {qrSrc ? (
                        <img src={qrSrc} alt={`QR ${ast.code}`} className="qr-image" />
                      ) : (
                        <div className="qr-placeholder">QR</div>
                      )}
                    </div>

                    <div className="qr-info-content">
                      <div className="label-asset-name">{ast.name}</div>

                      {showCategory && (
                        <div className="label-meta-item cat-item">
                          {parentCat ? `${parentCat} › ${catName}` : catName}
                        </div>
                      )}

                      {showBrand && ast.brand && (
                        <div className="label-meta-item">
                          Merek: <strong>{ast.brand}</strong>
                        </div>
                      )}

                      {showLocation && ast.location && (
                        <div className="label-meta-item">
                          Lok: {ast.location.building} {ast.location.room ? `- ${ast.location.room}` : ''}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer Label */}
                  {showFooter && (
                    <div className="qr-label-footer">
                      MILIK RESMI — PINDAI QR UNTUK CEK KELAYAKAN & PEMINJAMAN
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Pemilihan Aset Khusus */}
      <Modal
        isOpen={selectorModalOpen}
        onClose={() => setSelectorModalOpen(false)}
        title={`Pilih Unit Aset untuk Dicetak (${selectedIds.length} dari ${allAssets.length} dipilih)`}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Search bar di dalam modal */}
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <input
              className="input-field"
              placeholder="Cari nama atau kode aset..."
              value={modalSearch}
              onChange={(e) => setModalSearch(e.target.value)}
              style={{ flex: 1, height: '36px', fontSize: '0.85rem' }}
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const visible = allAssets.filter(
                  (a) =>
                    a.name.toLowerCase().includes(modalSearch.toLowerCase()) ||
                    a.code.toLowerCase().includes(modalSearch.toLowerCase())
                );
                setSelectedIds(visible.map((a) => a.id));
              }}
            >
              Pilih Hasil Cari
            </Button>
          </div>

          {/* List aset dengan checklist */}
          <div
            style={{
              maxHeight: '350px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '0.5rem',
            }}
          >
            {allAssets
              .filter((a) => {
                if (!modalSearch.trim()) return true;
                const q = modalSearch.toLowerCase();
                return (
                  a.name.toLowerCase().includes(q) ||
                  a.code.toLowerCase().includes(q) ||
                  (a.brand && a.brand.toLowerCase().includes(q))
                );
              })
              .map((ast) => {
                const isSelected = selectedIds.includes(ast.id);
                return (
                  <div
                    key={ast.id}
                    onClick={() => toggleSelectOne(ast.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.5rem 0.75rem',
                      borderRadius: 'var(--radius-sm)',
                      background: isSelected ? 'rgba(79, 70, 229, 0.12)' : 'var(--color-surface)',
                      border: isSelected ? '1px solid var(--color-primary-light)' : '1px solid var(--color-border)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}} // handled by parent onClick
                      style={{ cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.75rem', color: 'var(--color-primary-light)' }}>
                          {ast.code}
                        </span>
                        {ast.brand && (
                          <span style={{ fontSize: '0.68rem', padding: '0.05rem 0.35rem', borderRadius: '3px', background: 'var(--color-surface2)', color: 'var(--color-muted)' }}>
                            {ast.brand}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ast.name}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.5rem', borderTop: '1px solid var(--color-border)' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-muted)' }}>
              <strong>{selectedIds.length}</strong> aset terpilih
            </span>
            <Button variant="primary" onClick={() => setSelectorModalOpen(false)}>
              Selesai Memilih
            </Button>
          </div>
        </div>
      </Modal>

      {/* Global CSS for Paper Canvas & Print Styles */}
      <style jsx global>{`
        /* Lembar Pratinjau Kertas */
        .printable-page-canvas {
          background: #ffffff !important;
          color: #000000 !important;
          padding: 24px;
          border-radius: var(--radius-lg);
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.45);
          width: 100%;
          max-width: 900px;
          box-sizing: border-box;
          display: grid;
          gap: 14px;
          transition: all 0.2s ease;
        }

        /* Preset Layout Grid */
        .preset-standard_2col {
          grid-template-columns: repeat(2, 1fr);
        }
        .preset-sticker_3col {
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .preset-mini_4col {
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }

        /* Kartu Label Fisik */
        .qr-label-card {
          border: 1.5px solid #000000;
          border-radius: 6px;
          padding: 8px 10px;
          background: #ffffff;
          color: #000000;
          display: flex;
          flex-direction: column;
          justifyContent: space-between;
          box-sizing: border-box;
          break-inside: avoid;
          page-break-inside: avoid;
        }

        /* Header Label */
        .qr-label-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1.5px solid #000000;
          padding-bottom: 4px;
          margin-bottom: 6px;
        }

        .institution-title {
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          max-width: 65%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .asset-tag-code {
          font-family: monospace;
          font-weight: 900;
          font-size: 11px;
          background: #000000;
          color: #ffffff;
          padding: 1px 5px;
          border-radius: 3px;
        }

        /* Body Label */
        .qr-label-body {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
        }

        .qr-img-wrapper {
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qr-image {
          object-fit: contain;
          display: block;
        }

        .preset-standard_2col .qr-image {
          width: 80px;
          height: 80px;
        }

        .preset-sticker_3col .qr-image {
          width: 62px;
          height: 62px;
        }

        .preset-mini_4col .qr-image {
          width: 48px;
          height: 48px;
        }

        .qr-info-content {
          flex: 1;
          min-width: 0;
          line-height: 1.25;
        }

        .label-asset-name {
          font-weight: 800;
          font-size: 11px;
          color: #000000;
          margin-bottom: 3px;
          overflow: hidden;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .preset-mini_4col .label-asset-name {
          font-size: 9.5px;
          -webkit-line-clamp: 1;
        }

        .label-meta-item {
          font-size: 9px;
          color: #333333;
          margin-top: 1px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preset-mini_4col .label-meta-item {
          font-size: 8px;
        }

        .cat-item {
          font-weight: 700;
          color: #222222;
        }

        /* Footer Label */
        .qr-label-footer {
          border-top: 1px dashed #666666;
          padding-top: 3px;
          margin-top: 5px;
          font-size: 7.5px;
          font-weight: 800;
          text-align: center;
          letter-spacing: 0.04em;
          color: #333333;
        }

        .preset-mini_4col .qr-label-footer {
          font-size: 6.5px;
        }

        /* ── Media Print Optimization ── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }

          /* Hilangkan semua chrome UI, sidebar, navbar, tombol */
          .no-print, header, aside, topbar, nav {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          .printable-sheet-wrapper {
            display: block !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .printable-page-canvas {
            box-shadow: none !important;
            border-radius: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            max-width: 100% !important;
            width: 100% !important;
          }

          .qr-label-card {
            border: 1.5px solid #000000 !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function QRLabelsPrintPage() {
  return (
    <Suspense fallback={<p style={{ padding: '2rem', color: 'var(--color-muted)' }}>Memuat QR Code Labels...</p>}>
      <QRLabelsContent />
    </Suspense>
  );
}
