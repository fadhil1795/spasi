import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const lowStockOnly = searchParams.get('lowStock') === 'true';

    const items = await prisma.consumable.findMany({
      include: {
        category: { select: { id: true, name: true } },
        location: { select: { id: true, name: true, building: true, room: true } },
        _count: { select: { transactions: true } },
      },
      orderBy: { name: 'asc' },
    });

    const result = lowStockOnly
      ? items.filter((item) => item.stock <= item.minimumStock)
      : items;

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching consumables:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { code, name, brand, categoryId, unit, stock = 0, minimumStock = 5, locationId, unitCost } = body;

    if (!name || !unit) {
      return NextResponse.json({ error: 'Nama barang dan satuan wajib diisi' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const normalizedName = trimmedName.toLowerCase();
    const trimmedCode = code?.trim();

    // Pengecekan duplikasi nama (case-insensitive) & kode
    const allExisting = await prisma.consumable.findMany({
      select: { id: true, code: true, name: true, brand: true, unit: true, stock: true, minimumStock: true },
    });
    const dupByName = allExisting.find(
      (item) => item.name.trim().toLowerCase() === normalizedName
    );
    if (dupByName) {
      return NextResponse.json(
        {
          error: `Barang "${dupByName.name}" sudah terdaftar (${dupByName.code}). Gunakan menu Mutasi Masuk untuk menambah stok fisik.`,
          duplicateItem: dupByName,
        },
        { status: 409 }
      );
    }

    if (trimmedCode) {
      const dupByCode = allExisting.find(
        (item) => item.code.trim().toLowerCase() === trimmedCode.toLowerCase()
      );
      if (dupByCode) {
        return NextResponse.json(
          {
            error: `Kode "${trimmedCode}" sudah digunakan oleh "${dupByCode.name}".`,
            duplicateItem: dupByCode,
          },
          { status: 409 }
        );
      }
    }

    const autoCode =
      trimmedCode ||
      `ATK-${Math.floor(100 + Math.random() * 900)}`;

    const initialQty = parseInt(stock) || 0;
    const minQty = parseInt(minimumStock) || 5;
    const parsedUnitCost = unitCost ? parseFloat(unitCost) : null;

    const consumable = await prisma.$transaction(async (tx) => {
      const created = await tx.consumable.create({
        data: {
          code: autoCode,
          name: trimmedName,
          brand: brand?.trim() || null,
          categoryId: categoryId || null,
          unit: unit.trim(),
          stock: initialQty,
          minimumStock: minQty,
          locationId: locationId || null,
          unitCost: parsedUnitCost,
        },
        include: {
          category: true,
          location: true,
        },
      });

      if (initialQty > 0) {
        await tx.consumableTransaction.create({
          data: {
            consumableId: created.id,
            type: 'IN',
            quantity: initialQty,
            brand: created.brand,
            unitCost: parsedUnitCost,
            totalCost: parsedUnitCost ? parsedUnitCost * initialQty : null,
            notes: 'Stok awal pendataan master barang',
            recordedById: (session.user as any).id,
          },
        });
      }

      if (initialQty <= minQty) {
        const admins = await tx.user.findMany({
          where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
          select: { id: true },
        });
        if (admins.length > 0) {
          await tx.inAppNotification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              title: `Peringatan Stok Menipis: ${created.name}`,
              message: `Stok awal ${created.name} (${initialQty} ${created.unit}) berada di bawah/sama dengan batas minimum (${minQty} ${created.unit}).`,
              type: 'WARNING',
            })),
          });
        }
      }

      return created;
    });

    await recordAuditLog({
      userId: (session.user as any).id,
      action: 'CREATE_CONSUMABLE',
      entity: 'Consumable',
      entityId: consumable.id,
      details: `Mendaftarkan barang habis pakai baru ${consumable.name} (${consumable.code}) dengan stok awal ${consumable.stock} ${consumable.unit}`,
      newData: consumable,
    });

    return NextResponse.json(consumable, { status: 201 });
  } catch (error) {
    console.error('Error creating consumable:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
