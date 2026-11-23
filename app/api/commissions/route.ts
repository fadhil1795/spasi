import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getAuthSession();
    const userRole = (session?.user as any)?.role;
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const commissions = await prisma.commission.findMany({
      include: { partner: true },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(commissions);
  } catch (error) {
    console.error("Error fetching commissions:", error);
    return NextResponse.json({ error: "Gagal mengambil data komisi" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    const userRole = (session?.user as any)?.role;
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { partnerId, rentalId, amount, notes } = body;

    if (!partnerId || !amount) {
      return NextResponse.json({ error: "Partner dan Nominal wajib diisi" }, { status: 400 });
    }

    const commission = await prisma.commission.create({
      data: {
        partnerId,
        rentalId: rentalId || null,
        amount: parseFloat(amount),
        notes,
      }
    });

    return NextResponse.json(commission, { status: 201 });
  } catch (error) {
    console.error("Error creating commission:", error);
    return NextResponse.json({ error: "Gagal menambah komisi" }, { status: 500 });
  }
}
