import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const partners = await prisma.partner.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(partners);
  } catch (error) {
    console.error("Error fetching partners:", error);
    return NextResponse.json({ error: "Gagal mengambil data partner" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, company, phone, email } = body;

    if (!name) {
      return NextResponse.json({ error: "Nama partner wajib diisi" }, { status: 400 });
    }

    const partner = await prisma.partner.create({
      data: { name, company, phone, email }
    });

    return NextResponse.json(partner, { status: 201 });
  } catch (error) {
    console.error("Error creating partner:", error);
    return NextResponse.json({ error: "Gagal menambah partner" }, { status: 500 });
  }
}
