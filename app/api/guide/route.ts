import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export interface GuideFeatureItem {
  iconName: string;
  title: string;
  desc: string;
}

export interface GuideStepItem {
  num: string;
  title: string;
  iconName: string;
  summary: string;
  points: string[];
}

export interface GuideFaqItem {
  q: string;
  a: string;
}

export interface GuideContentData {
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
  updatedAt?: string;
}

export const DEFAULT_GUIDE_CONTENT: GuideContentData = {
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

const DATA_FILE_PATH = path.join(process.cwd(), 'data', 'guide_content.json');

function readGuideData(): GuideContentData {
  try {
    if (fs.existsSync(DATA_FILE_PATH)) {
      const raw = fs.readFileSync(DATA_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_GUIDE_CONTENT, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to read guide_content.json, using default:', e);
  }
  return DEFAULT_GUIDE_CONTENT;
}

function writeGuideData(data: GuideContentData) {
  const dir = path.dirname(DATA_FILE_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(DATA_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function GET() {
  try {
    const content = readGuideData();
    return NextResponse.json(content);
  } catch (error) {
    console.error('Error reading guide content:', error);
    return NextResponse.json(DEFAULT_GUIDE_CONTENT);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const role = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      return NextResponse.json(
        { error: 'Forbidden: Hanya Admin atau Super Admin yang dapat mengedit panduan' },
        { status: 403 }
      );
    }

    const body = await request.json();
    if (body?.reset === true) {
      writeGuideData(DEFAULT_GUIDE_CONTENT);
      return NextResponse.json({
        message: 'Konten panduan berhasil dikembalikan ke bawaan (default)',
        data: DEFAULT_GUIDE_CONTENT,
      });
    }

    const updated: GuideContentData = {
      heroBadge: String(body.heroBadge || DEFAULT_GUIDE_CONTENT.heroBadge).trim(),
      heroTitle: String(body.heroTitle || DEFAULT_GUIDE_CONTENT.heroTitle).trim(),
      heroHighlight: String(body.heroHighlight || DEFAULT_GUIDE_CONTENT.heroHighlight).trim(),
      heroSubtitle: String(body.heroSubtitle || DEFAULT_GUIDE_CONTENT.heroSubtitle).trim(),
      features: Array.isArray(body.features) ? body.features : DEFAULT_GUIDE_CONTENT.features,
      stepsTitle: String(body.stepsTitle || DEFAULT_GUIDE_CONTENT.stepsTitle).trim(),
      stepsSubtitle: String(body.stepsSubtitle || DEFAULT_GUIDE_CONTENT.stepsSubtitle).trim(),
      steps: Array.isArray(body.steps) ? body.steps : DEFAULT_GUIDE_CONTENT.steps,
      faqTitle: String(body.faqTitle || DEFAULT_GUIDE_CONTENT.faqTitle).trim(),
      faqSubtitle: String(body.faqSubtitle || DEFAULT_GUIDE_CONTENT.faqSubtitle).trim(),
      faqs: Array.isArray(body.faqs) ? body.faqs : DEFAULT_GUIDE_CONTENT.faqs,
      contactTitle: String(body.contactTitle || DEFAULT_GUIDE_CONTENT.contactTitle).trim(),
      contactSubtitle: String(body.contactSubtitle || DEFAULT_GUIDE_CONTENT.contactSubtitle).trim(),
      contactEmail: String(body.contactEmail || DEFAULT_GUIDE_CONTENT.contactEmail).trim(),
      contactPhone: String(body.contactPhone || DEFAULT_GUIDE_CONTENT.contactPhone).trim(),
      updatedAt: new Date().toISOString(),
    };

    writeGuideData(updated);
    return NextResponse.json({
      message: 'Konten panduan berhasil disimpan!',
      data: updated,
    });
  } catch (error) {
    console.error('Error saving guide content:', error);
    return NextResponse.json({ error: 'Gagal menyimpan perubahan panduan' }, { status: 500 });
  }
}
