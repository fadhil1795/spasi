import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { name, licenseNo, skills, status, validUntil } = body;

    const operator = await prisma.operator.update({
      where: { id: params.id },
      data: {
        name,
        licenseNo,
        skills,
        status,
        validUntil: validUntil ? new Date(validUntil) : null,
      }
    });

    return NextResponse.json(operator);
  } catch (error) {
    console.error("Error updating operator:", error);
    return NextResponse.json(
      { error: "Gagal memperbarui data operator" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    await prisma.operator.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting operator:", error);
    return NextResponse.json(
      { error: "Gagal menghapus data operator" },
      { status: 500 }
    );
  }
}
