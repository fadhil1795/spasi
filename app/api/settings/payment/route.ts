import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAuthSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/settings/payment - Get official payment bank accounts & QRIS
export async function GET() {
  try {
    let setting = await prisma.paymentSetting.findUnique({
      where: { id: 'default' },
    });

    if (!setting) {
      setting = await prisma.paymentSetting.create({
        data: {
          id: 'default',
          qrisCode: 'SPASI-INSTANSI-QRIS',
        },
      });
    }

    const bankAccounts = await prisma.bankAccount.findMany({
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ ...setting, bankAccounts });
  } catch (error) {
    console.error('Get payment settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PUT /api/settings/payment - Update payment bank accounts & QRIS (Admin Only)
export async function PUT(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userRole = (session.user as any)?.role || 'BORROWER';
    if (!['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: 'Hanya Admin yang berhak mengubah pengaturan pembayaran' }, { status: 403 });
    }

    const body = await request.json();
    const {
      qrisCode, qrisImageUrl, bankAccounts
    } = body;

    // Update QRIS setting
    const updatedSetting = await prisma.paymentSetting.upsert({
      where: { id: 'default' },
      update: {
        ...(qrisCode && { qrisCode }),
        ...(qrisImageUrl !== undefined && { qrisImageUrl }),
      },
      create: {
        id: 'default',
        qrisCode: qrisCode || 'SPASI-INSTANSI-QRIS',
        qrisImageUrl: qrisImageUrl || null,
      },
    });

    // Update Bank Accounts (Replace all pattern)
    if (Array.isArray(bankAccounts)) {
      // 1. Delete old active ones that are not in the new payload, or just delete all and recreate
      // Wait, a better approach is to delete all and insert many to easily sync state
      await prisma.bankAccount.deleteMany({});
      if (bankAccounts.length > 0) {
        await prisma.bankAccount.createMany({
          data: bankAccounts.map((b: any) => ({
            bankName: b.bankName,
            accountNo: b.accountNo,
            accountName: b.accountName,
            isActive: b.isActive !== false,
          }))
        });
      }
    }

    const updatedBanks = await prisma.bankAccount.findMany({ orderBy: { createdAt: 'asc' } });

    return NextResponse.json({ ...updatedSetting, bankAccounts: updatedBanks });
  } catch (error) {
    console.error('Update payment settings error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
