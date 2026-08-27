'use client';

import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { 
  FileText, CheckCircle, XCircle, Eye, 
  Calendar, User, ArrowRight, ShieldCheck, ClipboardList, Info
} from 'lucide-react';

export default function AdminVerificationListPage() {
  const { showToast } = useToast();

  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  
  // Filter Tab
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED' | 'REJECTED'>('PENDING');

  // Modal Preview Image KTM
  const [previewImg, setPreviewImg] = useState<string | null>(null);

  // Modal Reject Reason
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchRequests();
  }, [activeTab]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/verifications?status=${activeTab}`);
      if (res.ok) {
        setRequests(await res.json());
      } else {
        showToast('Gagal memuat daftar pengajuan', 'error');
      }
    } catch {
      showToast('Gagal memuat daftar pengajuan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menyetujui pengajuan verifikasi ini?')) return;

    try {
      setProcessingId(id);
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'APPROVED' }),
      });

      if (res.ok) {
        showToast('Pengajuan verifikasi disetujui, kategori akun user telah diperbarui!', 'success');
        fetchRequests();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menyetujui pengajuan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectReason.trim()) return showToast('Alasan penolakan wajib diisi', 'warning');
    const id = rejectingId;
    if (!id) return;

    try {
      setProcessingId(id);
      const res = await fetch(`/api/admin/verifications/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'REJECTED', adminNotes: rejectReason }),
      });

      if (res.ok) {
        showToast('Pengajuan verifikasi telah ditolak', 'success');
        setRejectingId(null);
        setRejectReason('');
        fetchRequests();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menolak pengajuan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Header Title */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardList size={26} style={{ color: 'var(--color-primary)' }} /> Kelola Pengajuan Verifikasi KTM
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Tinjau berkas kartu identitas mahasiswa / internal kampus untuk menyetujui hak akses sewa.
          </p>
        </div>
      </div>

      {/* Tabs Filter */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--color-border)', gap: '1rem' }}>
        {['PENDING', 'APPROVED', 'REJECTED'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            style={{
              padding: '0.75rem 1rem',
              border: 'none',
              borderBottom: activeTab === tab ? '3px solid var(--color-primary)' : '3px solid transparent',
              background: 'transparent',
              fontSize: '0.9rem',
              fontWeight: 700,
              color: activeTab === tab ? 'var(--color-primary-light)' : 'var(--color-muted)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {tab === 'PENDING' ? '⏳ Perlu Ditinjau' : tab === 'APPROVED' ? '✅ Disetujui' : '❌ Ditolak'}
          </button>
        ))}
      </div>

      {/* Requests List */}
      {loading ? (
        <Card style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ height: '70px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', animation: 'pulse 1.5s infinite' }} />
          ))}
        </Card>
      ) : requests.length === 0 ? (
        <Card style={{ padding: '4rem 2rem', textAlign: 'center', color: 'var(--color-muted)' }}>
          <Info size={40} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--color-text)' }}>Tidak ada pengajuan verifikasi</h3>
          <p style={{ fontSize: '0.82rem', marginTop: '0.25rem' }}>Daftar pengajuan berstatus {activeTab} saat ini kosong.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {requests.map((req) => (
            <Card key={req.id} style={{ padding: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', flex: 1, minWidth: '300px' }}>
                <div style={{ width: '42px', height: '42px', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--color-primary)' }}>
                  <User size={20} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <strong style={{ fontSize: '0.95rem' }}>{req.fullName}</strong>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(79,70,229,0.08)', color: 'var(--color-primary-light)' }}>
                      {req.requestedCategory === 'MAHASISWA' ? '🎓 Mahasiswa' : '🏫 Internal Kampus'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
                    Email: {req.user?.email || '-'} • NIM/NIP: <strong>{req.identityNo}</strong> {req.departmentName ? `• ${req.departmentName}` : ''}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.25rem' }}>
                    <Calendar size={13} /> Diajukan pada {new Date(req.createdAt).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </div>

                  {req.adminNotes && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--color-danger)', background: 'rgba(239,68,68,0.04)', padding: '0.4rem 0.75rem', borderRadius: '4px', borderLeft: '3px solid #ef4444' }}>
                      <strong>Alasan Ditolak:</strong> {req.adminNotes}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions Column */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <Button variant="secondary" size="sm" onClick={() => setPreviewImg(req.ktmUrl)} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Eye size={14} /> Lihat KTM
                </Button>

                {activeTab === 'PENDING' && (
                  <>
                    <Button 
                      variant="primary" 
                      size="sm" 
                      onClick={() => handleApprove(req.id)}
                      disabled={processingId === req.id}
                      style={{ background: 'var(--color-success)', color: '#FFF' }}
                    >
                      <CheckCircle size={14} /> Setujui
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      onClick={() => setRejectingId(req.id)}
                      disabled={processingId === req.id}
                      style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                    >
                      <XCircle size={14} /> Tolak
                    </Button>
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* MODAL PREVIEW KTM IMAGE */}
      {previewImg && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <img src={previewImg} alt="Preview KTM" style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }} />
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
              <a href={previewImg} target="_blank" rel="noreferrer" className="btn btn-primary">
                Buka di Tab Baru
              </a>
              <button onClick={() => setPreviewImg(null)} className="btn btn-secondary">
                Tutup Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REJECT REASON FORM */}
      {rejectingId && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <Card style={{ padding: '1.75rem', width: '100%', maxWidth: '450px', background: '#FFF' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-danger)' }}>
              <XCircle size={20} /> Tolak Pengajuan Verifikasi
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', marginBottom: '1rem' }}>
              Tulis alasan penolakan agar pemohon dapat mengetahuinya dan mengajukan ulang berkas yang valid.
            </p>
            <form onSubmit={handleRejectSubmit}>
              <label className="input-label">Alasan Penolakan *</label>
              <textarea
                className="input-field"
                rows={3}
                placeholder="Contoh: Foto KTM tidak terlihat jelas / buram. Harap foto ulang dengan pencahayaan cukup."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                style={{ width: '100%', resize: 'none', fontFamily: 'sans-serif' }}
                required
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => { setRejectingId(null); setRejectReason(''); }} className="btn btn-secondary btn-sm">
                  Batal
                </button>
                <button type="submit" className="btn btn-primary btn-sm" style={{ background: 'var(--color-danger)', border: 'none', color: '#FFF' }}>
                  Tolak Pengajuan
                </button>
              </div>
            </form>
          </Card>
        </div>
      )}

    </div>
  );
}

function Link({ href, children, ...props }: any) {
  return (
    <a href={href} {...props}>
      {children}
    </a>
  );
}
