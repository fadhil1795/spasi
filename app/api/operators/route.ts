import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
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
