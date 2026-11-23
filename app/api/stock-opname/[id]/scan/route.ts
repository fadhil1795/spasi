import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const { code, condition = 'Baik', notes } = body;

    if (!code || !code.trim()) {
      return NextResponse.json({ error: 'Kode aset atau hasil scan QR wajib diisi' }, { status: 400 });
    }

    const cleanCode = code.trim();
    const db = prisma as any;

    // 1. Validate Opname Session
    const opnameSession = await db.stockOpnameSession.findUnique({
      where: { id: params.id },
      include: { location: true },
    });

    if (!opnameSession) {
      return NextResponse.json({ error: 'Sesi Stock Opname tidak ditemukan' }, { status: 404 });
    }

    if (opnameSession.status === 'COMPLETED' || opnameSession.status === 'CANCELLED') {
      return NextResponse.json({ error: `Sesi opname telah ${opnameSession.status.toLowerCase()}` }, { status: 400 });
    }

    // 2. Find Asset by Code or QR Token or URL ID
    let targetAsset = await prisma.asset.findFirst({
      where: {
        OR: [
          { code: cleanCode },
          { qrToken: cleanCode },
          { id: cleanCode },
        ],
      },
      include: {
        location: true,
        category: true,
      },
    });

    // Support scanned full URLs (e.g. https://domain.com/assets/cuid...)
    if (!targetAsset && cleanCode.includes('/assets/')) {
      const extractedId = cleanCode.split('/assets/')[1]?.split('?')[0];
      if (extractedId) {
        targetAsset = await prisma.asset.findUnique({
          where: { id: extractedId },
          include: { location: true, category: true },
        });
      }
    }

    if (!targetAsset) {
      return NextResponse.json({
        error: `Aset dengan kode atau identitas "${cleanCode}" tidak terdaftar di sistem master`,
        scanResult: 'NOT_FOUND',
      }, { status: 404 });
    }

    const isSameLocation = targetAsset.locationId === opnameSession.locationId;
    const scanStatus = isSameLocation ? 'MATCH' : 'WRONG_LOCATION';

    // 3. Update or Create StockOpnameItem inside transaction
    const result = await (prisma as any).$transaction(async (tx: any) => {
      let item = await tx.stockOpnameItem.findFirst({
        where: {
          sessionId: opnameSession.id,
          assetId: targetAsset.id,
        },
      });

      if (item) {
        // Update existing item
        item = await tx.stockOpnameItem.update({
          where: { id: item.id },
          data: {
            scanStatus,
            actualLocationId: opnameSession.locationId,
            conditionAfter: condition,
            scannedAt: new Date(),
            scannedById: userId,
            notes: notes || item.notes,
          },
        });
      } else {
        // Aset ditemukan di ruangan ini padahal terdaftar di ruangan lain
        item = await tx.stockOpnameItem.create({
          data: {
            sessionId: opnameSession.id,
            assetId: targetAsset.id,
            expectedLocationId: targetAsset.locationId,
            actualLocationId: opnameSession.locationId,
            scanStatus: 'WRONG_LOCATION',
            conditionBefore: targetAsset.condition || 'Baik',
            conditionAfter: condition,
            scannedAt: new Date(),
            scannedById: userId,
            notes: notes || `Ditemukan di ${opnameSession.location.name || opnameSession.location.building}`,
          },
        });
      }

      // Recalculate summary stats for the session
      const allItems = await tx.stockOpnameItem.findMany({
        where: { sessionId: opnameSession.id },
      });

      const totalScanned = allItems.filter((i: any) => i.scannedAt !== null).length;
      const totalMatch = allItems.filter((i: any) => i.scanStatus === 'MATCH').length;
      const totalWrongLoc = allItems.filter((i: any) => i.scanStatus === 'WRONG_LOCATION').length;
      const totalMissing = allItems.filter((i: any) => i.scanStatus === 'MISSING').length;
      const totalDamaged = allItems.filter((i: any) => i.conditionAfter === 'Rusak Berat' || i.conditionAfter === 'Rusak Ringan').length;

      await tx.stockOpnameSession.update({
        where: { id: opnameSession.id },
        data: {
          totalScanned,
          totalMatch,
          totalWrongLoc,
          totalMissing,
          totalDamaged,
        },
      });

      return item;
    });

    return NextResponse.json({
      scanResult: scanStatus,
      message:
        scanStatus === 'MATCH'
          ? `Aset Cocok: "${targetAsset.name}" terverifikasi berada di ruangan ini.`
          : `Aset Salah Kamar: "${targetAsset.name}" seharusnya berada di ${targetAsset.location?.name || targetAsset.location?.building || 'Gudang Lain'}.`,
      asset: {
        id: targetAsset.id,
        code: targetAsset.code,
        name: targetAsset.name,
        brand: targetAsset.brand,
        serialNumber: targetAsset.serialNumber,
        category: targetAsset.category?.name,
        expectedLocation: targetAsset.location
          ? `${targetAsset.location.name || targetAsset.location.building} (Lt. ${targetAsset.location.floor || '1'} ${targetAsset.location.room || ''})`
          : 'Belum Ada Lokasi',
      },
      item: result,
    });
  } catch (error) {
    console.error('Error in stock opname scan:', error);
    return NextResponse.json({ error: 'Gagal memproses pemindaian aset' }, { status: 500 });
  }
}
