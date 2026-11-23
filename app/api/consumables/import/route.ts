import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';
import { recordAuditLog } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface ImportRow {
  code?: string;
  name: string;
  brand?: string;
  category?: string;
  unit?: string;
  stock?: number | string;
  minimumStock?: number | string;
  location?: string;
  unitCost?: number | string;
  supplierName?: string;
  invoiceNumber?: string;
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = (session.user as any).role;
    const userId = (session.user as any).id;
    if (!['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];
    const duplicateMode: 'skip' | 'restock' = body.mode === 'restock' ? 'restock' : 'skip';

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data baris untuk diimpor' }, { status: 400 });
    }

    const [categories, locations] = await Promise.all([
      prisma.category.findMany({ select: { id: true, name: true } }),
      prisma.location.findMany({ select: { id: true, name: true, building: true } }),
    ]);

    const catMap = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.id]));
    const locMap = new Map<string, string>();
    for (const l of locations) {
      if (l.name) locMap.set(l.name.trim().toLowerCase(), l.id);
      if (l.building) locMap.set(l.building.trim().toLowerCase(), l.id);
    }

    let createdCount = 0;
    let restockedCount = 0;
    let skippedCount = 0;
    const errors: string[] = [];

    for (let idx = 0; idx < rows.length; idx++) {
      const r = rows[idx];
      const rowNum = idx + 2; // Excel row number (assuming header on row 1)
      const name = String(r.name || '').trim();
      const unit = String(r.unit || 'Pcs').trim() || 'Pcs';

      if (!name) {
        errors.push(`Baris ${rowNum}: Nama barang kosong, dilewati.`);
        skippedCount++;
        continue;
      }

      const rawCode = String(r.code || '').trim();
      const qty = Math.max(0, parseInt(String(r.stock ?? '0')) || 0);
      const minStock = Math.max(0, parseInt(String(r.minimumStock ?? '5')) || 5);
      const parsedCost =
        r.unitCost !== undefined && r.unitCost !== null && String(r.unitCost).trim() !== ''
          ? parseFloat(String(r.unitCost))
          : null;
      const brandVal = String(r.brand || '').trim() || null;
      const supplierVal = String(r.supplierName || '').trim() || null;
      const invoiceVal = String(r.invoiceNumber || '').trim() || null;

      const catId = r.category ? catMap.get(String(r.category).trim().toLowerCase()) || null : null;
      const locId = r.location ? locMap.get(String(r.location).trim().toLowerCase()) || null : null;

      try {
        const allItems = await prisma.consumable.findMany({
          select: { id: true, code: true, name: true, brand: true, stock: true, unitCost: true },
        });
        const existing =
          (rawCode
            ? allItems.find((i) => i.code.trim().toLowerCase() === rawCode.toLowerCase())
            : undefined) ||
          allItems.find((i) => i.name.trim().toLowerCase() === name.toLowerCase());

        if (existing) {
          if (duplicateMode === 'restock' && qty > 0) {
            await prisma.$transaction(async (tx) => {
              await tx.consumable.update({
                where: { id: existing.id },
                data: {
                  stock: existing.stock + qty,
                  ...(parsedCost !== null && !isNaN(parsedCost) ? { unitCost: parsedCost } : {}),
                  ...(brandVal ? { brand: brandVal } : {}),
                },
              });
              await tx.consumableTransaction.create({
                data: {
                  consumableId: existing.id,
                  type: 'IN',
                  quantity: qty,
                  brand: brandVal || existing.brand,
                  unitCost: parsedCost !== null && !isNaN(parsedCost) ? parsedCost : existing.unitCost,
                  totalCost:
                    parsedCost !== null && !isNaN(parsedCost)
                      ? parsedCost * qty
                      : existing.unitCost
                      ? existing.unitCost * qty
                      : null,
                  supplierName: supplierVal,
                  invoiceNumber: invoiceVal,
                  notes: 'Import Restock Massal ATK',
                  recordedById: userId,
                },
              });
            });
            restockedCount++;
          } else {
            skippedCount++;
          }
          continue;
        }

        const autoCode = rawCode || `ATK-${Math.floor(1000 + Math.random() * 9000)}`;
        await prisma.$transaction(async (tx) => {
          const created = await tx.consumable.create({
            data: {
              code: autoCode,
              name,
              brand: brandVal,
              categoryId: catId,
              unit,
              stock: qty,
              minimumStock: minStock,
              locationId: locId,
              unitCost: parsedCost !== null && !isNaN(parsedCost) ? parsedCost : null,
            },
          });

          if (qty > 0) {
            await tx.consumableTransaction.create({
              data: {
                consumableId: created.id,
                type: 'IN',
                quantity: qty,
                brand: brandVal,
                unitCost: parsedCost !== null && !isNaN(parsedCost) ? parsedCost : null,
                totalCost: parsedCost !== null && !isNaN(parsedCost) ? parsedCost * qty : null,
                supplierName: supplierVal,
                invoiceNumber: invoiceVal,
                notes: 'Import Massal Master ATK',
                recordedById: userId,
              },
            });
          }
        });

        createdCount++;
      } catch (rowErr: any) {
        errors.push(`Baris ${rowNum} (${name}): ${rowErr?.message || 'Gagal disimpan'}`);
        skippedCount++;
      }
    }

    await recordAuditLog({
      userId,
      action: 'IMPORT_CONSUMABLES',
      entity: 'Consumable',
      entityId: 'bulk-import',
      details: `Import massal ATK: ${createdCount} item baru, ${restockedCount} restock, ${skippedCount} dilewati.`,
      newData: { createdCount, restockedCount, skippedCount, totalRows: rows.length },
    });

    return NextResponse.json({
      message: `Import selesai: ${createdCount} baru, ${restockedCount} restock, ${skippedCount} dilewati.`,
      createdCount,
      restockedCount,
      skippedCount,
      errors,
    });
  } catch (error) {
    console.error('Error importing consumables:', error);
    return NextResponse.json({ error: 'Gagal memproses import ATK' }, { status: 500 });
  }
}

