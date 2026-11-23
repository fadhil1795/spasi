import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const whereClause = status ? { status } : {};

    const operators = await prisma.operator.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(operators);
  } catch (error) {
    console.error("Error fetching operators:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data operator" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    const userRole = (session?.user as any)?.role;
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { name, licenseNo, skills, status, validUntil } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Nama operator wajib diisi" },
        { status: 400 }
      );
    }

    const operator = await prisma.operator.create({
      data: {
        name,
        licenseNo,
        skills,
        status: status || 'AVAILABLE',
        validUntil: validUntil ? new Date(validUntil) : null,
      }
    });

    return NextResponse.json(operator, { status: 201 });
  } catch (error) {
    console.error("Error creating operator:", error);
    return NextResponse.json(
      { error: "Gagal membuat operator baru" },
      { status: 500 }
    );
  }
}
