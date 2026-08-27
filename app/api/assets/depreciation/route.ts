import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/assets/depreciation - Calculate and update straight-line monthly asset depreciation
export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const assets = await prisma.asset.findMany({
      include: { category: true },
      where: {
        purchaseCost: { not: null },
      },
    });

    const updatedAssets = [];

    for (const asset of assets) {
      if (!asset.purchaseCost || !asset.purchaseDate) continue;

      const usefulLifeYears = asset.category?.usefulLifeYears || 5; // default 5 years
      const usefulLifeMonths = usefulLifeYears * 12;
      const salvage = asset.salvageValue || 0;
      const depreciableAmount = asset.purchaseCost - salvage;
      const monthlyDepreciation = depreciableAmount / usefulLifeMonths;

      // Calculate months elapsed since purchase date
      const now = new Date();
      const purchaseDate = new Date(asset.purchaseDate);
      const monthsElapsed = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());

      const totalDepreciation = Math.min(depreciableAmount, Math.max(0, monthsElapsed * monthlyDepreciation));
      const currentValue = Math.max(salvage, asset.purchaseCost - totalDepreciation);

      const updated = await prisma.asset.update({
        where: { id: asset.id },
        data: {
          monthlyDepreciation,
          currentValue,
          lastDepreciationDate: now,
        },
        select: {
          id: true,
          code: true,
          name: true,
          purchaseCost: true,
          currentValue: true,
          monthlyDepreciation: true,
        },
      });

      updatedAssets.push(updated);
    }

    return NextResponse.json({
      message: `Penyusutan nilai buku berhasil diperbarui untuk ${updatedAssets.length} aset.`,
      assets: updatedAssets,
    });
  } catch (error) {
    console.error('Depreciation API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
