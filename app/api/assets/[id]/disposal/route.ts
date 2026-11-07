import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Hanya Administrator yang memiliki wewenang penghapusan aset' }, { status: 403 });
    }

    const body = await request.json();
    const { disposalReason, salvageValue, disposalDocUrl, notes } = body;

    if (!disposalReason || !disposalReason.trim()) {
      return NextResponse.json({ error: 'Alasan penghapusan / pemutihan aset wajib diisi' }, { status: 400 });
    }

    const asset = await prisma.asset.findUnique({
      where: { id: params.id },
    });

    if (!asset) {
      return NextResponse.json({ error: 'Aset tidak ditemukan' }, { status: 404 });
    }

    if (asset.status === 'BORROWED' || asset.status === 'RENTED') {
      return NextResponse.json({ error: 'Aset sedang aktif dipinjam atau disewa, tidak dapat dihapuskan saat ini' }, { status: 400 });
    }

    const updated = await prisma.asset.update({
      where: { id: params.id },
      data: {
        status: 'DISPOSED',
        condition: 'Rusak Berat',
        salvageValue: salvageValue ? parseFloat(salvageValue) : 0,
        disposalReason: disposalReason.trim(),
        disposalDocUrl: disposalDocUrl || null,
        isLoanable: false,
        isRentable: false,
        availableQty: 0,
      },
    });

    // Catat ke Log Aktivitas
    await prisma.activityLog.create({
      data: {
        userId: (session.user as any).id,
        action: 'DISPOSE_ASSET',
        details: `Penghapusan aset ${asset.code} (${asset.name}). Alasan: ${disposalReason}. Nilai sisa: Rp ${salvageValue || 0}`,
      },
    });

    return NextResponse.json({
      message: `Aset ${asset.code} berhasil diafkirkan / dihapus dari inventaris aktif`,
      asset: updated,
    });
  } catch (error) {
    console.error('Error in asset disposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
