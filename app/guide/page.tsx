'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { PublicNavbar } from '@/components/public/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import {
  UserPlus,
  LogIn,
  Calendar,
  Send,
  Clock,
  QrCode,
  RotateCcw,
  Building,
  Car,
  Laptop,
  Mail,
  Phone,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Edit3,
  Save,
  Eye,
  Plus,
  Trash2,
  RotateCw,
  ShieldCheck,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';

interface GuideFeatureItem {
  iconName: string;
  title: string;
  desc: string;
}

interface GuideStepItem {
  num: string;
  title: string;
  iconName: string;
  summary: string;
  points: string[];
}

interface GuideFaqItem {
  q: string;
  a: string;
}

interface GuideContentData {
  heroBadge: string;
  heroTitle: string;
  heroHighlight: string;
  heroSubtitle: string;
  features: GuideFeatureItem[];
  stepsTitle: string;
  stepsSubtitle: string;
  steps: GuideStepItem[];
  faqTitle: string;
  faqSubtitle: string;
  faqs: GuideFaqItem[];
  contactTitle: string;
  contactSubtitle: string;
  contactEmail: string;
  contactPhone: string;
}

const ICON_MAP: Record<string, any> = {
  UserPlus,
  LogIn,
  Calendar,
  Send,
  Clock,
  QrCode,
  RotateCcw,
  Building,
  Car,
  Laptop,
  ShieldCheck,
  HelpCircle,
};

const ICON_OPTIONS = Object.keys(ICON_MAP);

const INITIAL_CONTENT: GuideContentData = {
  heroBadge: 'Panduan & Tata Cara Peminjaman',
  heroTitle: 'Panduan Penggunaan',
  heroHighlight: 'SPASI',
  heroSubtitle:
    'Pelajari alur pengajuan peminjaman sarana internal, sewa ruangan & peralatan Sarpras, validasi QR Code fisik, dan aturan pengembalian instansi.',
  features: [
    {
      iconName: 'Building',
      title: 'Sewa Ruangan & Aula',
      desc: 'Sewa ruang rapat, aula, studio, dan auditorium instansi secara per jam/hari dengan kalkulator sewa otomatis & anti-double booking.',
    },
    {
      iconName: 'Laptop',
      title: 'Peralatan & Multi-Aset Sarpras',
      desc: 'Pinjam atau sewa proyektor, sound system, laptop, kamera, dan perlengkapan tambahan langsung dalam 1 paket pengajuan satu halaman.',
    },
    {
      iconName: 'QrCode',
      title: 'E-Voucher & Validasi QR',
      desc: 'Dapatkan E-Voucher digital ber-QR Code untuk proses Check-In dan Check-Out penyerahan kunci & barang yang telah disetujui.',
    },
    {
      iconName: 'Car',
      title: 'Inspeksi & Jaminan Deposit',
      desc: 'Pencatatan inspeksi fisik aset ruangan & peralatan saat Check-In/Check-Out lengkap dengan timestamp dan kalkulasi klaim deposit.',
    },
  ],
  stepsTitle: '7 Langkah Alur Peminjaman & Sewa',
  stepsSubtitle: 'Ikuti alur terstruktur dari registrasi hingga pengembalian fasilitas',
  steps: [
    {
      num: '01',
      title: 'Registrasi Akun',
      iconName: 'UserPlus',
      summary: 'Daftar akun baru dengan email dan data diri yang valid',
      points: [
        'Klik tombol "Masuk / Login" di halaman utama',
        'Isi form registrasi dengan data diri yang benar',
        'Pilih kategori pengguna (Mahasiswa / Internal / Umum)',
        'Lakukan verifikasi identitas di menu Verifikasi Akun bila diperlukan',
      ],
    },
    {
      num: '02',
      title: 'Login ke Sistem',
      iconName: 'LogIn',
      summary: 'Masuk menggunakan email dan password yang telah didaftarkan',
      points: [
        'Klik tombol "Masuk" di navigasi utama',
        'Masukkan email dan password terdaftar',
        'Klik "Masuk Sekarang" untuk mengaktifkan sesi dashboard',
      ],
    },
    {
      num: '03',
      title: 'Cek Ketersediaan Fasilitas',
      iconName: 'Calendar',
      summary: 'Lihat jadwal dan ketersediaan ruangan, kendaraan, atau alat',
      points: [
        'Buka halaman "Katalog Fasilitas" publik atau di dalam dashboard',
        'Filter berdasarkan kategori & sub-kategori aset atau ruangan',
        'Cek status indikator ketersediaan real-time pada tanggal yang diinginkan',
      ],
    },
    {
      num: '04',
      title: 'Ajukan Peminjaman / Booking Satu Halaman',
      iconName: 'Send',
      summary: 'Isi formulir pengajuan satu halaman untuk satu atau banyak aset sekaligus',
      points: [
        'Tentukan jadwal mulai dan selesai peminjaman',
        'Pilih kategori, sub-kategori, dan tambahkan daftar aset/ruangan ke tabel pengajuan',
        'Isi tujuan keperluan serta unggah berkas KTP/KTM & Surat Kegiatan cukup 1 kali',
        'Centang persetujuan elektronik lalu kirim pengajuan',
      ],
    },
    {
      num: '05',
      title: 'Persetujuan (Approval) Paket',
      iconName: 'Clock',
      summary: 'Kepala Unit & Admin Sarpras meninjau serta memproses pengajuan Anda',
      points: [
        'Pengajuan diproses berjenjang (Level 1 Kepala Unit & Level 2 Admin Sarpras)',
        'Selama belum disetujui admin, Anda masih dapat mengedit atau membatalkan pesanan',
        'Pantau status paket pengajuan di halaman "Peminjaman Saya" atau "Sewa & Booking Saya"',
      ],
    },
    {
      num: '06',
      title: 'Pengambilan (Check-In) & Validasi QR',
      iconName: 'QrCode',
      summary: 'Hanya pengajuan yang sudah disetujui yang dapat di-Check-In dengan QR Code',
      points: [
        'Pastikan status pengajuan sudah disetujui (APPROVED / CONFIRMED)',
        'Tunjukkan E-Voucher QR Code atau kode tiket kepada petugas Sarpras',
        'Petugas melakukan Scan QR / Batch Handover Check-In dan sistem mencatat timestamp pengambilan',
      ],
    },
    {
      num: '07',
      title: 'Pengembalian (Check-Out) & BAST',
      iconName: 'RotateCcw',
      summary: 'Kembalikan seluruh fasilitas dalam kondisi baik dan tepat waktu',
      points: [
        'Ajukan pengembalian dari dashboard atau bawa langsung ke loket Sarpras',
        'Petugas memeriksa kondisi fisik aset dan melakukan Check-Out',
        'Timestamp pengembalian tercatat otomatis dan dokumen BAST dapat dicetak',
      ],
    },
  ],
  faqTitle: 'Pertanyaan Yang Sering Diajukan (FAQ)',
  faqSubtitle: 'Jawaban cepat untuk pertanyaan umum seputar sistem peminjaman & penyewaan',
  faqs: [
    {
      q: 'Berapa lama proses persetujuan peminjaman?',
      a: 'Proses persetujuan biasanya memerlukan waktu maksimal 1x24 jam kerja melalui 2 tahapan verifikasi: Persetujuan Kepala Unit (Level 1) dan Konfirmasi Admin Aset/Sarpras (Level 2).',
    },
    {
      q: 'Apakah bisa meminjam banyak alat sekaligus dalam satu pengajuan?',
      a: 'Bisa. Anda cukup menambahkan seluruh peralatan yang dibutuhkan ke dalam daftar pada formulir satu halaman, mengunggah berkas 1 kali, dan seluruhnya akan diproses sebagai 1 paket.',
    },
    {
      q: 'Apakah pesanan masih bisa diedit atau dibatalkan?',
      a: 'Ya, selama pengajuan masih berstatus menunggu (belum disetujui Admin), Anda dapat mengedit jadwal, ruangan, daftar alat, maupun membatalkan pesanan.',
    },
    {
      q: 'Apakah Check-In QR bisa dilakukan sebelum disetujui?',
      a: 'Tidak bisa. Sistem mengunci proses Check-In dan Check-Out hanya untuk pengajuan yang sudah resmi disetujui penuh (APPROVED / CONFIRMED).',
    },
    {
      q: 'Bagaimana jika pengembalian aset terlambat atau ada kerusakan?',
      a: 'Sistem secara otomatis menghitung denda keterlambatan atau menerbitkan tiket klaim ganti rugi berdasarkan hasil inspeksi petugas saat Check-Out.',
    },
  ],
  contactTitle: 'Butuh Bantuan?',
  contactSubtitle:
    'Jika Anda mengalami kesulitan atau memiliki pertanyaan terkait layanan Sarpras, silakan hubungi kami.',
  contactEmail: 'admin@spasi.app',
  contactPhone: '+62 812-3456-7890',
};

export default function GuidePage() {
  const { data: session } = useSession();
  const { showToast } = useToast();
  const userRole = (session?.user as any)?.role || '';
  const canEdit = ['SUPER_ADMIN', 'ADMIN'].includes(userRole);

  const [content, setContent] = useState<GuideContentData>(INITIAL_CONTENT);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/guide');
        if (res.ok) {
          const data = await res.json();
          setContent(data);
        }
      } catch (e) {
        console.error('Failed to load guide content:', e);
      }
    })();
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/guide', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(content),
      });
      const json = await res.json();
      if (res.ok) {
        setContent(json.data);
        setIsEditing(false);
        showToast(json.message || 'Panduan berhasil disimpan!', 'success');
      } else {
        showToast(json.error || 'Gagal menyimpan panduan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan saat menyimpan panduan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleResetDefault = async () => {
    if (!confirm('Kembalikan seluruh isi panduan ke pengaturan awal (default)?')) return;
    try {
      setSaving(true);
      const res = await fetch('/api/guide', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }),
      });
      const json = await res.json();
      if (res.ok) {
        setContent(json.data);
        showToast(json.message || 'Panduan dikembalikan ke default', 'info');
      } else {
        showToast(json.error || 'Gagal mereset panduan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan koneksi', 'error');
    } finally {
      setSaving(false);
    }
  };

  const moveItem = <T,>(arr: T[], fromIdx: number, toIdx: number): T[] => {
    if (toIdx < 0 || toIdx >= arr.length) return arr;
    const copy = [...arr];
    const [moved] = copy.splice(fromIdx, 1);
    copy.splice(toIdx, 0, moved);
    return copy;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <PublicNavbar />

      {/* Admin Visual Editor Floating / Sticky Bar */}
      {canEdit && (
        <div
          style={{
            position: 'sticky',
            top: '64px',
            zIndex: 40,
            background: isEditing ? 'rgba(228, 37, 44, 0.14)' : 'var(--color-surface)',
            backdropFilter: 'blur(12px)',
            borderBottom: isEditing ? '2px solid var(--color-primary)' : '1px solid var(--color-border)',
            padding: '0.75rem 1.5rem',
          }}
        >
          <div
            style={{
              maxWidth: '1100px',
              margin: '0 auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.88rem', fontWeight: 700 }}>
              <Edit3 size={16} style={{ color: 'var(--color-primary)' }} />
              <span>
                {isEditing
                  ? 'Mode Edit Visual Aktif — Klik langsung pada kartu, langkah, atau FAQ di bawah untuk mengubah isi panduan.'
                  : 'Kelola Konten Panduan (Akses Admin)'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {isEditing ? (
                <>
                  <Button variant="secondary" size="sm" onClick={handleResetDefault} disabled={saving}>
                    <RotateCw size={14} /> Reset Default
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                    <Eye size={14} /> Lihat Pratinjau
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving}>
                    <Save size={14} /> Simpan Perubahan
                  </Button>
                </>
              ) : (
                <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                  <Edit3 size={14} /> Edit Tampilan Panduan
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <main style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', padding: '3rem 1.5rem', width: '100%' }}>
        {/* ── 1. HEADER HERO SECTION ── */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          {isEditing ? (
            <Card style={{ padding: '1.5rem', textAlign: 'left', maxWidth: '760px', margin: '0 auto', border: '1px dashed var(--color-primary)' }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                ✏️ Edit Bagian Judul Utama (Hero)
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Teks Badge Atas</label>
                  <input
                    className="input-field"
                    value={content.heroBadge}
                    onChange={(e) => setContent({ ...content, heroBadge: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Judul Utama</label>
                  <input
                    className="input-field"
                    value={content.heroTitle}
                    onChange={(e) => setContent({ ...content, heroTitle: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Kata Highlight Merah</label>
                  <input
                    className="input-field"
                    value={content.heroHighlight}
                    onChange={(e) => setContent({ ...content, heroHighlight: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.78rem', color: 'var(--color-muted)', fontWeight: 600 }}>Deskripsi Subjudul</label>
                <textarea
                  className="input-field"
                  rows={2}
                  value={content.heroSubtitle}
                  onChange={(e) => setContent({ ...content, heroSubtitle: e.target.value })}
                />
              </div>
            </Card>
          ) : (
            <>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  padding: '0.4rem 1rem',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  color: 'var(--color-primary-light)',
                  marginBottom: '1rem',
                }}
              >
                <HelpCircle size={16} /> {content.heroBadge}
              </div>

              <h1 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '0.75rem' }}>
                {content.heroTitle} <span className="text-gradient">{content.heroHighlight}</span>
              </h1>

              <p style={{ color: 'var(--color-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
                {content.heroSubtitle}
              </p>
            </>
          )}
        </div>

        {/* ── 2. FEATURE OVERVIEW GRID ── */}
        <div style={{ marginBottom: '4rem' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '1.25rem',
            }}
          >
            {content.features.map((feat, idx) => {
              const Icon = ICON_MAP[feat.iconName] || Building;
              return (
                <Card
                  key={idx}
                  style={{
                    padding: '1.5rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                    border: isEditing ? '1px dashed var(--color-border-hover)' : undefined,
                  }}
                >
                  {isEditing ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                        <select
                          className="input-field"
                          style={{ padding: '0.35rem 0.5rem', fontSize: '0.8rem' }}
                          value={feat.iconName}
                          onChange={(e) => {
                            const next = [...content.features];
                            next[idx] = { ...feat, iconName: e.target.value };
                            setContent({ ...content, features: next });
                          }}
                        >
                          {ICON_OPTIONS.map((ic) => (
                            <option key={ic} value={ic}>Ikon: {ic}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const next = content.features.filter((_, i) => i !== idx);
                            setContent({ ...content, features: next });
                          }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                          title="Hapus kartu fitur"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      <input
                        className="input-field"
                        placeholder="Judul Fitur"
                        value={feat.title}
                        onChange={(e) => {
                          const next = [...content.features];
                          next[idx] = { ...feat, title: e.target.value };
                          setContent({ ...content, features: next });
                        }}
                      />
                      <textarea
                        className="input-field"
                        rows={3}
                        placeholder="Deskripsi Fitur"
                        value={feat.desc}
                        onChange={(e) => {
                          const next = [...content.features];
                          next[idx] = { ...feat, desc: e.target.value };
                          setContent({ ...content, features: next });
                        }}
                      />
                    </>
                  ) : (
                    <>
                      <div
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: 'var(--radius-md)',
                          background: 'var(--color-surface2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--color-primary-light)',
                        }}
                      >
                        <Icon size={22} />
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{feat.title}</h3>
                      <p style={{ color: 'var(--color-muted)', fontSize: '0.88rem', lineHeight: 1.5 }}>{feat.desc}</p>
                    </>
                  )}
                </Card>
              );
            })}
          </div>

          {isEditing && (
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  setContent({
                    ...content,
                    features: [
                      ...content.features,
                      { iconName: 'ShieldCheck', title: 'Fitur Baru', desc: 'Deskripsi singkat fitur...' },
                    ],
                  })
                }
              >
                <Plus size={15} /> Tambah Kartu Fitur
              </Button>
            </div>
          )}
        </div>

        {/* ── 3. TIMELINE STEPS SECTION ── */}
        <div style={{ marginBottom: '4.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            {isEditing ? (
              <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  className="input-field"
                  style={{ fontWeight: 800, textAlign: 'center', fontSize: '1.2rem' }}
                  value={content.stepsTitle}
                  onChange={(e) => setContent({ ...content, stepsTitle: e.target.value })}
                />
                <input
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '0.9rem' }}
                  value={content.stepsSubtitle}
                  onChange={(e) => setContent({ ...content, stepsSubtitle: e.target.value })}
                />
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{content.stepsTitle}</h2>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>{content.stepsSubtitle}</p>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {content.steps.map((step, idx) => {
              const Icon = ICON_MAP[step.iconName] || HelpCircle;
              return (
                <Card
                  key={idx}
                  style={{
                    padding: '1.75rem',
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '1.5rem',
                    alignItems: 'flex-start',
                    border: isEditing ? '1px dashed var(--color-border-hover)' : undefined,
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                    {isEditing ? (
                      <input
                        className="input-field"
                        style={{ width: '58px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 800, padding: '0.3rem' }}
                        value={step.num}
                        onChange={(e) => {
                          const next = [...content.steps];
                          next[idx] = { ...step, num: e.target.value };
                          setContent({ ...content, steps: next });
                        }}
                      />
                    ) : (
                      <div style={{ fontFamily: 'monospace', fontSize: '1.2rem', fontWeight: 900, color: 'var(--color-primary-light)' }}>
                        {step.num}
                      </div>
                    )}
                    <div
                      style={{
                        width: '46px',
                        height: '46px',
                        borderRadius: '50%',
                        background: 'var(--grad-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFFFFF',
                        boxShadow: 'var(--shadow-glow)',
                      }}
                    >
                      <Icon size={22} />
                    </div>
                  </div>

                  <div>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                          <input
                            className="input-field"
                            style={{ flex: 1, fontWeight: 800 }}
                            placeholder="Judul Langkah"
                            value={step.title}
                            onChange={(e) => {
                              const next = [...content.steps];
                              next[idx] = { ...step, title: e.target.value };
                              setContent({ ...content, steps: next });
                            }}
                          />
                          <select
                            className="input-field"
                            style={{ width: '150px' }}
                            value={step.iconName}
                            onChange={(e) => {
                              const next = [...content.steps];
                              next[idx] = { ...step, iconName: e.target.value };
                              setContent({ ...content, steps: next });
                            }}
                          >
                            {ICON_OPTIONS.map((ic) => (
                              <option key={ic} value={ic}>Ikon: {ic}</option>
                            ))}
                          </select>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={idx === 0}
                            onClick={() => setContent({ ...content, steps: moveItem(content.steps, idx, idx - 1) })}
                            title="Geser Naik"
                          >
                            <ArrowUp size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            disabled={idx === content.steps.length - 1}
                            onClick={() => setContent({ ...content, steps: moveItem(content.steps, idx, idx + 1) })}
                            title="Geser Turun"
                          >
                            <ArrowDown size={14} />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            style={{ color: 'var(--color-danger)' }}
                            onClick={() =>
                              setContent({ ...content, steps: content.steps.filter((_, i) => i !== idx) })
                            }
                            title="Hapus Langkah"
                          >
                            <Trash2 size={15} />
                          </Button>
                        </div>

                        <input
                          className="input-field"
                          placeholder="Ringkasan singkat langkah..."
                          value={step.summary}
                          onChange={(e) => {
                            const next = [...content.steps];
                            next[idx] = { ...step, summary: e.target.value };
                            setContent({ ...content, steps: next });
                          }}
                        />

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '0.5rem', borderLeft: '2px solid var(--color-border)' }}>
                          <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700 }}>
                            Rincian Poin Langkah:
                          </div>
                          {step.points.map((pt, pIdx) => (
                            <div key={pIdx} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                              <input
                                className="input-field"
                                style={{ padding: '0.4rem 0.65rem', fontSize: '0.85rem' }}
                                value={pt}
                                onChange={(e) => {
                                  const nextSteps = [...content.steps];
                                  const nextPts = [...step.points];
                                  nextPts[pIdx] = e.target.value;
                                  nextSteps[idx] = { ...step, points: nextPts };
                                  setContent({ ...content, steps: nextSteps });
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const nextSteps = [...content.steps];
                                  nextSteps[idx] = {
                                    ...step,
                                    points: step.points.filter((_, i) => i !== pIdx),
                                  };
                                  setContent({ ...content, steps: nextSteps });
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer' }}
                                title="Hapus poin"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                          <div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const nextSteps = [...content.steps];
                                nextSteps[idx] = { ...step, points: [...step.points, 'Poin panduan baru...'] };
                                setContent({ ...content, steps: nextSteps });
                              }}
                            >
                              <Plus size={14} /> Tambah Poin
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.3rem' }}>{step.title}</h3>
                        <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem', fontWeight: 500, marginBottom: '1rem' }}>
                          {step.summary}
                        </p>

                        <ul style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', paddingLeft: '1.2rem', margin: 0 }}>
                          {step.points.map((pt, pIdx) => (
                            <li key={pIdx} style={{ fontSize: '0.9rem', color: 'var(--color-text)', lineHeight: 1.5 }}>
                              {pt}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {isEditing && (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setContent({
                    ...content,
                    steps: [
                      ...content.steps,
                      {
                        num: String(content.steps.length + 1).padStart(2, '0'),
                        title: 'Langkah Baru',
                        iconName: 'CheckCircle',
                        summary: 'Ringkasan langkah baru...',
                        points: ['Rincian poin pertama...'],
                      },
                    ],
                  })
                }
              >
                <Plus size={16} /> Tambah Langkah Alur Baru
              </Button>
            </div>
          )}
        </div>

        {/* ── 4. FAQ SECTION ── */}
        <div style={{ marginBottom: '4.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            {isEditing ? (
              <div style={{ maxWidth: '620px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <input
                  className="input-field"
                  style={{ fontWeight: 800, textAlign: 'center', fontSize: '1.2rem' }}
                  value={content.faqTitle}
                  onChange={(e) => setContent({ ...content, faqTitle: e.target.value })}
                />
                <input
                  className="input-field"
                  style={{ textAlign: 'center', fontSize: '0.9rem' }}
                  value={content.faqSubtitle}
                  onChange={(e) => setContent({ ...content, faqSubtitle: e.target.value })}
                />
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>{content.faqTitle}</h2>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>{content.faqSubtitle}</p>
              </>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '850px', margin: '0 auto' }}>
            {content.faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <Card
                  key={idx}
                  style={{
                    padding: '1.25rem',
                    cursor: isEditing ? 'default' : 'pointer',
                    border: isEditing ? '1px dashed var(--color-border-hover)' : undefined,
                  }}
                  onClick={() => {
                    if (!isEditing) setOpenFaq(isOpen ? null : idx);
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <input
                          className="input-field"
                          style={{ flex: 1, fontWeight: 700 }}
                          placeholder="Pertanyaan FAQ"
                          value={faq.q}
                          onChange={(e) => {
                            const next = [...content.faqs];
                            next[idx] = { ...faq, q: e.target.value };
                            setContent({ ...content, faqs: next });
                          }}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={idx === 0}
                          onClick={() => setContent({ ...content, faqs: moveItem(content.faqs, idx, idx - 1) })}
                        >
                          <ArrowUp size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={idx === content.faqs.length - 1}
                          onClick={() => setContent({ ...content, faqs: moveItem(content.faqs, idx, idx + 1) })}
                        >
                          <ArrowDown size={14} />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() =>
                            setContent({ ...content, faqs: content.faqs.filter((_, i) => i !== idx) })
                          }
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                      <textarea
                        className="input-field"
                        rows={2}
                        placeholder="Jawaban FAQ"
                        value={faq.a}
                        onChange={(e) => {
                          const next = [...content.faqs];
                          next[idx] = { ...faq, a: e.target.value };
                          setContent({ ...content, faqs: next });
                        }}
                      />
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                        <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{faq.q}</h4>
                        {isOpen ? (
                          <ChevronUp size={20} style={{ color: 'var(--color-primary)' }} />
                        ) : (
                          <ChevronDown size={20} style={{ color: 'var(--color-muted)' }} />
                        )}
                      </div>

                      {isOpen && (
                        <div
                          style={{
                            marginTop: '0.85rem',
                            borderTop: '1px solid var(--color-border)',
                            paddingTop: '0.85rem',
                            color: 'var(--color-muted)',
                            fontSize: '0.92rem',
                            lineHeight: 1.6,
                          }}
                        >
                          {faq.a}
                        </div>
                      )}
                    </>
                  )}
                </Card>
              );
            })}
          </div>

          {isEditing && (
            <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setContent({
                    ...content,
                    faqs: [
                      ...content.faqs,
                      { q: 'Pertanyaan baru...', a: 'Penjelasan jawaban...' },
                    ],
                  })
                }
              >
                <Plus size={16} /> Tambah Pertanyaan FAQ
              </Button>
            </div>
          )}
        </div>

        {/* ── 5. SECTION: BUTUH BANTUAN? ── */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              background: 'var(--color-surface2)',
              border: isEditing ? '1px dashed var(--color-primary)' : '1px solid var(--color-border)',
              borderRadius: 'var(--radius-lg)',
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            {isEditing ? (
              <div style={{ width: '100%', maxWidth: '560px', display: 'flex', flexDirection: 'column', gap: '0.65rem', textAlign: 'left' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--color-primary)', textTransform: 'uppercase' }}>
                  ✏️ Edit Kontak Bantuan
                </div>
                <input
                  className="input-field"
                  placeholder="Judul Bantuan"
                  value={content.contactTitle}
                  onChange={(e) => setContent({ ...content, contactTitle: e.target.value })}
                />
                <textarea
                  className="input-field"
                  rows={2}
                  placeholder="Deskripsi Bantuan"
                  value={content.contactSubtitle}
                  onChange={(e) => setContent({ ...content, contactSubtitle: e.target.value })}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <input
                    className="input-field"
                    placeholder="Email Bantuan"
                    value={content.contactEmail}
                    onChange={(e) => setContent({ ...content, contactEmail: e.target.value })}
                  />
                  <input
                    className="input-field"
                    placeholder="No. Telepon / WhatsApp"
                    value={content.contactPhone}
                    onChange={(e) => setContent({ ...content, contactPhone: e.target.value })}
                  />
                </div>
              </div>
            ) : (
              <>
                <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>{content.contactTitle}</h2>
                <p style={{ color: 'var(--color-muted)', fontSize: '0.98rem', maxWidth: '550px', lineHeight: 1.5, margin: 0 }}>
                  {content.contactSubtitle}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
                    <Mail size={18} style={{ color: 'var(--color-primary-light)' }} />
                    <span>{content.contactEmail}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
                    <Phone size={18} style={{ color: 'var(--color-success)' }} />
                    <span>{content.contactPhone}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── 6. SECTION: SIAP MEMULAI? ── */}
        <div>
          <Card
            style={{
              padding: '3rem 2rem',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.25rem',
            }}
          >
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Siap Memulai?</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.98rem', maxWidth: '550px', lineHeight: 1.5, margin: 0 }}>
              Daftar sekarang dan mulai ajukan peminjaman ruangan, kendaraan, atau peralatan instansi.
            </p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '0.5rem' }}>
              <Link href="/register" className="btn btn-primary btn-lg">
                <UserPlus size={18} /> Daftar Sekarang
              </Link>
              <Link href="/login" className="btn btn-secondary btn-lg">
                <LogIn size={18} /> Sudah Punya Akun?
              </Link>
            </div>
          </Card>
        </div>
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--color-border)',
          backgroundColor: 'var(--color-surface)',
          padding: '2rem 1.5rem',
          textAlign: 'center',
          fontSize: '0.85rem',
          color: 'var(--color-muted)',
          marginTop: '4rem',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>
            SPASI — Sistem Pencatatan Aset, Sewa &amp; Pinjam Instansi
          </div>
          <div>© {new Date().getFullYear()} SPASI App Platform. Installable Web Application (PWA).</div>
        </div>
      </footer>
    </div>
  );
}
