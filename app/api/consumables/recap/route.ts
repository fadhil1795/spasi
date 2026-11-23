import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/consumables/recap?month=YYYY-MM
 * Menghitung Rekap Mutasi Bulanan (Saldo Awal, Masuk, Keluar, Saldo Akhir)
 * secara akurat dengan menarik sisa stok dari transaksi bulan-bulan sebelumnya.
 */
export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthParam = searchParams.get('month') || defaultMonth;

    if (!/^\d{4}-\d{2}$/.test(monthParam)) {
      return NextResponse.json({ error: 'Format bulan harus YYYY-MM' }, { status: 400 });
    }

    const [yr, mo] = monthParam.split('-').map(Number);
    const monthStart = new Date(yr, mo - 1, 1);
    const monthEnd = new Date(yr, mo, 1);

    const [items, txSinceStart] = await Promise.all([
      prisma.consumable.findMany({
        include: {
          category: { select: { id: true, name: true } },
          location: { select: { id: true, name: true, building: true } },
        },
        orderBy: { name: 'asc' },
      }),
      prisma.consumableTransaction.findMany({
        where: { transactionDate: { gte: monthStart } },
        select: {
          consumableId: true,
          type: true,
          quantity: true,
          totalCost: true,
          unitCost: true,
          transactionDate: true,
        },
      }),
    ]);

    const grouped = new Map<
      string,
      { netSinceStart: number; inMonth: number; outMonth: number; spendMonth: number }
    >();

    for (const t of txSinceStart) {
      const acc = grouped.get(t.consumableId) || {
        netSinceStart: 0,
        inMonth: 0,
        outMonth: 0,
        spendMonth: 0,
      };
      const signed = t.type === 'IN' ? t.quantity : -t.quantity;
      acc.netSinceStart += signed;

      if (t.transactionDate >= monthStart && t.transactionDate < monthEnd) {
        if (t.type === 'IN') {
          acc.inMonth += t.quantity;
          const cost =
            t.totalCost ?? (t.unitCost ? t.unitCost * t.quantity : 0);
          acc.spendMonth += cost || 0;
        } else {
          acc.outMonth += t.quantity;
        }
      }
      grouped.set(t.consumableId, acc);
    }

    const rows = items.map((item) => {
      const stat = grouped.get(item.id) || {
        netSinceStart: 0,
        inMonth: 0,
        outMonth: 0,
        spendMonth: 0,
      };
      // Saldo awal bulan = stok saat ini - seluruh mutasi netto sejak awal bulan tsb hingga sekarang
      const openingStock = Math.max(0, item.stock - stat.netSinceStart);
      const closingStock = Math.max(0, openingStock + stat.inMonth - stat.outMonth);
      const closingValue = closingStock * (item.unitCost || 0);

      return {
        id: item.id,
        code: item.code,
        name: item.name,
        brand: item.brand,
        unit: item.unit,
        categoryName: item.category?.name || 'Umum',
        locationName: item.location?.name || item.location?.building || 'Gudang Pusat ATK',
        unitCost: item.unitCost || 0,
        minimumStock: item.minimumStock,
        openingStock,
        inQty: stat.inMonth,
        outQty: stat.outMonth,
        closingStock,
        spendMonth: stat.spendMonth,
        closingValue,
      };
    });

    const summary = rows.reduce(
      (acc, r) => ({
        totalOpening: acc.totalOpening + r.openingStock,
        totalIn: acc.totalIn + r.inQty,
        totalOut: acc.totalOut + r.outQty,
        totalClosing: acc.totalClosing + r.closingStock,
        totalSpend: acc.totalSpend + r.spendMonth,
        totalClosingValue: acc.totalClosingValue + r.closingValue,
      }),
      {
        totalOpening: 0,
        totalIn: 0,
        totalOut: 0,
        totalClosing: 0,
        totalSpend: 0,
        totalClosingValue: 0,
      }
    );

    return NextResponse.json({
      month: monthParam,
      summary,
      rows,
    });
  } catch (error) {
    console.error('Error computing monthly consumable recap:', error);
    return NextResponse.json(
      { error: 'Gagal menghitung rekap bulanan barang habis pakai' },
      { status: 500 }
    );
  }
}

