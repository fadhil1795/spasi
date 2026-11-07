import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

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
    const { code, name, categoryId, unit, stock = 0, minimumStock = 5, locationId, unitCost } = body;

    if (!name || !unit) {
      return NextResponse.json({ error: 'Nama barang dan satuan wajib diisi' }, { status: 400 });
    }

    const autoCode =
      code?.trim() ||
      `ATK-${Math.floor(100 + Math.random() * 900)}`;

    const consumable = await prisma.consumable.create({
      data: {
        code: autoCode,
        name: name.trim(),
        categoryId: categoryId || null,
        unit: unit.trim(),
        stock: parseInt(stock) || 0,
        minimumStock: parseInt(minimumStock) || 5,
        locationId: locationId || null,
        unitCost: unitCost ? parseFloat(unitCost) : null,
      },
      include: {
        category: true,
        location: true,
      },
    });

    return NextResponse.json(consumable, { status: 201 });
  } catch (error) {
    console.error('Error creating consumable:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
