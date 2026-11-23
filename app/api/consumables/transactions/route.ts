import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF', 'APPROVER'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Akses transaksi BHP hanya untuk Staff/Admin' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const consumableId = searchParams.get('consumableId');
    const type = searchParams.get('type'); // IN | OUT
    const month = searchParams.get('month'); // YYYY-MM
    const q = searchParams.get('q')?.trim().toLowerCase();
    const limit = Math.min(parseInt(searchParams.get('limit') || '200'), 500);

    const where: any = {};
    if (consumableId && consumableId !== 'ALL') where.consumableId = consumableId;
    if (type && ['IN', 'OUT'].includes(type)) where.type = type;
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      const [yr, mo] = month.split('-').map(Number);
      const start = new Date(yr, mo - 1, 1);
      const end = new Date(yr, mo, 1);
      where.transactionDate = { gte: start, lt: end };
    }

    const transactions = await prisma.consumableTransaction.findMany({
      where,
      take: limit,
      orderBy: { transactionDate: 'desc' },
      include: {
        consumable: {
          select: { id: true, code: true, name: true, brand: true, unit: true, unitCost: true },
        },
      },
    });

    const userIds = Array.from(
      new Set(transactions.map((t) => t.recordedById).filter(Boolean) as string[])
    );
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const enriched = transactions
      .map((t) => ({
        ...t,
        recordedBy: t.recordedById ? userMap.get(t.recordedById) || null : null,
      }))
      .filter((t) => {
        if (!q) return true;
        return (
          t.consumable?.name?.toLowerCase().includes(q) ||
          t.consumable?.code?.toLowerCase().includes(q) ||
          t.consumable?.brand?.toLowerCase().includes(q) ||
          t.brand?.toLowerCase().includes(q) ||
          t.recipientName?.toLowerCase().includes(q) ||
          t.departmentName?.toLowerCase().includes(q) ||
          t.supplierName?.toLowerCase().includes(q) ||
          t.invoiceNumber?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.recordedBy?.name?.toLowerCase().includes(q)
        );
      });

    return NextResponse.json(enriched);
  } catch (error) {
    console.error('Error fetching consumable transactions:', error);
    return NextResponse.json({ error: 'Gagal memuat riwayat transaksi barang habis pakai' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: Hanya Staff atau Admin yang dapat mencatat transaksi stok BHP' }, { status: 403 });
    }

    const userId = (session.user as any).id;
    const body = await request.json();
    const {
      consumableId,
      items: rawItems,
      type,
      quantity,
      brand,
      transactionDate,
      unitCost,
      totalCost,
      supplierName,
      invoiceNumber,
      receiptUrl,
      recipientName,
      departmentName,
      notes,
    } = body;

    if (!type || !['IN', 'OUT'].includes(type)) {
      return NextResponse.json({ error: 'Tipe transaksi harus IN atau OUT' }, { status: 400 });
    }

    // Normalize single-item or multi-item payload
    const normalizedItems: Array<{
      consumableId: string;
      qty: number;
      brand?: string;
      unitCost?: any;
      totalCost?: any;
    }> = [];

    if (Array.isArray(rawItems) && rawItems.length > 0) {
      for (const it of rawItems) {
        const parsedQty = Number(it.quantity);
        if (!it.consumableId || !Number.isInteger(parsedQty) || parsedQty <= 0) {
          return NextResponse.json({ error: 'Setiap item BHP wajib memiliki ID barang dan jumlah bilangan bulat positif' }, { status: 400 });
        }
        normalizedItems.push({
          consumableId: it.consumableId,
          qty: parsedQty,
          brand: it.brand,
          unitCost: it.unitCost,
          totalCost: it.totalCost,
        });
      }
    } else {
      const parsedQty = Number(quantity);
      if (!consumableId || !Number.isInteger(parsedQty) || parsedQty <= 0) {
        return NextResponse.json({ error: 'ID barang dan jumlah (bilangan bulat > 0) wajib diisi' }, { status: 400 });
      }
      normalizedItems.push({
        consumableId,
        qty: parsedQty,
        brand,
        unitCost,
        totalCost,
      });
    }

    const parsedDate = transactionDate ? new Date(transactionDate) : new Date();
    const effectiveDate = isNaN(parsedDate.getTime()) ? new Date() : parsedDate;

    const result = await prisma.$transaction(async (tx) => {
      const createdEntries: Array<{ trans: any; updatedConsumable: any; prevStock: number }> = [];
      let totalCashOut = 0;

      for (const item of normalizedItems) {
        const consumable = await tx.consumable.findUnique({ where: { id: item.consumableId } });
        if (!consumable) {
          throw new Error(`NOT_FOUND:${item.consumableId}`);
        }

        if (type === 'OUT' && consumable.stock < item.qty) {
          throw new Error(
            `INSUFFICIENT:${consumable.name}:${consumable.stock}:${consumable.unit}:${item.qty}`
          );
        }

        const parsedUnitCost =
          item.unitCost !== undefined && item.unitCost !== null && item.unitCost !== ''
            ? parseFloat(item.unitCost)
            : null;
        const parsedTotalCost =
          item.totalCost !== undefined && item.totalCost !== null && item.totalCost !== ''
            ? parseFloat(item.totalCost)
            : parsedUnitCost !== null
            ? parsedUnitCost * item.qty
            : null;

        if (type === 'IN' && parsedTotalCost && parsedTotalCost > 0) {
          totalCashOut += parsedTotalCost;
        }

        const newStock = type === 'IN' ? consumable.stock + item.qty : consumable.stock - item.qty;
        const effectiveBrand = item.brand?.trim() || consumable.brand || null;

        const trans = await tx.consumableTransaction.create({
          data: {
            consumableId: item.consumableId,
            type,
            quantity: item.qty,
            brand: effectiveBrand,
            unitCost: type === 'IN' ? parsedUnitCost : null,
            totalCost: type === 'IN' ? parsedTotalCost : null,
            supplierName: type === 'IN' ? (supplierName || null) : null,
            invoiceNumber: type === 'IN' ? (invoiceNumber || null) : null,
            receiptUrl: type === 'IN' ? (receiptUrl || null) : null,
            recipientName: recipientName || null,
            departmentName: departmentName || null,
            notes: notes || null,
            transactionDate: effectiveDate,
            recordedById: userId,
          },
        });

        const updatedConsumable = await tx.consumable.update({
          where: { id: item.consumableId },
          data: {
            stock: newStock,
            ...(type === 'IN' && parsedUnitCost !== null ? { unitCost: parsedUnitCost } : {}),
            ...(type === 'IN' && item.brand?.trim() ? { brand: item.brand.trim() } : {}),
          },
        });

        if (newStock <= consumable.minimumStock) {
          const admins = await tx.user.findMany({
            where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
            select: { id: true },
          });
          if (admins.length > 0) {
            await tx.inAppNotification.createMany({
              data: admins.map((admin) => ({
                userId: admin.id,
                title: `Peringatan Stok Menipis: ${consumable.name}`,
                message: `Sisa stok ${consumable.name} tersisa ${newStock} ${consumable.unit} (Di bawah batas minimum ${consumable.minimumStock} ${consumable.unit}). Segera lakukan pengadaan kembali.`,
                type: 'WARNING',
              })),
            });
          }
        }

        createdEntries.push({ trans, updatedConsumable, prevStock: consumable.stock });
      }

      // Catat Kas Keluar otomatis untuk restock BHP berbiaya
      if (type === 'IN' && totalCashOut > 0) {
        const itemLabels = createdEntries.map((e) => `${e.updatedConsumable.name} (${e.trans.quantity} ${e.updatedConsumable.unit})`).join(', ');
        await tx.cashTransaction.create({
          data: {
            type: 'OUT',
            category: 'PROCUREMENT',
            amount: totalCashOut,
            referenceId: invoiceNumber || createdEntries[0].trans.id,
            description: `Pembelian / Restock BHP: ${itemLabels}${supplierName ? ` • Supplier: ${supplierName}` : ''}`,
          },
        });
      }

      return createdEntries;
    });

    const summaryDetails = result
      .map(
        (e) =>
          `${e.updatedConsumable.name} (${e.updatedConsumable.code}): ${e.trans.quantity} ${e.updatedConsumable.unit}`
      )
      .join(', ');

    await recordAuditLog({
      userId,
      action: type === 'IN' ? 'CONSUMABLE_IN' : 'CONSUMABLE_OUT',
      entity: 'Consumable',
      entityId: result.map((e) => e.updatedConsumable.id).join(','),
      details: `${type === 'IN' ? 'Restock / Barang Masuk' : 'Pengeluaran Barang'} ${summaryDetails}${recipientName ? ` untuk ${recipientName}` : ''}${departmentName ? ` (${departmentName})` : ''}`,
      newData: {
        type,
        count: result.length,
        recipientName: recipientName || null,
        departmentName: departmentName || null,
        notes: notes || null,
      },
    });

    const first = result[0];
    return NextResponse.json(
      {
        message:
          result.length > 1
            ? `${result.length} transaksi stok BHP berhasil dicatat.`
            : `Transaksi stok berhasil dicatat. Sisa stok ${first.updatedConsumable.name}: ${first.updatedConsumable.stock} ${first.updatedConsumable.unit}`,
        data: first,
        items: result,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error?.message?.startsWith('NOT_FOUND:')) {
      return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });
    }
    if (error?.message?.startsWith('INSUFFICIENT:')) {
      const [, name, stock, unit, reqQty] = error.message.split(':');
      return NextResponse.json(
        { error: `Stok ${name} tidak mencukupi. Stok saat ini: ${stock} ${unit}, permintaan: ${reqQty} ${unit}` },
        { status: 400 }
      );
    }
    console.error('Error recording consumable transaction:', error);
    return NextResponse.json({ error: 'Gagal mencatat transaksi stok' }, { status: 500 });
  }
}
