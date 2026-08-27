'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, CheckCircle2, AlertTriangle, AlertCircle, XCircle,
  Camera, Upload, Save, FileText, User, Box, Calendar, ShieldCheck,
  Clock, CheckSquare, RefreshCw, AlertOctagon
} from 'lucide-react';

interface InspectionItemState {
  itemName: string;
  condition: 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT' | 'HILANG' | 'TIDAK_DIPERIKSA';
  problemDescription: string;
  severityLevel: string;
  actionRequired: string;
  photoUrls: string[];
  notes: string;
}

export default function ReturnInspectionPage({ params }: { params: { loanId: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<any>(null);

  // Form State
  const [itemsState, setItemsState] = useState<InspectionItemState[]>([]);
  const [overallNotes, setOverallNotes] = useState('');
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  const fetchInspectionData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/returns/inspect?loanId=${params.loanId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);

        // Initialize item states from existing inspection or checklist template
        if (json.existingInspection && json.existingInspection.itemResults?.length > 0) {
          setItemsState(
            json.existingInspection.itemResults.map((r: any) => ({
              itemName: r.itemName,
              condition: r.condition,
              problemDescription: r.problemDescription || '',
              severityLevel: r.severityLevel || 'Ringan',
              actionRequired: r.actionRequired || 'Perbaikan',
              photoUrls: r.photoUrls ? JSON.parse(r.photoUrls) : [],
              notes: r.notes || '',
            }))
          );
          setOverallNotes(json.existingInspection.overallNotes || '');
        } else {
          setItemsState(
            (json.checklistItems || []).map((it: any) => ({
              itemName: it.name,
              condition: 'BAIK',
              problemDescription: '',
              severityLevel: 'Ringan',
              actionRequired: 'Perbaikan',
              photoUrls: [],
              notes: '',
            }))
          );
        }
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memuat data peminjaman', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setLoading(false);
    }
  }, [params.loanId, showToast]);

  useEffect(() => {
    fetchInspectionData();
  }, [fetchInspectionData]);

  const handleConditionChange = (idx: number, condition: any) => {
    const next = [...itemsState];
    next[idx].condition = condition;
    setItemsState(next);
  };

  const handleItemFieldChange = (idx: number, field: keyof InspectionItemState, val: any) => {
    const next = [...itemsState];
    next[idx] = { ...next[idx], [field]: val };
    setItemsState(next);
  };

  const handlePhotoUpload = async (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingIdx(idx);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const json = await res.json();
        const next = [...itemsState];
        next[idx].photoUrls = [...(next[idx].photoUrls || []), json.url];
        setItemsState(next);
        showToast('Foto dokumentasi berhasil diunggah', 'success');
      } else {
        showToast('Gagal mengunggah foto', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan unggah foto', 'error');
    } finally {
      setUploadingIdx(null);
    }
  };

  const handleRemovePhoto = (idx: number, photoUrl: string) => {
    const next = [...itemsState];
    next[idx].photoUrls = next[idx].photoUrls.filter((u) => u !== photoUrl);
    setItemsState(next);
  };

  // Compute Auto Summaries
  const totalBaik = itemsState.filter((it) => it.condition === 'BAIK').length;
  const totalRusakRingan = itemsState.filter((it) => it.condition === 'RUSAK_RINGAN').length;
  const totalRusakBerat = itemsState.filter((it) => it.condition === 'RUSAK_BERAT').length;
  const totalHilang = itemsState.filter((it) => it.condition === 'HILANG').length;
  const totalTidakDiperiksa = itemsState.filter((it) => it.condition === 'TIDAK_DIPERIKSA').length;

  let resultingAssetStatus = 'TERSEDIA (AVAILABLE)';
  let resultingAssetColor = '#10b981';
  let resultingLoanStatusText = 'SELESAI (RETURNED)';

  if (totalHilang > 0) {
    resultingAssetStatus = 'HILANG (DISPOSED)';
    resultingAssetColor = '#ef4444';
    resultingLoanStatusText = 'LAPORAN KEHILANGAN (LOST_REPORTED)';
  } else if (totalRusakBerat > 0) {
    resultingAssetStatus = 'DALAM PERBAIKAN (DAMAGED)';
    resultingAssetColor = '#f97316';
    resultingLoanStatusText = 'PERLU PERBAIKAN (NEEDS_REPAIR)';
  } else if (totalRusakRingan > 0) {
    resultingAssetStatus = 'PERLU PEMERIKSAAN / MAINTENANCE';
    resultingAssetColor = '#f59e0b';
    resultingLoanStatusText = 'PERLU PERBAIKAN (NEEDS_REPAIR)';
  }

  const handleSubmitInspection = async () => {
    // Validate required problematic fields
    for (const it of itemsState) {
      if (it.condition !== 'BAIK' && it.condition !== 'TIDAK_DIPERIKSA') {
        if (!it.problemDescription.trim()) {
          showToast(`Harap isi deskripsi masalah untuk item "${it.itemName}"`, 'error');
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        loanId: params.loanId,
        itemResults: itemsState,
        overallNotes,
      };

      const res = await fetch('/api/returns/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Inspeksi pengembalian berhasil diproses & dikonfirmasi!', 'success');
        setConfirmModalOpen(false);
        fetchInspectionData();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal memproses pengembalian', 'error');
      }
    } catch (e) {
      console.error(e);
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const loan = data?.loan;
  const asset = data?.asset;
  const borrower = data?.borrower;
  const isCompleted = ['RETURNED', 'COMPLETED', 'NEEDS_REPAIR', 'LOST_REPORTED'].includes(loan?.status);

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '900px', margin: '0 auto' }}>
        <Skeleton style={{ height: '40px', width: '200px' }} />
        <Skeleton style={{ height: '180px' }} />
        <Skeleton style={{ height: '350px' }} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '950px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Back Button */}
      <div>
        <Link
          href="/dashboard/loans"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            color: 'var(--color-muted)',
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} /> Kembali ke Daftar Peminjaman
        </Link>
      </div>

      {/* Header & Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Pemeriksaan Pengembalian Aset 🔍</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem' }}>
            Formulir verifikasi & pemeriksaan fisik kondisi barang saat dikembalikan oleh peminjam.
          </p>
        </div>
        {isCompleted && (
          <span
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '999px',
              fontWeight: 800,
              fontSize: '0.82rem',
              background: 'rgba(16,185,129,0.12)',
              color: '#10b981',
              border: '1px solid #10b981',
            }}
          >
            ✓ PENGEMBALIAN TERKONFIRMASI
          </span>
        )}
      </div>

      {/* Stepper Progress Indicator */}
      <Card style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          {[
            { step: 1, title: '1. Peminjaman Aktif', done: true },
            { step: 2, title: '2. Pengajuan Kembali', done: ['RETURN_REQUESTED', 'UNDER_INSPECTION', 'RETURNED', 'COMPLETED', 'NEEDS_REPAIR', 'LOST_REPORTED'].includes(loan?.status) },
            { step: 3, title: '3. Ceklis Kondisi Fisik', done: ['UNDER_INSPECTION', 'RETURNED', 'COMPLETED', 'NEEDS_REPAIR', 'LOST_REPORTED'].includes(loan?.status) },
            { step: 4, title: '4. Konfirmasi & Closure', done: isCompleted },
          ].map((st, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '160px' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: st.done ? 'var(--color-primary)' : 'var(--color-surface2)',
                  color: st.done ? '#fff' : 'var(--color-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                }}
              >
                {st.done ? '✓' : st.step}
              </div>
              <span style={{ fontSize: '0.8rem', fontWeight: st.done ? 700 : 500, color: st.done ? 'var(--color-text)' : 'var(--color-muted)' }}>
                {st.title}
              </span>
            </div>
          ))}
        </div>
      </Card>

      {/* Bagian 1 & 2: Info Peminjaman & Aset */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
        {/* Info Peminjaman */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <User size={18} style={{ color: 'var(--color-primary)' }} /> Informasi Peminjaman
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Nomor Tiket:</span>
              <strong style={{ fontFamily: 'monospace' }}>{loan?.ticketNumber}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Peminjam:</span>
              <strong>{borrower?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Unit / Jabatan:</span>
              <span>{borrower?.department?.name || 'Umum'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Tanggal Pinjam:</span>
              <span>{loan?.startDate ? formatDate(loan.startDate, 'dd MMM yyyy') : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Rencana Kembali:</span>
              <span>{loan?.endDate ? formatDate(loan.endDate, 'dd MMM yyyy') : '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Tanggal Aktual Kembali:</span>
              <strong style={{ color: 'var(--color-primary)' }}>{formatDate(new Date(), 'dd MMMM yyyy (HH:mm)')}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--color-muted)' }}>Petugas Pemeriksa:</span>
              <strong>{(session?.user as any)?.name || 'Petugas Aset'}</strong>
            </div>
          </div>
        </Card>

        {/* Info Aset */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Box size={18} style={{ color: 'var(--color-accent)' }} /> Informasi Aset Dipinjam
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', fontSize: '0.88rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Nama Aset:</span>
              <strong style={{ color: 'var(--color-primary-light)' }}>{asset?.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Kode Inventaris:</span>
              <strong style={{ fontFamily: 'monospace' }}>{asset?.code}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Kategori:</span>
              <span>{asset?.category?.name || '-'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Lokasi Penyimpanan:</span>
              <span>{asset?.location?.name || 'Gudang Utama'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--color-muted)' }}>Jumlah Dipinjam:</span>
              <span>{loan?.quantity || 1} Unit</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--color-border)', paddingTop: '0.5rem', marginTop: '0.2rem' }}>
              <span style={{ color: 'var(--color-muted)' }}>Kondisi Sebelum Dipinjam:</span>
              <span style={{ fontWeight: 700, color: 'var(--color-success)' }}>{asset?.condition || 'Baik'}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Bagian 3: Checklist Pemeriksaan Dinamis */}
      <Card style={{ padding: '1.75rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CheckSquare size={20} style={{ color: 'var(--color-primary)' }} /> Checklist Pemeriksaan Fisik
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
              Template: <strong>{data?.templateTitle}</strong>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {itemsState.map((it, idx) => {
            const isProblematic = it.condition !== 'BAIK' && it.condition !== 'TIDAK_DIPERIKSA';

            return (
              <div
                key={idx}
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  border: isProblematic ? '1.5px solid var(--color-danger)' : '1px solid var(--color-border)',
                  background: isProblematic ? 'rgba(239,68,68,0.03)' : 'var(--color-surface2)',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.85rem' }}>
                  <div>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>
                      #{idx + 1}. {it.itemName}
                    </span>
                  </div>

                  {/* Options Radio / Buttons */}
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      { val: 'BAIK', label: '✓ BAIK', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                      { val: 'RUSAK_RINGAN', label: '⚠️ RUSAK RINGAN', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                      { val: 'RUSAK_BERAT', label: '⚡ RUSAK BERAT', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
                      { val: 'HILANG', label: '❌ HILANG', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
                      { val: 'TIDAK_DIPERIKSA', label: '- TIDAK DIPERIKSA', color: 'var(--color-muted)', bg: 'var(--color-surface2)' },
                    ].map((opt) => {
                      const selected = it.condition === opt.val;
                      return (
                        <button
                          key={opt.val}
                          type="button"
                          disabled={isCompleted}
                          onClick={() => handleConditionChange(idx, opt.val)}
                          style={{
                            padding: '0.4rem 0.75rem',
                            borderRadius: 'var(--radius-sm)',
                            border: selected ? `2px solid ${opt.color}` : '1px solid var(--color-border)',
                            background: selected ? opt.bg : 'var(--color-surface)',
                            color: selected ? opt.color : 'var(--color-muted)',
                            fontWeight: selected ? 800 : 500,
                            fontSize: '0.75rem',
                            cursor: isCompleted ? 'not-allowed' : 'pointer',
                            transition: 'all 0.2s',
                          }}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Sub-form Detail Kerusakan / Kehilangan jika BUKAN BAIK */}
                {isProblematic && (
                  <div
                    style={{
                      marginTop: '1rem',
                      paddingTop: '1rem',
                      borderTop: '1px dashed var(--color-border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.85rem',
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                      <div>
                        <label className="input-label" style={{ fontSize: '0.75rem' }}>Tingkat Kerusakan / Dampak *</label>
                        <select
                          className="input-field"
                          disabled={isCompleted}
                          value={it.severityLevel}
                          onChange={(e) => handleItemFieldChange(idx, 'severityLevel', e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                        >
                          <option value="Ringan">Ringan (Masih bisa dipakai)</option>
                          <option value="Sedang">Sedang (Fungsi terganggu)</option>
                          <option value="Parah">Parah / Total (Tidak bisa dipakai)</option>
                        </select>
                      </div>

                      <div>
                        <label className="input-label" style={{ fontSize: '0.75rem' }}>Tindakan Diperlukan *</label>
                        <select
                          className="input-field"
                          disabled={isCompleted}
                          value={it.actionRequired}
                          onChange={(e) => handleItemFieldChange(idx, 'actionRequired', e.target.value)}
                          style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                        >
                          <option value="Perbaikan">Servis / Perbaikan</option>
                          <option value="Pembersihan">Pembersihan Khusus</option>
                          <option value="Ganti Unit">Ganti Sparepart / Unit Baru</option>
                          <option value="Laporan Kehilangan">Proses Laporan Kehilangan</option>
                        </select>
                      </div>

                      <div>
                        <label className="input-label" style={{ fontSize: '0.75rem' }}>Foto Bukti Fisik</label>
                        {!isCompleted && (
                          <label
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              padding: '0.4rem 0.75rem',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px dashed var(--color-border)',
                              background: 'var(--color-surface)',
                              cursor: 'pointer',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              color: 'var(--color-primary)',
                            }}
                          >
                            <Camera size={14} /> {uploadingIdx === idx ? 'Mengunggah...' : '+ Unggah Foto'}
                            <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(idx, e)} style={{ display: 'none' }} />
                          </label>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="input-label" style={{ fontSize: '0.75rem' }}>Deskripsi Masalah / Kerusakan Detail *</label>
                      <textarea
                        className="input-field"
                        rows={2}
                        disabled={isCompleted}
                        placeholder="Jelaskan detail posisi kerusakan, komponen yang patah, atau penyebab kehilangan..."
                        value={it.problemDescription}
                        onChange={(e) => handleItemFieldChange(idx, 'problemDescription', e.target.value)}
                        style={{ fontSize: '0.82rem' }}
                      />
                    </div>

                    {/* Preview Uploaded Photos */}
                    {it.photoUrls?.length > 0 && (
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.3rem' }}>
                        {it.photoUrls.map((url, pIdx) => (
                          <div key={pIdx} style={{ position: 'relative' }}>
                            <img src={url} alt="Bukti" style={{ width: '70px', height: '70px', objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }} />
                            {!isCompleted && (
                              <button
                                type="button"
                                onClick={() => handleRemovePhoto(idx, url)}
                                style={{
                                  position: 'absolute', top: '-6px', right: '-6px',
                                  background: 'var(--color-danger)', color: '#fff', border: 'none',
                                  borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px',
                                  cursor: 'pointer', fontWeight: 900,
                                }}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Bagian 4 & 5: Catatan Umum & Kesimpulan Agregat Otomatis */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.25rem' }}>
        {/* Catatan Umum */}
        <Card style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FileText size={18} style={{ color: 'var(--color-primary)' }} /> Catatan Umum Pengembalian
          </h3>
          <textarea
            className="input-field"
            rows={4}
            disabled={isCompleted}
            placeholder="Tambahkan catatan tambahan dari petugas mengenai pengembalian ini..."
            value={overallNotes}
            onChange={(e) => setOverallNotes(e.target.value)}
            style={{ fontSize: '0.88rem' }}
          />
        </Card>

        {/* Ringkasan Kesimpulan Otomatis */}
        <Card style={{ padding: '1.5rem', background: 'var(--color-surface2)', border: '1.5px solid var(--color-border)' }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={18} style={{ color: 'var(--color-success)' }} /> Kesimpulan Agregat Otomatis
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
            <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(16,185,129,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid #10b981' }}>
              <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>✓ BAIK</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#10b981' }}>{totalBaik} Item</div>
            </div>
            <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(245,158,11,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid #f59e0b' }}>
              <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700 }}>⚠️ RUSAK RINGAN</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f59e0b' }}>{totalRusakRingan} Item</div>
            </div>
            <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(249,115,22,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid #f97316' }}>
              <div style={{ fontSize: '0.75rem', color: '#f97316', fontWeight: 700 }}>⚡ RUSAK BERAT</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#f97316' }}>{totalRusakBerat} Item</div>
            </div>
            <div style={{ padding: '0.6rem 0.8rem', background: 'rgba(239,68,68,0.1)', borderRadius: 'var(--radius-sm)', border: '1px solid #ef4444' }}>
              <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 700 }}>❌ HILANG</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#ef4444' }}>{totalHilang} Item</div>
            </div>
          </div>

          <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--color-border)' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600, marginBottom: '0.2rem' }}>Status Akhir Aset Otomatis:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 900, color: resultingAssetColor }}>
              {resultingAssetStatus}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>
              Status Peminjaman: <strong>{resultingLoanStatusText}</strong>
            </div>
          </div>
        </Card>
      </div>

      {/* Tombol Aksi Konfirmasi */}
      {!isCompleted && (
        <Card style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem' }}>Siap Melakukan Konfirmasi?</div>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                Pastikan seluruh item periksa sudah sesuai kondisi fisik aset sebelum konfirmasi disimpan permanen.
              </p>
            </div>
            <Button onClick={() => setConfirmModalOpen(true)} variant="primary" style={{ padding: '0.75rem 1.75rem' }}>
              <CheckCircle2 size={18} /> Konfirmasi &amp; Simpan Pengembalian
            </Button>
          </div>
        </Card>
      )}

      {/* Modal Dialog Konfirmasi */}
      <Modal
        isOpen={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        title="Konfirmasi Pengembalian Aset"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
            Apakah Anda yakin ingin menyelesaikan pemeriksaan pengembalian untuk tiket <strong>#{loan?.ticketNumber}</strong>?
          </p>

          <div style={{ background: 'var(--color-surface2)', padding: '1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
            <div>• Total Item Baik: <strong>{totalBaik}</strong></div>
            <div>• Total Rusak/Hilang: <strong>{totalRusakRingan + totalRusakBerat + totalHilang}</strong></div>
            <div>• Status Aset Selanjutnya: <strong style={{ color: resultingAssetColor }}>{resultingAssetStatus}</strong></div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <Button variant="secondary" onClick={() => setConfirmModalOpen(false)}>
              Batal
            </Button>
            <Button onClick={handleSubmitInspection} disabled={submitting}>
              <Save size={16} /> {submitting ? 'Memproses...' : 'Ya, Setujui Pengembalian'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
