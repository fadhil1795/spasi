import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const item = await prisma.consumable.findUnique({
      where: { id: params.id },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, building: true, room: true } },
        _count: { select: { transactions: true } },
      },
    });

    if (!item) {
      return NextResponse.json({ error: 'Barang habis pakai tidak ditemukan' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Error fetching consumable detail:', error);
    return NextResponse.json({ error: 'Gagal memuat detail barang habis pakai' }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existing = await prisma.consumable.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Barang habis pakai tidak ditemukan' }, { status: 404 });
    }

    const body = await request.json();
    const { code, name, brand, categoryId, unit, minimumStock, locationId, unitCost } = body;

    if (name !== undefined && name.trim().toLowerCase() !== existing.name.trim().toLowerCase()) {
      const allItems = await prisma.consumable.findMany({
        where: { id: { not: params.id } },
        select: { id: true, code: true, name: true, unit: true, stock: true },
      });
      const dupName = allItems.find(
        (i) => i.name.trim().toLowerCase() === name.trim().toLowerCase()
      );
      if (dupName) {
        return NextResponse.json(
          { error: `Nama barang "${dupName.name}" sudah digunakan (${dupName.code}).` },
          { status: 409 }
        );
      }
    }

    if (code && code.trim() !== existing.code) {
      const dup = await prisma.consumable.findUnique({ where: { code: code.trim() } });
      if (dup) {
        return NextResponse.json({ error: `Kode "${code.trim()}" sudah digunakan barang lain` }, { status: 400 });
      }
    }

    const updated = await prisma.consumable.update({
      where: { id: params.id },
      data: {
        ...(code !== undefined ? { code: code.trim() } : {}),
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(brand !== undefined ? { brand: brand?.trim() || null } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(unit !== undefined ? { unit: unit.trim() } : {}),
        ...(minimumStock !== undefined ? { minimumStock: Math.max(0, parseInt(minimumStock) || 0) } : {}),
        ...(locationId !== undefined ? { locationId: locationId || null } : {}),
        ...(unitCost !== undefined ? { unitCost: unitCost !== '' && unitCost !== null ? parseFloat(unitCost) : null } : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, building: true, room: true } },
        _count: { select: { transactions: true } },
      },
    });

    await recordAuditLog({
      userId: (session.user as any).id,
      action: 'UPDATE_CONSUMABLE',
      entity: 'Consumable',
      entityId: updated.id,
      details: `Memperbarui data barang habis pakai ${updated.name} (${updated.code})`,
      oldData: existing,
      newData: updated,
    });

    if (updated.stock <= updated.minimumStock && updated.minimumStock !== existing.minimumStock) {
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.inAppNotification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: `Peringatan Stok Menipis: ${updated.name}`,
            message: `Stok ${updated.name} (${updated.stock} ${updated.unit}) berada di bawah/sama dengan batas minimum baru (${updated.minimumStock} ${updated.unit}).`,
            type: 'WARNING',
          })),
        });
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating consumable:', error);
    return NextResponse.json({ error: 'Gagal memperbarui barang habis pakai' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Hanya Admin yang dapat menghapus master barang' }, { status: 403 });
    }

    const existing = await prisma.consumable.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: 'Barang habis pakai tidak ditemukan' }, { status: 404 });
    }

    await prisma.consumable.delete({ where: { id: params.id } });

    await recordAuditLog({
      userId: (session.user as any).id,
      action: 'DELETE_CONSUMABLE',
      entity: 'Consumable',
      entityId: existing.id,
      details: `Menghapus master barang habis pakai ${existing.name} (${existing.code})`,
      oldData: existing,
    });

    return NextResponse.json({ message: 'Barang habis pakai berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting consumable:', error);
    return NextResponse.json({ error: 'Gagal menghapus barang habis pakai' }, { status: 500 });
  }
}

