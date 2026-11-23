import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DATA_DIR = path.join(process.cwd(), 'data');
const BRANDS_FILE = path.join(DATA_DIR, 'custom_brands.json');

// Katalog Merek Terstandarisasi Bawaan Industri per Kategori dan Subkategori
interface DefaultBrandEntry {
  name: string;
  categoryCode: string;
  subCategoryCode?: string;
  description?: string;
}

const STRUCTURED_DEFAULT_BRANDS: DefaultBrandEntry[] = [
  // --- ELEKTRONIK & MULTIMEDIA (ELK) ---
  // Subkategori: Jaringan & Komunikasi (NET)
  { name: 'Cisco', categoryCode: 'ELK', subCategoryCode: 'NET', description: 'Switch, Router & Perangkat Jaringan Enterprise' },
  { name: 'MikroTik', categoryCode: 'ELK', subCategoryCode: 'NET', description: 'RouterBoard, Switch & Cloud Router' },
  { name: 'TP-Link', categoryCode: 'ELK', subCategoryCode: 'NET', description: 'Access Point, Switch & Router SOHO' },
  { name: 'Ubiquiti', categoryCode: 'ELK', subCategoryCode: 'NET', description: 'UniFi AP, Switch & Gateway Wireless' },
  { name: 'Huawei', categoryCode: 'ELK', subCategoryCode: 'NET', description: 'Perangkat Infrastruktur Jaringan & Switch' },
  { name: 'Ruijie', categoryCode: 'ELK', subCategoryCode: 'NET', description: 'Reyee Enterprise Wi-Fi & Gateway' },
  { name: 'D-Link', categoryCode: 'ELK', subCategoryCode: 'NET', description: 'Switch & Jaringan Komputer' },
  { name: 'Fortinet', categoryCode: 'ELK', subCategoryCode: 'NET', description: 'Firewall & Network Security' },

  // Subkategori: Komputer & Laptop (PC)
  { name: 'Asus', categoryCode: 'ELK', subCategoryCode: 'PC', description: 'Laptop, PC Desktop & Komponen Komputer' },
  { name: 'Lenovo', categoryCode: 'ELK', subCategoryCode: 'PC', description: 'ThinkPad, IdeaPad & PC Desktop Lab' },
  { name: 'HP', categoryCode: 'ELK', subCategoryCode: 'PC', description: 'Laptop, Desktop ProDesk & Workstation' },
  { name: 'Dell', categoryCode: 'ELK', subCategoryCode: 'PC', description: 'OptiPlex, Latitude & PowerEdge Server' },
  { name: 'Acer', categoryCode: 'ELK', subCategoryCode: 'PC', description: 'PC All-in-One, Laptop & Monitor' },
  { name: 'Apple', categoryCode: 'ELK', subCategoryCode: 'PC', description: 'MacBook, iMac, Mac Mini & iPad' },
  { name: 'MSI', categoryCode: 'ELK', subCategoryCode: 'PC', description: 'PC Gaming, Laptop Multimedia & Motherboard' },
  { name: 'Logitech', categoryCode: 'ELK', subCategoryCode: 'PC', description: 'Keyboard, Mouse, Headset & Webcam' },

  // Subkategori: Audio-Visual & Display (AV)
  { name: 'Epson', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Proyektor 3LCD & Interactive Projector' },
  { name: 'BenQ', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Proyektor Kelas & Interactive Flat Panel' },
  { name: 'ViewSonic', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Interactive Display, Smart Board & Monitor' },
  { name: 'Sony', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Kamera Video, TV Display & Proyektor' },
  { name: 'Samsung', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Smart TV, Video Wall & Monitor Display' },
  { name: 'LG', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Komersial Display, Smart TV & Monitor' },
  { name: 'Canon', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Kamera DSLR/Mirrorless & Camcorder' },
  { name: 'Panasonic', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Display Komersial, PTZ Camera & Projector' },
  { name: 'Hikvision', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'CCTV, Interactive Whiteboard & Kamera Keamanan' },
  { name: 'Xiaomi', categoryCode: 'ELK', subCategoryCode: 'AV', description: 'Smart TV & Perangkat IoT Multimedia' },

  // Subkategori: Kelistrikan & Daya (PWR)
  { name: 'APC', categoryCode: 'ELK', subCategoryCode: 'PWR', description: 'UPS Server, Smart-UPS & Stabilizer' },
  { name: 'Schneider Electric', categoryCode: 'ELK', subCategoryCode: 'PWR', description: 'Panel Daya, Breaker & Aksesoris Kelistrikan' },
  { name: 'Prolink', categoryCode: 'ELK', subCategoryCode: 'PWR', description: 'UPS Backup Daya & Stabilizer Voltase' },
  { name: 'ICA', categoryCode: 'ELK', subCategoryCode: 'PWR', description: 'UPS & Stabilizer Komputer' },
  { name: 'Philips', categoryCode: 'ELK', subCategoryCode: 'PWR', description: 'Pencahayaan LED & Aksesoris Kelistrikan' },

  // Subkategori: Printer & Scanner (PRN)
  { name: 'Brother', categoryCode: 'ELK', subCategoryCode: 'PRN', description: 'Printer Laser, Ink Tank & Mesin Label' },
  { name: 'Fuji Xerox', categoryCode: 'ELK', subCategoryCode: 'PRN', description: 'Mesin Fotokopi Multifungsi & Printer Laser' },
  { name: 'Kyocera', categoryCode: 'ELK', subCategoryCode: 'PRN', description: 'Mesin Fotokopi Multifungsi TaskAlfa' },

  // --- AUDIO & SOUND SYSTEM (SND) ---
  { name: 'JBL', categoryCode: 'SND', description: 'Speaker Aktif, Sound System Ruang & Array' },
  { name: 'Yamaha', categoryCode: 'SND', description: 'Mixer Audio, Power Amplifier & Speaker Pasif/Aktif' },
  { name: 'Behringer', categoryCode: 'SND', description: 'Digital Mixer X32, Audio Interface & Effect' },
  { name: 'Shure', categoryCode: 'SND', description: 'Mikrofon Wireless, Podium & Vokal' },
  { name: 'Sennheiser', categoryCode: 'SND', description: 'Wireless Mic & Headphone Audio Monitoring' },
  { name: 'TOA', categoryCode: 'SND', description: 'Speaker Horn Lapangan, Megaphone & Sound Masjid/Aula' },
  { name: 'Bose', categoryCode: 'SND', description: 'Sound System Premium & Speaker Kolom' },
  { name: 'Mackie', categoryCode: 'SND', description: 'Mixer Analog/Digital & Monitor Speaker' },
  { name: 'Audio-Technica', categoryCode: 'SND', description: 'Mikrofon Meja Rapat & Headphone' },
  { name: 'Pioneer', categoryCode: 'SND', description: 'Perangkat Audio Mixer & Player' },
  { name: 'BMB', categoryCode: 'SND', description: 'Speaker Karaoke & Amplifier Ruang Musik' },
  { name: 'RCF', categoryCode: 'SND', description: 'Active Line Array & Speaker Konser/Lapangan' },
  { name: 'Fender', categoryCode: 'SND', description: 'Amplifier Gitar & Alat Musik Band' },
  { name: 'Roland', categoryCode: 'SND', description: 'Synthesizer, Keyboard & Drum Elektrik' },

  // --- FURNITUR & MEUBEL (FURN) ---
  // Subkategori: Mebel Kelas (CLS)
  { name: 'Chitose', categoryCode: 'FURN', subCategoryCode: 'CLS', description: 'Kursi Kuliah Lipat, Meja Siswa & Bangku Belajar' },
  { name: 'Futura', categoryCode: 'FURN', subCategoryCode: 'CLS', description: 'Kursi Susun Aula & Kursi Kuliah Kampus' },
  { name: 'Olympic', categoryCode: 'FURN', subCategoryCode: 'CLS', description: 'Meja Belajar Kayu & Rak Buku' },
  { name: 'Informa', categoryCode: 'FURN', subCategoryCode: 'CLS', description: 'Furnitur Edukasi & Desain Modern' },

  // Subkategori: Mebel Kantor (OFF)
  { name: 'Indachi', categoryCode: 'FURN', subCategoryCode: 'OFF', description: 'Kursi Kerja Ergonomis & Kursi Direktur' },
  { name: 'Donati', categoryCode: 'FURN', subCategoryCode: 'OFF', description: 'Kursi Kantor, Sofa Rapat & Partisi Ruangan' },
  { name: 'Ergotec', categoryCode: 'FURN', subCategoryCode: 'OFF', description: 'Kursi Kerja Staf & Meja Kerja Modular' },
  { name: 'Modera', categoryCode: 'FURN', subCategoryCode: 'OFF', description: 'Meja Rapat, Workstation & Credenza Kantor' },
  { name: 'Subaru', categoryCode: 'FURN', subCategoryCode: 'OFF', description: 'Meja Kantor Minimalis & Meja Rapat' },
  { name: 'Expo', categoryCode: 'FURN', subCategoryCode: 'OFF', description: 'Meja Tulis Kantor & Rak Arsip' },
  { name: 'Ikea', categoryCode: 'FURN', subCategoryCode: 'OFF', description: 'Meja Kerja & Kursi Kantor Modular' },

  // Subkategori: Lemari & Rak (STR)
  { name: 'Lion', categoryCode: 'FURN', subCategoryCode: 'STR', description: 'Filling Cabinet Besi, Locker & Mobile File' },
  { name: 'Daiko', categoryCode: 'FURN', subCategoryCode: 'STR', description: 'Lemari Arsip Besi Pintu Geser & Kaca' },

  // Subkategori: Mebel Lab (LABF)
  { name: 'Esco', categoryCode: 'FURN', subCategoryCode: 'LABF', description: 'Meja Timbang Anti Getar, Fume Hood & Rak Lab' },

  // --- KENDARAAN OPERASIONAL (KDR) ---
  // Subkategori: Mobil Operasional (CAR)
  { name: 'Toyota', categoryCode: 'KDR', subCategoryCode: 'CAR', description: 'Kijang Innova, Avanza, HiAce & Fortuner' },
  { name: 'Daihatsu', categoryCode: 'KDR', subCategoryCode: 'CAR', description: 'Gran Max, Xenia, Terios & Luxio' },
  { name: 'Mitsubishi', categoryCode: 'KDR', subCategoryCode: 'CAR', description: 'Pajero Sport, Xpander & Triton' },
  { name: 'Suzuki', categoryCode: 'KDR', subCategoryCode: 'CAR', description: 'APV Minibus, Ertiga & Carry Pick Up' },
  { name: 'Hyundai', categoryCode: 'KDR', subCategoryCode: 'CAR', description: 'Stargazer, Creta, Palisade & Ioniq EV' },
  { name: 'Wuling', categoryCode: 'KDR', subCategoryCode: 'CAR', description: 'Confero, Cortez & Binguo EV' },

  // Subkategori: Sepeda Motor (MTR)
  { name: 'Honda', categoryCode: 'KDR', subCategoryCode: 'MTR', description: 'Vario, Beat, PCX & CB150R Operasional Kurir' },
  { name: 'Yamaha Motor', categoryCode: 'KDR', subCategoryCode: 'MTR', description: 'NMAX, Aerox, Gear & Mio Dinas' },
  { name: 'Kawasaki', categoryCode: 'KDR', subCategoryCode: 'MTR', description: 'KLX Trail Operasional Patroli/Lapangan' },

  // Subkategori: Bus Kampus (BUS)
  { name: 'Hino', categoryCode: 'KDR', subCategoryCode: 'BUS', description: 'Sasis Bus Besar & Medium Kampus' },
  { name: 'Isuzu', categoryCode: 'KDR', subCategoryCode: 'BUS', description: 'Elf Microbus & Giga Truk Pengangkut Logistik' },
  { name: 'Mitsubishi Fuso', categoryCode: 'KDR', subCategoryCode: 'BUS', description: 'Canter Bus Sekolah & Truk Operasional' },

  // --- ALAT LAB & INSTRUMEN (LAB) ---
  // Subkategori: Lab Sains & IPA (IPA)
  { name: 'Shimadzu', categoryCode: 'LAB', subCategoryCode: 'IPA', description: 'Spektrofotometer, Neraca Analitik & Kromatografi' },
  { name: 'Olympus', categoryCode: 'LAB', subCategoryCode: 'IPA', description: 'Mikroskop Biologi, Stereo & Kamera Mikroskop' },
  { name: 'Nikon Instruments', categoryCode: 'LAB', subCategoryCode: 'IPA', description: 'Mikroskop Riset & Optik Presisi' },
  { name: 'Leica Microsystems', categoryCode: 'LAB', subCategoryCode: 'IPA', description: 'Mikroskop Digital & Peralatan Histologi' },
  { name: 'Ohaus', categoryCode: 'LAB', subCategoryCode: 'IPA', description: 'Timbangan Digital Presisi & pH Meter' },
  { name: 'Thermo Scientific', categoryCode: 'LAB', subCategoryCode: 'IPA', description: 'Sentrifus, Inkubator Lab & Pipet Presisi' },
  { name: 'Hanna Instruments', categoryCode: 'LAB', subCategoryCode: 'IPA', description: 'pH Tester, Refraktometer & Multiparameter Meter' },

  // Subkategori: Lab Teknik & PLC (TEK)
  { name: 'Siemens', categoryCode: 'LAB', subCategoryCode: 'TEK', description: 'Modul Praktik PLC S7-1200 & HMI Otomasi' },
  { name: 'Omron', categoryCode: 'LAB', subCategoryCode: 'TEK', description: 'PLC, Sensor Industri & Trainer Otomasi Listrik' },
  { name: 'Festo', categoryCode: 'LAB', subCategoryCode: 'TEK', description: 'Trainer Pneumatik & Elektro-Pneumatik Lab' },
  { name: 'Arduino', categoryCode: 'LAB', subCategoryCode: 'TEK', description: 'Modul Mikrokontroler Praktik Robotika' },

  // Subkategori: Bengkel & Otomotif (OTO)
  { name: 'Bosch', categoryCode: 'LAB', subCategoryCode: 'OTO', description: 'Bor Listrik, Mesin Gerinda & Scanner Diagnostik Mobil' },
  { name: 'Makita', categoryCode: 'LAB', subCategoryCode: 'OTO', description: 'Mesin Potong Kayu, Bor Rotary & Power Tools Bengkel' },
  { name: 'Krisbow', categoryCode: 'LAB', subCategoryCode: 'OTO', description: 'Kompresor Angin, Dongkrak Hidrolik & Tool Set' },
  { name: 'Tekiro', categoryCode: 'LAB', subCategoryCode: 'OTO', description: 'Kunci Pas, Kunci Sok & Perkakas Mekanik Otomotif' },
  { name: 'Stanley', categoryCode: 'LAB', subCategoryCode: 'OTO', description: 'Hand Tools, Obeng Presisi & Gergaji Mesin' },
];

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(BRANDS_FILE)) {
    fs.writeFileSync(BRANDS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

interface CustomBrand {
  id: string;
  name: string;
  categoryCode: string;
  categoryName?: string;
  subCategoryCode?: string;
  subCategoryName?: string;
  description?: string;
  createdAt: string;
}

function getCustomBrands(): CustomBrand[] {
  try {
    ensureDataFile();
    const data = fs.readFileSync(BRANDS_FILE, 'utf-8');
    return JSON.parse(data) || [];
  } catch (e) {
    return [];
  }
}

function saveCustomBrands(brands: CustomBrand[]) {
  ensureDataFile();
  fs.writeFileSync(BRANDS_FILE, JSON.stringify(brands, null, 2), 'utf-8');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryCode = searchParams.get('categoryCode')?.toUpperCase();
    const subCategoryCode = searchParams.get('subCategoryCode')?.toUpperCase();
    const q = searchParams.get('q')?.toLowerCase();
    const isDetail = searchParams.get('detail') === 'true';

    // 1. Ambil Kategori & Subkategori dari Database agar selalu sinkron
    let dbCategories: any[] = [];
    try {
      dbCategories = await prisma.category.findMany({
        select: {
          id: true,
          code: true,
          name: true,
          parentId: true,
          parent: { select: { id: true, code: true, name: true } },
        },
        orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
      });
    } catch (e) {
      console.warn('Could not query categories for brands:', e);
    }

    const parentCategories = dbCategories.filter((c) => !c.parentId);
    const subCategories = dbCategories.filter((c) => !!c.parentId);

    // Map kamus nama kode
    const catCodeToName: Record<string, string> = {
      ELK: 'Elektronik & Multimedia',
      SND: 'Peralatan & Sound System',
      FURN: 'Furnitur & Meubel',
      KDR: 'Kendaraan Operasional',
      LAB: 'Peralatan Laboratorium & Praktik',
      RNG: 'Ruangan & Aula',
      OTHER: 'Kategori Lainnya',
    };

    const subCodeToName: Record<string, string> = {
      NET: 'Perangkat Jaringan, Server & Wi-Fi',
      PC: 'Komputer, Laptop, AIO & Tablet Lab',
      AV: 'Audio-Visual, Proyektor & Smart Board',
      PWR: 'Kelistrikan, UPS, Genset & Panel Daya',
      PRN: 'Printer, Scanner & Mesin Fotokopi',
      CLS: 'Mebel Kelas, Kuliah & Pembelajaran',
      OFF: 'Mebel Kantor, Rapat & Pimpinan',
      STR: 'Lemari Arsip, Filing Cabinet & Locker',
      LABF: 'Mebel Khusus Lab, Kimia & Meja Bengkel',
      CAR: 'Mobil Dinas Operasional',
      MTR: 'Sepeda Motor Operasional',
      BUS: 'Bus Kampus & Minibus',
      IPA: 'Peralatan Lab Sains & Biologi',
      TEK: 'Peralatan Lab Komputer & Robotika',
      OTO: 'Peralatan Bengkel & Otomotif',
    };

    parentCategories.forEach((c) => {
      if (c.code) catCodeToName[c.code] = c.name;
    });

    subCategories.forEach((c) => {
      if (c.code) subCodeToName[c.code] = c.name;
    });

    // 2. Ambil statistik pemakaian merek di database Asset
    let countMap: Record<string, number> = {};
    let dbAssetBrands: string[] = [];

    try {
      const counts = await prisma.asset.groupBy({
        by: ['brand'],
        where: { brand: { not: null } },
        _count: { id: true },
      });

      counts.forEach((c) => {
        if (c.brand && c.brand.trim()) {
          const brandClean = c.brand.trim();
          countMap[brandClean] = c._count.id;
          dbAssetBrands.push(brandClean);
        }
      });
    } catch (e) {
      console.warn('Could not query asset counts:', e);
    }

    // 3. Ambil Custom Brands dari JSON
    const customBrands = getCustomBrands();

    // 4. Struktur data gabungan merek
    const brandMap = new Map<string, {
      id?: string;
      name: string;
      categoryCode: string;
      categoryName: string;
      subCategoryCode?: string;
      subCategoryName?: string;
      isDefault: boolean;
      isCustom: boolean;
      description?: string;
      assetCount: number;
    }>();

    // A. Masukkan Default Brands
    STRUCTURED_DEFAULT_BRANDS.forEach((item) => {
      brandMap.set(item.name.toLowerCase(), {
        name: item.name,
        categoryCode: item.categoryCode,
        categoryName: catCodeToName[item.categoryCode] || item.categoryCode,
        subCategoryCode: item.subCategoryCode,
        subCategoryName: item.subCategoryCode ? (subCodeToName[item.subCategoryCode] || item.subCategoryCode) : undefined,
        isDefault: true,
        isCustom: false,
        description: item.description,
        assetCount: countMap[item.name] || 0,
      });
    });

    // B. Masukkan Custom Brands
    customBrands.forEach((cb) => {
      const key = cb.name.toLowerCase();
      const existing = brandMap.get(key);

      const catName = catCodeToName[cb.categoryCode] || cb.categoryName || cb.categoryCode || 'Kategori Lainnya';
      const subName = cb.subCategoryCode
        ? (subCodeToName[cb.subCategoryCode] || cb.subCategoryName || cb.subCategoryCode)
        : undefined;

      if (existing) {
        existing.id = cb.id;
        existing.isCustom = true;
        if (cb.description) existing.description = cb.description;
        if (cb.categoryCode) {
          existing.categoryCode = cb.categoryCode;
          existing.categoryName = catName;
        }
        if (cb.subCategoryCode) {
          existing.subCategoryCode = cb.subCategoryCode;
          existing.subCategoryName = subName;
        }
      } else {
        brandMap.set(key, {
          id: cb.id,
          name: cb.name,
          categoryCode: cb.categoryCode || 'OTHER',
          categoryName: catName,
          subCategoryCode: cb.subCategoryCode,
          subCategoryName: subName,
          isDefault: false,
          isCustom: true,
          description: cb.description,
          assetCount: countMap[cb.name] || 0,
        });
      }
    });

    // C. Masukkan brand dari DB yang belum tercatat
    dbAssetBrands.forEach((bName) => {
      const key = bName.toLowerCase();
      if (!brandMap.has(key)) {
        brandMap.set(key, {
          name: bName,
          categoryCode: 'OTHER',
          categoryName: 'Kategori Lainnya',
          isDefault: false,
          isCustom: false,
          assetCount: countMap[bName] || 0,
        });
      } else {
        const item = brandMap.get(key)!;
        item.assetCount = countMap[bName] || item.assetCount;
      }
    });

    let items = Array.from(brandMap.values());

    // Filter Kategori Utama jika diberikan
    if (categoryCode && categoryCode !== 'ALL') {
      items = items.filter((item) => item.categoryCode === categoryCode);
    }

    // Filter Subkategori jika diberikan
    if (subCategoryCode && subCategoryCode !== 'ALL') {
      // Prioritaskan brand yang cocok dengan subkategori, atau brand umum di kategori yang sama
      items = items.filter((item) => !item.subCategoryCode || item.subCategoryCode === subCategoryCode);
    }

    // Filter Pencarian
    if (q) {
      items = items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.categoryName.toLowerCase().includes(q) ||
          (item.subCategoryName && item.subCategoryName.toLowerCase().includes(q)) ||
          (item.description && item.description.toLowerCase().includes(q))
      );
    }

    // Urutkan: Brand dengan subkategori cocok didahulukan, lalu alfabetis
    items.sort((a, b) => {
      if (subCategoryCode && subCategoryCode !== 'ALL') {
        const aMatchesSub = a.subCategoryCode === subCategoryCode ? 1 : 0;
        const bMatchesSub = b.subCategoryCode === subCategoryCode ? 1 : 0;
        if (aMatchesSub !== bMatchesSub) return bMatchesSub - aMatchesSub;
      }
      return a.name.localeCompare(b.name);
    });

    // Simple string array untuk form input
    const simpleBrands = items.map((i) => i.name);

    if (isDetail) {
      return NextResponse.json({
        brands: simpleBrands,
        items,
        total: items.length,
        categories: [
          { code: 'ALL', name: 'Semua Kategori' },
          ...parentCategories.map((c) => ({
            code: c.code || c.id,
            name: c.name,
            id: c.id,
          })),
          { code: 'OTHER', name: 'Lainnya / Kustom' },
        ],
        subCategories: subCategories.map((s) => ({
          id: s.id,
          code: s.code || s.id,
          name: s.name,
          parentId: s.parentId,
          parentCode: s.parent?.code,
          parentName: s.parent?.name,
        })),
      });
    }

    return NextResponse.json({ brands: simpleBrands });
  } catch (error) {
    console.error('Error fetching brands:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { getAuthSession } = await import('@/lib/auth');
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const name = (body.name || '').trim();
    const categoryCode = (body.categoryCode || 'OTHER').toUpperCase();
    const subCategoryCode = body.subCategoryCode ? body.subCategoryCode.toUpperCase() : undefined;
    const description = (body.description || '').trim();

    if (!name || name.length < 2) {
      return NextResponse.json({ error: 'Nama merek minimal 2 karakter' }, { status: 400 });
    }

    // Ambil nama kategori dan subkategori dari Prisma untuk metadata
    let categoryName = body.categoryName;
    let subCategoryName = body.subCategoryName;

    try {
      if (!categoryName && categoryCode !== 'OTHER') {
        const cat = await prisma.category.findFirst({
          where: { code: categoryCode, parentId: null },
          select: { name: true },
        });
        if (cat) categoryName = cat.name;
      }

      if (!subCategoryName && subCategoryCode && subCategoryCode !== 'ALL') {
        const sub = await prisma.category.findFirst({
          where: { code: subCategoryCode, parentId: { not: null } },
          select: { name: true },
        });
        if (sub) subCategoryName = sub.name;
      }
    } catch (e) {
      console.warn('Could not query category names for new brand:', e);
    }

    const customBrands = getCustomBrands();
    const lowerName = name.toLowerCase();

    // Cek apakah sudah terdaftar
    const existingIndex = customBrands.findIndex((cb) => cb.name.toLowerCase() === lowerName);

    const newBrand: CustomBrand = {
      id: existingIndex >= 0 ? customBrands[existingIndex].id : `brand_${Date.now()}`,
      name,
      categoryCode,
      categoryName: categoryName || undefined,
      subCategoryCode: subCategoryCode && subCategoryCode !== 'ALL' ? subCategoryCode : undefined,
      subCategoryName: subCategoryName && subCategoryCode !== 'ALL' ? subCategoryName : undefined,
      description: description || undefined,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      customBrands[existingIndex] = newBrand;
    } else {
      customBrands.push(newBrand);
    }

    saveCustomBrands(customBrands);

    return NextResponse.json({ success: true, brand: newBrand }, { status: 201 });
  } catch (error) {
    console.error('Error creating brand:', error);
    return NextResponse.json({ error: 'Gagal menambahkan merek' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { getAuthSession } = await import('@/lib/auth');
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const role = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const name = searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Parameter nama merek diperlukan' }, { status: 400 });
    }

    const customBrands = getCustomBrands();
    const filtered = customBrands.filter((cb) => cb.name.toLowerCase() !== name.toLowerCase());

    if (filtered.length === customBrands.length) {
      return NextResponse.json(
        { error: 'Merek kustom tidak ditemukan atau merupakan merek bawaan sistem' },
        { status: 404 }
      );
    }

    saveCustomBrands(filtered);

    return NextResponse.json({ success: true, message: `Merek ${name} berhasil dihapus` });
  } catch (error) {
    console.error('Error deleting brand:', error);
    return NextResponse.json({ error: 'Gagal menghapus merek' }, { status: 500 });
  }
}
