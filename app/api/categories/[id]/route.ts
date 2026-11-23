import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    if (!body.name) {
      return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });
    }

    const updateData: any = {
      name: body.name.trim(),
      usefulLifeYears: body.usefulLifeYears ? parseInt(body.usefulLifeYears) : 5,
      depreciationRate: body.depreciationRate ? parseFloat(body.depreciationRate) : 0.2,
    };

    if (body.code !== undefined) {
      updateData.code = body.code
        ? body.code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)
        : null;
    }

    if (body.parentId !== undefined) {
      updateData.parentId = body.parentId || null;
    }

    const updatedCategory = await prisma.category.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(updatedCategory);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Kategori dengan nama ini sudah ada' }, { status: 400 });
    }
    console.error('Error updating category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = (session.user as any).role;
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if assets are using this category
    const assetCount = await prisma.asset.count({
      where: { categoryId: params.id },
    });

    if (assetCount > 0) {
      return NextResponse.json(
        { error: `Kategori tidak dapat dihapus karena masih digunakan oleh ${assetCount} aset.` },
        { status: 400 }
      );
    }

    await prisma.category.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: 'Kategori berhasil dihapus' });
  } catch (error) {
    console.error('Error deleting category:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
