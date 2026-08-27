import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SPASI database...');

  // Password hashes
  const adminPassword = await bcrypt.hash('Admin@123', 10);
  const kepalaPassword = await bcrypt.hash('Kepala@123', 10);
  const staffPassword = await bcrypt.hash('Staff@123', 10);
  const userPassword = await bcrypt.hash('User@123', 10);

  // 1. Departments
  const deptIT = await prisma.department.upsert({
    where: { code: 'DEPT-IT' },
    update: {},
    create: {
      name: 'Teknologi Informasi',
      code: 'DEPT-IT',
    },
  });

  const deptUmum = await prisma.department.upsert({
    where: { code: 'DEPT-UMUM' },
    update: {},
    create: {
      name: 'Umum & Sarana Prasarana',
      code: 'DEPT-UMUM',
    },
  });

  // 2. Users
  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@spasi.app' },
    update: {},
    create: {
      name: 'Super Administrator',
      email: 'admin@spasi.app',
      password: adminPassword,
      role: 'SUPER_ADMIN',
      phone: '081234567890',
      identityNo: 'NIP-19900101-001',
      departmentId: deptIT.id,
    },
  });

  const adminAset = await prisma.user.upsert({
    where: { email: 'aset@spasi.app' },
    update: {},
    create: {
      name: 'Admin Aset Utama',
      email: 'aset@spasi.app',
      password: adminPassword,
      role: 'ADMIN',
      phone: '081234567891',
      identityNo: 'NIP-19900102-002',
      departmentId: deptUmum.id,
    },
  });

  const kepalaUnit = await prisma.user.upsert({
    where: { email: 'kepala@spasi.app' },
    update: {},
    create: {
      name: 'Drs. H. Mulyadi, M.Si',
      email: 'kepala@spasi.app',
      password: kepalaPassword,
      role: 'APPROVER',
      phone: '081234567892',
      identityNo: 'NIP-19850315-003',
      departmentId: deptIT.id,
    },
  });

  // Update department head
  await prisma.department.update({
    where: { id: deptIT.id },
    data: { headId: kepalaUnit.id },
  });

  const staffField = await prisma.user.upsert({
    where: { email: 'staff@spasi.app' },
    update: {},
    create: {
      name: 'Budi Kurniawan (Staff Petugas)',
      email: 'staff@spasi.app',
      password: staffPassword,
      role: 'STAFF',
      phone: '081234567893',
      identityNo: 'NIP-19950620-004',
      departmentId: deptUmum.id,
    },
  });

  const userDemo = await prisma.user.upsert({
    where: { email: 'user@spasi.app' },
    update: {},
    create: {
      name: 'Siti Aminah (Peminjam)',
      email: 'user@spasi.app',
      password: userPassword,
      role: 'BORROWER',
      phone: '081234567894',
      identityNo: 'NIM-2024001',
      departmentId: deptIT.id,
    },
  });

  // 3. Categories
  const catElektronik = await prisma.category.upsert({
    where: { name: 'Elektronik & Multimedia' },
    update: {},
    create: { name: 'Elektronik & Multimedia', depreciationRate: 20, usefulLifeYears: 5 },
  });
  const catKendaraan = await prisma.category.upsert({
    where: { name: 'Kendaraan Operasional' },
    update: {},
    create: { name: 'Kendaraan Operasional', depreciationRate: 15, usefulLifeYears: 7 },
  });
  const catRuangan = await prisma.category.upsert({
    where: { name: 'Ruangan & Aula' },
    update: {},
    create: { name: 'Ruangan & Aula', depreciationRate: 5, usefulLifeYears: 20 },
  });
  const catPeralatan = await prisma.category.upsert({
    where: { name: 'Peralatan & Sound System' },
    update: {},
    create: { name: 'Peralatan & Sound System', depreciationRate: 15, usefulLifeYears: 5 },
  });
  const catFurnitur = await prisma.category.upsert({
    where: { name: 'Furnitur & Meubel' },
    update: {},
    create: { name: 'Furnitur & Meubel', depreciationRate: 10, usefulLifeYears: 10 },
  });

  // 4. Locations (Ruangan Sewa)
  const locGedungA = await prisma.location.upsert({
    where: { id: 'loc-gedung-a-001' },
    update: {
      code: 'R-201',
      name: 'Ruang Rapat Executive',
      pricePerHour: 100000,
      pricePerDay: 750000,
      depositAmount: 200000,
      description: 'Ruang rapat premium ber-AC dilengkapi Smart TV 65", meja rapat kapasitas 12 orang, whiteboard, dan koneksi WiFi berkecepatan tinggi. Cocok untuk rapat internal, presentasi klien, dan diskusi tim.',
      status: 'AVAILABLE',
    },
    create: {
      id: 'loc-gedung-a-001',
      code: 'R-201',
      name: 'Ruang Rapat Executive',
      building: 'Gedung Utama (A)',
      floor: 'Lantai 2',
      room: 'Ruang Rapat 201',
      area: 80,
      capacity: 12,
      price: 750000,
      pricePerHour: 100000,
      pricePerDay: 750000,
      depositAmount: 200000,
      description: 'Ruang rapat premium ber-AC dilengkapi Smart TV 65", meja rapat kapasitas 12 orang, whiteboard, dan koneksi WiFi berkecepatan tinggi. Cocok untuk rapat internal, presentasi klien, dan diskusi tim.',
      status: 'AVAILABLE',
      facilities: JSON.stringify(['AC', 'Smart TV', 'WiFi', 'Whiteboard', 'Proyektor']),
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=800&auto=format&fit=crop',
      ]),
    },
  });

  const locGedungB = await prisma.location.upsert({
    where: { id: 'loc-gedung-b-001' },
    update: {
      code: 'AULA-B101',
      name: 'Aula Serbaguna Srikandi',
      pricePerHour: 250000,
      pricePerDay: 1500000,
      depositAmount: 500000,
      description: 'Aula serbaguna berkapasitas 150 orang dengan panggung, sound system profesional, layar proyeksi besar, dan AC sentral. Ideal untuk seminar, pelatihan, wisuda, dan acara besar instansi.',
      status: 'AVAILABLE',
    },
    create: {
      id: 'loc-gedung-b-001',
      code: 'AULA-B101',
      name: 'Aula Serbaguna Srikandi',
      building: 'Gedung Pelatihan (B)',
      floor: 'Lantai 1',
      room: 'Aula B101',
      area: 250,
      capacity: 150,
      price: 1500000,
      pricePerHour: 250000,
      pricePerDay: 1500000,
      depositAmount: 500000,
      description: 'Aula serbaguna berkapasitas 150 orang dengan panggung, sound system profesional, layar proyeksi besar, dan AC sentral. Ideal untuk seminar, pelatihan, wisuda, dan acara besar instansi.',
      status: 'AVAILABLE',
      facilities: JSON.stringify(['AC', 'Sound System', 'Proyektor', 'Panggung', 'WiFi', 'Mic Wireless']),
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=800&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1534410248094-8796f7ab02f9?w=800&auto=format&fit=crop',
      ]),
    },
  });

  const locGudang = await prisma.location.upsert({
    where: { id: 'loc-gudang-c-001' },
    update: {
      code: 'GDG-C01',
      name: 'Gudang Inventaris Utama',
      status: 'AVAILABLE',
    },
    create: {
      id: 'loc-gudang-c-001',
      code: 'GDG-C01',
      name: 'Gudang Inventaris Utama',
      building: 'Gedung Sarpras (C)',
      floor: 'Lantai 1',
      room: 'Gudang C02',
      area: 80,
      capacity: 20,
      price: 0,
      status: 'AVAILABLE',
      facilities: JSON.stringify(['Rak Penyimpanan', 'Sistem Keamanan']),
      photos: JSON.stringify([]),
    },
  });

  const locStudio = await prisma.location.upsert({
    where: { id: 'loc-studio-001' },
    update: {
      code: 'STUDIO-A',
      name: 'Studio Podcast & Recording A',
      pricePerHour: 75000,
      pricePerDay: 500000,
      depositAmount: 150000,
      description: 'Studio rekaman kedap suara dengan perlengkapan audio profesional: mixer, condenser mic, interface audio, dan monitor speaker. Ideal untuk podcast, voice over, rekaman musik, dan produksi konten audio.',
      status: 'AVAILABLE',
    },
    create: {
      id: 'loc-studio-001',
      code: 'STUDIO-A',
      name: 'Studio Podcast & Recording A',
      building: 'Gedung Utama (A)',
      floor: 'Lantai 1',
      room: 'Studio A105',
      area: 30,
      capacity: 8,
      price: 500000,
      pricePerHour: 75000,
      pricePerDay: 500000,
      depositAmount: 150000,
      description: 'Studio rekaman kedap suara dengan perlengkapan audio profesional: mixer, condenser mic, interface audio, dan monitor speaker. Ideal untuk podcast, voice over, rekaman musik, dan produksi konten audio.',
      status: 'AVAILABLE',
      facilities: JSON.stringify(['AC', 'Sound System', 'Mic Wireless', 'WiFi', 'Monitor Speaker']),
      photos: JSON.stringify([
        'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop',
      ]),
    },
  });


  // 5. Assets
  const assetsData = [
    {
      code: 'AST-2026-0001',
      name: 'Proyektor Epson EB-X51 High-Lumen',
      description: 'Proyektor 3800 Lumens HDMI VGA resolusi XGA cocok untuk rapat & presentasi besar',
      categoryId: catElektronik.id,
      locationId: locGedungA.id,
      departmentId: deptIT.id,
      status: 'AVAILABLE',
      condition: 'Baik',
      purchaseDate: new Date('2024-02-15'),
      purchaseCost: 8500000,
      currentValue: 6800000,
      brand: 'Epson',
      serialNumber: 'EP-X51-99882',
      images: JSON.stringify(['https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=600&auto=format&fit=crop']),
      checklistItems: JSON.stringify(['Body Proyektor', 'Remote Control', 'Kabel HDMI', 'Kabel Power', 'Tas Carrying Case']),
      qrToken: 'qr-token-ast-0001',
      dailyRentRate: 150000,
      sessionRentRate: 100000,
      isRentable: true,
      isLoanable: true,
      isFixedToRoom: false,
    },
    {
      code: 'AST-2026-0002',
      name: 'Laptop HP ProBook 440 G8 i7 16GB',
      description: 'Laptop operasional Intel Core i7 SSD 512GB siap untuk tugas kerja & pelatihan',
      categoryId: catElektronik.id,
      locationId: locGedungA.id,
      departmentId: deptIT.id,
      status: 'AVAILABLE',
      condition: 'Baik',
      purchaseDate: new Date('2023-11-10'),
      purchaseCost: 14500000,
      currentValue: 10150000,
      brand: 'HP',
      serialNumber: '5CD1234XYZ',
      images: JSON.stringify(['https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=600&auto=format&fit=crop']),
      checklistItems: JSON.stringify(['Unit Laptop', 'Charger Adaptor', 'Mouse Wireless', 'Tas Laptop']),
      qrToken: 'qr-token-ast-0002',
      dailyRentRate: 200000,
      sessionRentRate: 150000,
      isRentable: true,
      isLoanable: true,
      isFixedToRoom: false,
    },
    {
      code: 'AST-2026-0003',
      name: 'Kamera Mirrorless Sony Alpha A6400 Kit',
      description: 'Kamera dokumentasi video 4K + Lensa 16-50mm cocok untuk acara & liputan instansi',
      categoryId: catElektronik.id,
      locationId: locGedungA.id,
      departmentId: deptUmum.id,
      status: 'AVAILABLE',
      condition: 'Baik',
      purchaseDate: new Date('2024-01-20'),
      purchaseCost: 13800000,
      currentValue: 11040000,
      brand: 'Sony',
      serialNumber: 'SN-A6400-8832',
      images: JSON.stringify(['https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop']),
      checklistItems: JSON.stringify(['Body Kamera', 'Lensa Kit 16-50mm', '2x Baterai', 'Charger', 'Kartu Memori 64GB', 'Tas Kamera']),
      qrToken: 'qr-token-ast-0003',
      dailyRentRate: 250000,
      sessionRentRate: 200000,
      isRentable: true,
      isLoanable: true,
      isFixedToRoom: false,
    },
    {
      code: 'AST-2026-0004',
      name: 'Toyota HiAce Commuter 16 Seat',
      description: 'Kendaraan minibus operasional rombongan AC double blower full karpet nyaman',
      categoryId: catKendaraan.id,
      locationId: locGudang.id,
      departmentId: deptUmum.id,
      status: 'AVAILABLE',
      condition: 'Baik',
      purchaseDate: new Date('2022-05-12'),
      purchaseCost: 550000000,
      currentValue: 412500000,
      brand: 'Toyota',
      serialNumber: 'B-7042-PUP',
      images: JSON.stringify(['https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=600&auto=format&fit=crop']),
      checklistItems: JSON.stringify(['STNK', 'SIM Pengemudi', 'P3K Box', 'Ban Cadangan', 'Dongkrak']),
      qrToken: 'qr-token-ast-0004',
      dailyRentRate: 750000,
      sessionRentRate: null,
      isRentable: true,
      isLoanable: true,
      isFixedToRoom: false,
    },
    {
      code: 'AST-2026-0005',
      name: 'Aula Utama Serbaguna B101 (Kapasitas 150 Orang)',
      description: 'Ruang aula ber-AC dilengkapi Sound System, Panggung, Layar LCD, dan Meja Rapat',
      categoryId: catRuangan.id,
      locationId: locGedungB.id,
      departmentId: deptUmum.id,
      status: 'AVAILABLE',
      condition: 'Sangat Baik',
      purchaseDate: new Date('2020-01-01'),
      purchaseCost: 800000000,
      currentValue: 700000000,
      brand: 'BPSDM PU',
      serialNumber: 'ROOM-B101',
      images: JSON.stringify(['https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop']),
      checklistItems: JSON.stringify(['AC Unit', 'Sound System', 'Mic Wireless x2', 'Layar LCD', 'Panggung', 'Kursi 150pcs']),
      qrToken: 'qr-token-ast-0005',
      dailyRentRate: 1500000,
      sessionRentRate: null,
      isRentable: true,
      isLoanable: true,
      isFixedToRoom: true,
    },
    {
      code: 'AST-2026-0006',
      name: 'Portable Sound System Wireless JBL EON ONE',
      description: 'Speaker portable 500W Bluetooth + 2 Mic Wireless untuk acara outdoor & indoor',
      categoryId: catPeralatan.id,
      locationId: locGudang.id,
      departmentId: deptUmum.id,
      status: 'AVAILABLE',
      condition: 'Baik',
      purchaseDate: new Date('2023-08-14'),
      purchaseCost: 16500000,
      currentValue: 13200000,
      brand: 'JBL',
      serialNumber: 'JBL-EON-9901',
      images: JSON.stringify(['https://images.unsplash.com/photo-1545454675-3531b543be5d?w=600&auto=format&fit=crop']),
      checklistItems: JSON.stringify(['Speaker Unit', 'Mic Wireless x2', 'Kabel Power', 'Tripod Stand', 'Tas Carrying']),
      qrToken: 'qr-token-ast-0006',
      dailyRentRate: 300000,
      sessionRentRate: 200000,
      isRentable: true,
      isLoanable: true,
      isFixedToRoom: false,
    },
  ];


  for (const assetData of assetsData) {
    await prisma.asset.upsert({
      where: { code: assetData.code },
      update: {},
      create: assetData,
    });
  }

  console.log('Seeding SPASI database completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding DB:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
