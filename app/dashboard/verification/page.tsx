'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { 
  ShieldAlert, ShieldCheck, Upload, RefreshCw, 
  FileText, User, UserCheck, HelpCircle, ArrowRight 
} from 'lucide-react';

export default function UserVerificationPage() {
  const { data: session, update: updateSession } = useSession();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [identityNo, setIdentityNo] = useState('');
  const [departmentName, setDepartmentName] = useState('');
  const [departments, setDepartments] = useState<any[]>([]);
  const [isCustomDept, setIsCustomDept] = useState(false);
  const [requestedCategory, setRequestedCategory] = useState('MAHASISWA');
  const [ktmUrl, setKtmUrl] = useState('');

  // Info Kategori User Aktif
  const renterCategory = (session?.user as any)?.renterCategory || 'EXTERNAL';

  useEffect(() => {
    fetchRequests();
    fetchDepartments();
    if (session?.user) {
      setFullName(session.user.name || '');
    }
  }, [session]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch('/api/departments');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setDepartments(data);
      }
    } catch {
      // silently ignore
    }
  };

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/user/verification');
      if (res.ok) {
        setRequests(await res.json());
      }
    } catch {
      showToast('Gagal memuat status pengajuan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadKTM = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) throw new Error('Gagal mengunggah file');
      const data = await res.json();
      setKtmUrl(data.url);
      showToast('Berkas KTM berhasil diunggah!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Terjadi kesalahan unggah berkas', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !identityNo || !ktmUrl) {
      return showToast('Harap isi nama, NIM/NIP, dan unggah foto KTM', 'warning');
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/user/verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestedCategory,
          identityNo,
          fullName,
          departmentName,
          ktmUrl,
        }),
      });

      if (res.ok) {
        showToast('Pengajuan verifikasi berhasil dikirim!', 'success');
        fetchRequests();
        // Reset form
        setIdentityNo('');
        setDepartmentName('');
        setKtmUrl('');
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengirim pengajuan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const activePending = requests.find((r) => r.status === 'PENDING');
  const latestRejected = requests.find((r) => r.status === 'REJECTED');

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Banner / Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(16,185,129,0.08) 100%)',
        border: '1px solid rgba(79,70,229,0.25)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: 'var(--radius-md)', background: 'rgba(79,70,229,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UserCheck size={24} style={{ color: 'var(--color-primary)' }} />
          </div>
          <div>
            <h1 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.2rem' }}>Verifikasi Kategori Akun</h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--color-muted)', lineHeight: 1.5 }}>
              Ajukan verifikasi sebagai Mahasiswa atau Internal Kampus untuk menikmati layanan peminjaman aset gratis.
            </p>
          </div>
        </div>

        {/* Current Category Badge */}
        <div style={{
          background: renterCategory === 'EXTERNAL' ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
          border: `1px solid ${renterCategory === 'EXTERNAL' ? 'rgba(239,68,68,0.25)' : 'rgba(16,185,129,0.25)'}`,
          padding: '0.5rem 1rem',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}>
          {renterCategory === 'EXTERNAL' ? (
            <>
              <ShieldAlert size={16} style={{ color: '#ef4444' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#ef4444' }}>Penyewa Eksternal</span>
            </>
          ) : (
            <>
              <ShieldCheck size={16} style={{ color: '#10b981' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981' }}>
                {renterCategory === 'MAHASISWA' ? 'Mahasiswa Terverifikasi' : 'Internal Kampus Terverifikasi'}
              </span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem' }}>
        
        {/* Left Column: Form or Status Banner */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Case 1: Akun sudah terverifikasi */}
          {renterCategory !== 'EXTERNAL' && (
            <Card style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(16,185,129,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#10b981' }}>
                <ShieldCheck size={36} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Akun Anda Sudah Terverifikasi!</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', maxWidth: '400px', lineHeight: 1.6 }}>
                Selamat! Akun Anda terdaftar sebagai **{renterCategory === 'MAHASISWA' ? 'Mahasiswa' : 'Internal Kampus'}**. 
                Anda sekarang memiliki hak akses penuh untuk melakukan peminjaman ruangan dan peralatan inventaris secara gratis.
              </p>
              <Link href="/dashboard/catalog" className="btn btn-primary" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                Pilih Aset di Katalog <ArrowRight size={16} />
              </Link>
            </Card>
          )}

          {/* Case 2: Pengajuan berstatus PENDING */}
          {renterCategory === 'EXTERNAL' && activePending && (
            <Card style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(245,158,11,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b' }}>
                <RefreshCw size={36} style={{ animation: 'spin 2s linear infinite' }} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Pengajuan Sedang Ditinjau Admin</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-muted)', maxWidth: '420px', lineHeight: 1.6 }}>
                Pengajuan verifikasi Anda menjadi **{activePending.requestedCategory}** dengan ID **{activePending.identityNo}** 
                telah kami terima. Mohon menunggu keputusan persetujuan dari Admin.
              </p>
              <div style={{ display: 'flex', gap: '1rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.85rem 1.25rem', width: '100%', maxWidth: '420px', alignItems: 'center' }}>
                <FileText size={20} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
                <div style={{ textAlign: 'left', flex: 1, overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>Berkas KTM Terunggah</div>
                  <a href={activePending.ktmUrl} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--color-primary)', textDecoration: 'underline', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block', overflow: 'hidden' }}>
                    Lihat Dokumen KTM
                  </a>
                </div>
              </div>
            </Card>
          )}

          {/* Case 3: Pengajuan ditolak (REJECTED) atau belum pernah mengajukan */}
          {renterCategory === 'EXTERNAL' && !activePending && (
            <Card style={{ padding: '1.75rem' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileText size={18} style={{ color: 'var(--color-primary)' }} /> Formulir Pengajuan Verifikasi KTM
              </h2>

              {latestRejected && (
                <div style={{ background: 'rgba(239,68,68,0.06)', borderLeft: '4px solid #ef4444', padding: '1rem', borderRadius: 'var(--radius-sm)', marginBottom: '1.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    ⚠️ Pengajuan Sebelumnya Ditolak
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-muted)', margin: '0.25rem 0 0', lineHeight: 1.5 }}>
                    Catatan Admin: <em>&quot;{latestRejected.adminNotes || 'Berkas KTM tidak valid / buram.'}&quot;</em>
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label">Kategori yang Diajukan</label>
                    <select
                      value={requestedCategory}
                      onChange={(e) => setRequestedCategory(e.target.value)}
                      className="input-field"
                      style={{ width: '100%' }}
                    >
                      <option value="MAHASISWA">🎓 Mahasiswa (Gratis Sewa & Deposit)</option>
                      <option value="INTERNAL_KAMPUS">🏫 Internal Kampus / Lembaga (Gratis Sewa)</option>
                    </select>
                  </div>
                  <div>
                    <label className="input-label">NIM / NIP / Identity No</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Masukkan NIM atau NIP Anda"
                      value={identityNo}
                      onChange={(e) => setIdentityNo(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="input-label">Nama Lengkap (Sesuai KTM)</label>
                    <input
                      type="text"
                      className="input-field"
                      placeholder="Masukkan nama lengkap Anda"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="input-label">Program Studi / Departemen / Unit</label>
                    <select
                      className="input-field"
                      style={{ width: '100%' }}
                      value={isCustomDept ? 'OTHER' : departmentName}
                      onChange={(e) => {
                        if (e.target.value === 'OTHER') {
                          setIsCustomDept(true);
                          setDepartmentName('');
                        } else {
                          setIsCustomDept(false);
                          setDepartmentName(e.target.value);
                        }
                      }}
                    >
                      <option value="">-- Pilih Unit / Fakultas --</option>
                      {departments.map((d: any) => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                      <option value="OTHER">Lainnya (Tulis Manual)...</option>
                    </select>
                    {isCustomDept && (
                      <input
                        type="text"
                        className="input-field"
                        placeholder="Ketik nama unit/prodi..."
                        value={departmentName}
                        onChange={(e) => setDepartmentName(e.target.value)}
                        style={{ marginTop: '0.4rem' }}
                        autoFocus
                      />
                    )}
                  </div>
                </div>

                {/* Dropzone Uploader Berkasse */}
                <div>
                  <label className="input-label">Unggah Foto KTM / Kartu Identitas Resmi *</label>
                  <div style={{
                    border: `2px dashed ${ktmUrl ? '#10b981' : 'var(--color-border)'}`,
                    background: ktmUrl ? 'rgba(16,185,129,0.04)' : 'var(--color-surface2)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadKTM}
                      disabled={uploading}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                    {uploading ? (
                      <div style={{ color: 'var(--color-muted)', fontSize: '0.85rem' }}>
                        <RefreshCw size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 0.5rem' }} />
                        Sedang mengunggah berkas...
                      </div>
                    ) : ktmUrl ? (
                      <div>
                        <ShieldCheck size={28} style={{ color: '#10b981', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#10b981' }}>Foto KTM Berhasil Terunggah!</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Klik / seret file baru untuk mengganti berkas</div>
                      </div>
                    ) : (
                      <div>
                        <Upload size={28} style={{ color: 'var(--color-muted)', margin: '0 auto 0.5rem' }} />
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>Klik atau Seret Foto KTM ke sini</div>
                        <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Format gambar (.jpg, .png) maks 5MB</div>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                  <Button type="submit" disabled={submitting || uploading}>
                    {submitting ? 'Mengirim Pengajuan...' : 'Kirim Pengajuan Verifikasi'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

        </div>

        {/* Right Column: Status & Guidelines Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Aturan & Panduan */}
          <Card style={{ padding: '1.25rem' }}>
            <h3 style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <HelpCircle size={16} /> Aturan Verifikasi
            </h3>
            <ul style={{ paddingLeft: '1.1rem', margin: 0, fontSize: '0.78rem', color: 'var(--color-muted)', display: 'flex', flexDirection: 'column', gap: '0.6rem', lineHeight: 1.5 }}>
              <li>Akun baru otomatis berstatus <strong>Penyewa Eksternal</strong> dan dibatasi tidak bisa meminjam aset gratis.</li>
              <li>Pastikan foto KTM yang diunggah terlihat <strong>jelas</strong> dan tidak blur/berbayang.</li>
              <li>Nama lengkap pada formulir wajib <strong>sama persis</strong> dengan nama pada KTM.</li>
              <li>Proses peninjauan dokumen oleh Admin memerlukan waktu berkisar <strong>1-24 jam</strong> kerja.</li>
            </ul>
          </Card>

          {/* Riwayat Pengajuan */}
          {requests.length > 0 && (
            <Card style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '0.88rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--color-muted)', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Riwayat Pengajuan ({requests.length})
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {requests.map((req) => (
                  <div key={req.id} style={{ padding: '0.75rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)', fontSize: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700 }}>{req.requestedCategory}</span>
                      <span style={{ 
                        fontWeight: 800, 
                        color: req.status === 'APPROVED' ? '#10b981' : req.status === 'REJECTED' ? '#ef4444' : '#f59e0b'
                      }}>{req.status}</span>
                    </div>
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.7rem' }}>NIM/NIP: {req.identityNo}</div>
                    <div style={{ color: 'var(--color-muted)', fontSize: '0.7rem', marginTop: '0.1rem' }}>
                      {new Date(req.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

        </div>
      </div>
    </div>
  );
}
