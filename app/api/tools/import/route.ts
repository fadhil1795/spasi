import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { type, records } = body; // type: 'catalog' | 'items' | 'biblio' | 'marc'

    if (!Array.isArray(records) || records.length === 0) {
      return NextResponse.json({ error: 'Tidak ada baris data yang valid untuk diimpor' }, { status: 400 });
    }

    // 1. Ambil data master kategori untuk pencocokan pintar
    const allCategories = await prisma.category.findMany({
      include: { parent: true },
    });

    let defaultCategory: (typeof allCategories)[number] | null = allCategories.find((c) => !c.parentId) || null;
    if (!defaultCategory) {
      const created = await prisma.category.create({
        data: { code: 'UMUM', name: 'Umum & Inventaris' },
      });
      defaultCategory = { ...created, parent: null };
    }

    // 2. Ambil data lokasi untuk pencocokan
    const allLocations = await prisma.location.findMany();

    let createdCount = 0;
    let updatedCount = 0;

    for (const item of records) {
      // Ambil nama aset dari berbagai kemungkinan nama kolom Excel
      const name = (
        item['Nama Aset *'] ||
        item['Nama Aset / Sarana'] ||
        item['Nama Barang / Sarana'] ||
        item['Nama Aset'] ||
        item['Nama Barang'] ||
        item.name ||
        item.title ||
        ''
      ).toString().trim();

      if (!name) continue;

      // Pencocokan Kategori & Subkategori
      const inputSubCode = (item['Kode Subkategori'] || item.subCategoryCode || '').toString().trim().toUpperCase();
      const inputCatCode = (item['Kode Kategori *'] || item['Kode Kategori'] || item.categoryCode || '').toString().trim().toUpperCase();
      const inputSubName = (item['Subkategori'] || item.subCategoryName || '').toString().trim().toLowerCase();
      const inputCatName = (item['Kategori Utama'] || item['Kategori'] || item.categoryName || '').toString().trim().toLowerCase();

      let targetCategory: (typeof allCategories)[number] | null = null;

      // A. Coba cari berdasarkan kode subkategori
      if (inputSubCode) {
        targetCategory = allCategories.find((c) => c.code?.toUpperCase() === inputSubCode) || null;
      }

      // B. Jika belum ketemu, coba cari berdasarkan nama subkategori
      if (!targetCategory && inputSubName && inputSubName !== '-') {
        targetCategory = allCategories.find((c) => c.parentId && c.name.toLowerCase() === inputSubName) || null;
      }

      // C. Coba cari berdasarkan kode kategori induk
      if (!targetCategory && inputCatCode) {
        targetCategory = allCategories.find((c) => c.code?.toUpperCase() === inputCatCode) || null;
      }

      // D. Coba cari berdasarkan nama kategori induk
      if (!targetCategory && inputCatName && inputCatName !== '-') {
        targetCategory = allCategories.find((c) => c.name.toLowerCase() === inputCatName) || null;
      }

      // E. Fallback jika tidak ditemukan
      const resolvedCategory = targetCategory || defaultCategory;
      if (!resolvedCategory) continue;

      // Pencocokan atau Pembuatan Lokasi
      const buildingName = (item['Gedung / Lokasi'] || item['Gedung'] || item.building || '').toString().trim();
      const roomName = (item['Ruangan'] || item['Ruang'] || item.room || '').toString().trim();

      let targetLocationId: string | null = null;
      if (buildingName && buildingName !== '-') {
        const foundLoc = allLocations.find(
          (l) =>
            l.building.toLowerCase() === buildingName.toLowerCase() &&
            (!roomName || roomName === '-' || (l.room && l.room.toLowerCase() === roomName.toLowerCase()))
        );

        if (foundLoc) {
          targetLocationId = foundLoc.id;
        } else {
          // Buat lokasi baru jika belum ada
          try {
            const newLoc = await prisma.location.create({
              data: {
                building: buildingName,
                room: roomName && roomName !== '-' ? roomName : null,
                facilities: '[]',
                photos: '[]',
              },
            });
            allLocations.push(newLoc);
            targetLocationId = newLoc.id;
          } catch (e) {
            console.warn('Could not auto-create location:', e);
          }
        }
      }

      // Nilai Merek, Serial, Kondisi, Status
      const brand = (item['Merek / Brand'] || item['Merek'] || item.brand || '').toString().trim() || null;
      const serialNumber = (item['Nomor Seri / Plat'] || item['Nomor Seri'] || item.serialNumber || '').toString().trim() || null;
      const condition = (item['Kondisi (Baik / Rusak Ringan / Rusak Berat)'] || item['Kondisi Fisik'] || item['Kondisi'] || item.condition || 'Baik').toString().trim();
      const status = (item['Status (AVAILABLE / MAINTENANCE)'] || item['Status Operasional'] || item['Status'] || item.status || 'AVAILABLE').toString().trim();
      const description = (item['Keterangan / Spesifikasi'] || item['Keterangan'] || item['Deskripsi'] || item.description || '').toString().trim() || null;

      // Kuantitas & Harga
      const quantityRaw = parseInt(item['Jumlah Unit'] || item['Kuantitas'] || item.quantity || '1', 10);
      const quantity = isNaN(quantityRaw) || quantityRaw < 1 ? 1 : quantityRaw;

      const costRaw = parseFloat((item['Harga Beli / Perolehan (Rp)'] || item['Harga Beli (Rp)'] || item.purchaseCost || '0').toString().replace(/[^0-9.]/g, ''));
      const purchaseCost = isNaN(costRaw) ? null : costRaw;

      const rentRaw = parseFloat((item['Tarif Sewa Harian (Rp)'] || item['Tarif Sewa (Rp)'] || item.dailyRentRate || '0').toString().replace(/[^0-9.]/g, ''));
      const dailyRentRate = isNaN(rentRaw) ? null : rentRaw;

      const isRentable = Boolean(dailyRentRate && dailyRentRate > 0) || item['Dapat Disewa'] === 'Ya';
      const isLoanable = item['Dapat Dipinjam'] !== 'Tidak';

      // Tanggal Perolehan
      let purchaseDate: Date | null = null;
      const dateRaw = item['Tanggal Perolehan (YYYY-MM-DD)'] || item['Tgl Perolehan'] || item.purchaseDate;
      if (dateRaw) {
        const parsedD = new Date(dateRaw);
        if (!isNaN(parsedD.getTime())) {
          purchaseDate = parsedD;
        }
      }

      // Kode Aset
      let code = (item['Kode Aset (Kosongkan utk Auto)'] || item['Kode Tag Aset'] || item['Kode Aset'] || item.code || '').toString().trim();

      if (code) {
        // Cek apakah aset dengan kode ini sudah ada
        const existing = await prisma.asset.findUnique({ where: { code } });
        if (existing) {
          // Update aset yang sudah ada
          await prisma.asset.update({
            where: { code },
            data: {
              name,
              categoryId: resolvedCategory.id,
              locationId: targetLocationId || existing.locationId,
              brand: brand || existing.brand,
              serialNumber: serialNumber || existing.serialNumber,
              condition: condition || existing.condition,
              status: status || existing.status,
              quantity: quantity,
              availableQty: quantity,
              purchaseCost: purchaseCost ?? existing.purchaseCost,
              dailyRentRate: dailyRentRate ?? existing.dailyRentRate,
              isRentable,
              isLoanable,
              description: description || existing.description,
              purchaseDate: purchaseDate || existing.purchaseDate,
            },
          });
          updatedCount++;
          continue;
        }
      } else {
        // Generate kode tag aset terstandarisasi otomatis: [DEPT]-[CAT/SUB]-[YYYY]-[RANDOM]
        const catCode = resolvedCategory.code || 'AST';
        const year = purchaseDate ? purchaseDate.getFullYear() : new Date().getFullYear();
        const randSeq = Math.floor(1000 + Math.random() * 9000);
        code = `SARPRAS-${catCode}-${year}-${randSeq}`;
      }

      // Buat Aset Baru
      await prisma.asset.create({
        data: {
          code,
          name,
          categoryId: resolvedCategory.id,
          locationId: targetLocationId,
          brand,
          serialNumber,
          condition,
          status,
          quantity,
          availableQty: quantity,
          purchaseCost,
          dailyRentRate,
          isRentable,
          isLoanable,
          description,
          purchaseDate,
          images: '[]',
          checklistItems: '[]',
        },
      });
      createdCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Proses impor selesai: ${createdCount} aset baru berhasil dibuat, ${updatedCount} aset berhasil diperbarui.`,
      createdCount,
      updatedCount,
      totalProcessed: createdCount + updatedCount,
    });
  } catch (error) {
    console.error('Import processing error:', error);
    return NextResponse.json({ error: 'Gagal memproses berkas impor data aset' }, { status: 500 });
  }
}
