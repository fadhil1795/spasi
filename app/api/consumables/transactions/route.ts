import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await request.json();
    const { consumableId, type, quantity, recipientName, departmentName, notes } = body;

    if (!consumableId || !type || !quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Data transaksi barang habis pakai tidak lengkap' }, { status: 400 });
    }

    const consumable = await prisma.consumable.findUnique({
      where: { id: consumableId },
    });

    if (!consumable) {
      return NextResponse.json({ error: 'Barang tidak ditemukan' }, { status: 404 });
    }

    const qty = parseInt(quantity);

    if (type === 'OUT' && consumable.stock < qty) {
      return NextResponse.json(
        { error: `Stok tidak mencukupi. Stok saat ini: ${consumable.stock} ${consumable.unit}, permintaan: ${qty} ${consumable.unit}` },
        { status: 400 }
      );
    }

    const newStock = type === 'IN' ? consumable.stock + qty : consumable.stock - qty;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create transaction record
      const trans = await tx.consumableTransaction.create({
        data: {
          consumableId,
          type,
          quantity: qty,
          recipientName: recipientName || null,
          departmentName: departmentName || null,
          notes: notes || null,
          recordedById: userId,
        },
      });

      // 2. Update consumable stock
      const updatedConsumable = await tx.consumable.update({
        where: { id: consumableId },
        data: { stock: newStock },
      });

      // 3. Trigger Low Stock Notification if below or at threshold
      if (newStock <= consumable.minimumStock) {
        // Find Admins to notify
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

      return { trans, updatedConsumable };
    });

    return NextResponse.json({
      message: `Transaksi stok berhasil dicatat. Sisa stok ${consumable.name}: ${newStock} ${consumable.unit}`,
      data: result,
    }, { status: 201 });
  } catch (error) {
    console.error('Error recording consumable transaction:', error);
    return NextResponse.json({ error: 'Gagal mencatat transaksi stok' }, { status: 500 });
  }
}
