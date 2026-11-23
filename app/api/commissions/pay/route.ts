import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    const userRole = (session?.user as any)?.role;
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { commissionId } = body;

    if (!commissionId) {
      return NextResponse.json({ error: "ID Komisi wajib diisi" }, { status: 400 });
    }

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: { partner: true }
    });

    if (!commission) {
      return NextResponse.json({ error: "Data komisi tidak ditemukan" }, { status: 404 });
    }

    if (commission.status === 'PAID') {
      return NextResponse.json({ error: "Komisi ini sudah dibayar" }, { status: 400 });
    }

    // 1. Update status komisi
    const updated = await prisma.commission.update({
      where: { id: commissionId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
      }
    });

    // 2. Catat Uang Keluar (Single-Entry)
    await prisma.cashTransaction.create({
      data: {
        type: 'OUT',
        category: 'COMMISSION',
        amount: commission.amount,
        referenceId: commission.id,
        description: `Pembayaran Komisi ke Partner: ${commission.partner.name}`,
      }
    });

    return NextResponse.json(updated, { status: 200 });
  } catch (error) {
    console.error("Error paying commission:", error);
    return NextResponse.json({ error: "Gagal membayar komisi" }, { status: 500 });
  }
}
