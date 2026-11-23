import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getAuthSession();
    const userRole = (session?.user as any)?.role;
    if (!session || !['SUPER_ADMIN', 'ADMIN', 'STAFF'].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
    const session = await getAuthSession();
    const userRole = (session?.user as any)?.role;
    if (!session || !['SUPER_ADMIN', 'ADMIN'].includes(userRole)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

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
