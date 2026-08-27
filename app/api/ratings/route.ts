import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/ratings?loanId=xxx atau ?bookingId=xxx
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get("loanId");
    const bookingId = searchParams.get("bookingId");
    const assetId = searchParams.get("assetId"); // semua rating per aset

    const where: any = {};
    if (loanId) where.loanId = loanId;
    if (bookingId) where.bookingId = bookingId;
    if (assetId) where.loan = { assetId };

    const ratings = await prisma.assetRating.findMany({
      where,
      include: { user: { select: { name: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
    });

    const avg = ratings.length
      ? ratings.reduce((s, r) => s + r.score, 0) / ratings.length
      : 0;

    return NextResponse.json({ ratings, avg: +avg.toFixed(1), total: ratings.length });
  } catch (error) {
    console.error("Error fetching ratings:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/ratings — submit rating baru
export async function POST(request: Request) {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const userId = (session.user as any).id;
    const body = await request.json();
    const { loanId, bookingId, score, condition, comment } = body;

    if (!score || score < 1 || score > 5) {
      return NextResponse.json({ error: "Skor harus antara 1-5" }, { status: 400 });
    }
    if (!loanId && !bookingId) {
      return NextResponse.json({ error: "loanId atau bookingId wajib diisi" }, { status: 400 });
    }

    // Pastikan user adalah peminjam transaksi ini
    if (loanId) {
      const loan = await prisma.loan.findUnique({ where: { id: loanId } });
      if (!loan || loan.userId !== userId) {
        return NextResponse.json({ error: "Anda bukan peminjam transaksi ini" }, { status: 403 });
      }
      if (!["RETURNED", "COMPLETED"].includes(loan.status)) {
        return NextResponse.json({ error: "Rating hanya bisa diberikan setelah aset dikembalikan" }, { status: 400 });
      }
    }

    // Upsert (satu transaksi = satu rating)
    const rating = await prisma.assetRating.upsert({
      where: loanId ? { loanId } : { bookingId },
      create: { loanId: loanId || null, bookingId: bookingId || null, userId, score, condition: condition || null, comment: comment || null },
      update: { score, condition: condition || null, comment: comment || null },
    });

    return NextResponse.json({ success: true, rating });
  } catch (error: any) {
    console.error("Error submitting rating:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
