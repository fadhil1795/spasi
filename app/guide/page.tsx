'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/public/Navbar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
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
  ArrowRight,
  HelpCircle,
} from 'lucide-react';

export default function GuidePage() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenFaq(openFaq === index ? null : index);
  };

  const steps = [
    {
      num: '01',
      title: 'Registrasi Akun',
      icon: UserPlus,
      summary: 'Daftar akun baru dengan email dan data diri yang valid',
      points: [
        'Klik tombol "Masuk / Login" di halaman utama',
        'Isi form registrasi dengan data diri yang benar',
        'Pilih role sesuai status (Staff / Dosen / Mahasiswa / Peminjam)',
        'Verifikasi email yang dikirimkan ke inbox Anda',
      ],
    },
    {
      num: '02',
      title: 'Login ke Sistem',
      icon: LogIn,
      summary: 'Masuk menggunakan email dan password yang telah didaftarkan',
      points: [
        'Klik tombol "Masuk" di navigasi utama',
        'Masukkan email dan password terdaftar',
        'Klik "Masuk Sekarang" untuk mengaktifkan sesi dashboard',
      ],
    },
    {
      num: '03',
      title: 'Cek Ketersediaan Aset',
      icon: Calendar,
      summary: 'Lihat jadwal dan ketersediaan ruangan, kendaraan, atau alat',
      points: [
        'Buka halaman "Katalog Aset" publik atau menu dashboard',
        'Filter berdasarkan kategori (Ruangan, Kendaraan, Alat, dll)',
        'Cek status indikator ketersediaan real-time (Tersedia / Dipinjam)',
        'Pastikan jadwal yang Anda inginkan tidak bentrok',
      ],
    },
    {
      num: '04',
      title: 'Ajukan Peminjaman',
      icon: Send,
      summary: 'Isi form peminjaman dengan lengkap dan benar',
      points: [
        'Pilih jenis aset yang akan dipinjam',
        'Tentukan tanggal mulai dan tanggal pengembalian',
        'Isi rincian tujuan keperluan peminjaman dengan jelas',
        'Kirim pengajuan melalui Wizard Peminjaman 4 langkah',
      ],
    },
    {
      num: '05',
      title: 'Menunggu Persetujuan (Approval)',
      icon: Clock,
      summary: 'Admin & Kepala Unit akan meninjau dan memproses pengajuan Anda',
      points: [
        'Pengajuan diproses berjenjang (Level 1 Kepala Unit & Level 2 Admin Aset)',
        'Anda akan mendapat notifikasi perubahan status pengajuan',
        'Pantau status tiket di halaman "Peminjaman Saya" secara berkala',
        'Siapkan dokumen pendukung jika diminta oleh petugas',
      ],
    },
    {
      num: '06',
      title: 'Penggunaan Fasilitas & Validasi QR',
      icon: QrCode,
      summary: 'Gunakan QR Code untuk validasi saat pengambilan aset',
      points: [
        'Buka tiket peminjaman di dashboard untuk melihat QR Code fisik',
        'Datang tepat waktu ke lokasi penyerahan aset sesuai jadwal',
        'Tunjukkan QR Code dari layar HP kepada petugas lapangan',
        'Petugas akan melacak & scan QR Code untuk proses Check-In',
        'Gunakan fasilitas/aset sesuai peruntukan yang disetujui',
      ],
    },
    {
      num: '07',
      title: 'Pengembalian Aset',
      icon: RotateCcw,
      summary: 'Kembalikan fasilitas/aset dalam kondisi baik tepat waktu',
      points: [
        'Kembalikan aset sesuai dengan batas waktu yang ditentukan',
        'Pastikan kondisi fisik aset tetap dalam kondisi bersih dan baik',
        'Petugas akan menginspeksi & melakukan Scan QR pengembalian (Check-Out)',
        'Status peminjaman selesai & otomatis tercatat di sistem',
      ],
    },
  ];

  const faqs = [
    {
      q: 'Berapa lama proses persetujuan peminjaman?',
      a: 'Proses persetujuan biasanya memerlukan waktu maksimal 1x24 jam kerja melalui 2 tahapan verifikasi: Persetujuan Kepala Unit (Level 1) dan Konfirmasi Admin Aset (Level 2).',
    },
    {
      q: 'Bagaimana jika pengembalian aset terlambat?',
      a: 'Sistem SPASI secara otomatis akan menghitung keterlambatan dan mengenakan biaya denda sesuai kebijakan tarif yang berlaku pada instansi.',
    },
    {
      q: 'Apakah pihak eksternal bisa melakukan penyewaan?',
      a: 'Bisa. SPASI menyediakan modul khusus Penyewaan Eksternal yang dilengkapi kalkulator sewa otomatis berdasarkan tarif harian dan deposit.',
    },
    {
      q: 'Bagaimana cara menunjukkan QR Code saat pengambilan barang?',
      a: 'Anda cukup login ke akun SPASI di HP Anda, buka menu Peminjaman, pilih tiket aktif, lalu tampilkan QR Code ke kamera petugas scanner.',
    },
    {
      q: 'Apakah pengajuan peminjaman bisa dibatalkan?',
      a: 'Pembatalan dapat dilakukan selama status pengajuan masih dalam kondisi PENDING_L1 atau PENDING_L2 melalui tombol pembatalan di detail peminjaman.',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', backgroundColor: 'var(--color-bg)' }}>
      <PublicNavbar />

      <main style={{ flex: 1, maxWidth: '1100px', margin: '0 auto', padding: '3.5rem 1.5rem', width: '100%' }}>
        {/* Header Hero Section */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
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
            <HelpCircle size={16} /> Panduan & Tata Cara Peminjaman
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 900, lineHeight: 1.2, marginBottom: '0.75rem' }}>
            Panduan Penggunaan <span className="text-gradient">SPASI</span>
          </h1>

          <p style={{ color: 'var(--color-muted)', fontSize: '1.05rem', maxWidth: '680px', margin: '0 auto', lineHeight: 1.6 }}>
            Pelajari alur pengajuan peminjaman sarana internal, sewa aset eksternal, validasi QR Code fisik, dan aturan pengembalian instansi.
          </p>
        </div>

        {/* Feature Overview Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.25rem',
            marginBottom: '4rem',
          }}
        >
          {[
            {
              icon: Building,
              title: 'Sewa Ruangan & Aula',
              desc: 'Sewa ruang rapat, aula, studio, dan auditorium instansi secara per jam/hari dengan kalkulator sewa otomatis & anti-double booking.',
            },
            {
              icon: Laptop,
              title: 'Add-On Alat Tambahan',
              desc: 'Sewa proyektor, sound system, laptop, kamera, dan perlengkapan tambahan langsung dalam 1 paket pesanan ruangan.',
            },
            {
              icon: QrCode,
              title: 'E-Voucher & Validasi QR',
              desc: 'Dapatkan E-Voucher digital ber-QR Code untuk proses Check-In dan Check-Out penyerahan kunci & barang instan.',
            },
            {
              icon: Car,
              title: 'Inspeksi & Jaminan Deposit',
              desc: 'Pencatatan inspeksi fisik aset bawaan ruangan & add-on saat Check-In/Check-Out lengkap dengan kalkulasi klaim deposit.',
            },
          ].map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <Card key={idx} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
              </Card>
            );
          })}
        </div>

        {/* Timeline Steps Section */}
        <div style={{ marginBottom: '4.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>7 Langkah Alur Peminjaman</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
              Ikuti alur terstruktur dari registrasi hingga pengembalian aset
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {steps.map((step, idx) => {
              const Icon = step.icon;
              return (
                <Card
                  key={idx}
                  style={{
                    padding: '1.75rem',
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '1.5rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <div
                      style={{
                        fontFamily: 'monospace',
                        fontSize: '1.2rem',
                        fontWeight: 900,
                        color: 'var(--color-primary-light)',
                      }}
                    >
                      {step.num}
                    </div>
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
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div style={{ marginBottom: '4.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Pertanyaan Yang Sering Diajukan (FAQ)</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.95rem' }}>
              Jawaban cepat untuk pertanyaan umum seputar sistem peminjaman & penyewaan
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '850px', margin: '0 auto' }}>
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <Card key={idx} style={{ padding: '1.25rem', cursor: 'pointer' }} onClick={() => toggleFaq(idx)}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>{faq.q}</h4>
                    {isOpen ? <ChevronUp size={20} style={{ color: 'var(--color-primary)' }} /> : <ChevronDown size={20} style={{ color: 'var(--color-muted)' }} />}
                  </div>

                  {isOpen && (
                    <div style={{ marginTop: '0.85rem', borderTop: '1px solid var(--color-border)', paddingTop: '0.85rem', color: 'var(--color-muted)', fontSize: '0.92rem', lineHeight: 1.6 }}>
                      {faq.a}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Section: Butuh Bantuan? (Matches Reference Image) */}
        <div style={{ marginBottom: '2.5rem' }}>
          <div
            style={{
              background: 'var(--color-surface2)',
              border: '1px solid var(--color-border)',
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
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>Butuh Bantuan?</h2>
            <p style={{ color: 'var(--color-muted)', fontSize: '0.98rem', maxWidth: '550px', lineHeight: 1.5, margin: 0 }}>
              Jika Anda mengalami kesulitan atau memiliki pertanyaan, jangan ragu untuk menghubungi kami.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem', fontSize: '0.95rem', fontWeight: 600 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
                <Mail size={18} style={{ color: 'var(--color-primary-light)' }} />
                <span>admin@spasi.app</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', justifyContent: 'center' }}>
                <Phone size={18} style={{ color: 'var(--color-success)' }} />
                <span>+62 812-3456-7890</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Siap Memulai? (Matches Reference Image) */}
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
              <Link href="/login" className="btn btn-primary btn-lg">
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
            SPASI — Sistem Pencatatan Aset, Sewa & Pinjam Instansi
          </div>
          <div>© {new Date().getFullYear()} SPASI App Platform. Installable Web Application (PWA).</div>
        </div>
      </footer>
    </div>
  );
}
