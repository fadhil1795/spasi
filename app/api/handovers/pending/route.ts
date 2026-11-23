import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthSession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userRole = (session.user as any).role || "BORROWER";
    if (userRole === "BORROWER") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const loans = await prisma.loan.findMany({
      where: { status: { in: ["APPROVED", "ACTIVE", "OVERDUE"] } },
      include: {
        user: { select: { id: true, name: true, email: true } },
        asset: { select: { id: true, name: true, code: true, images: true } },
        handoverLog: true,
      },
      orderBy: { startDate: "asc" },
    });

    const bookings = await prisma.roomBooking.findMany({
      where: { bookingStatus: { in: ["CONFIRMED", "ACTIVE"] } },
      include: {
        renter: { select: { id: true, name: true, phone: true, email: true } },
        location: { select: { id: true, name: true, building: true } },
        handoverLog: true,
      },
      orderBy: { startTime: "asc" },
    });

    const loanItems = loans.map(l => {
      const hasCheckIn = !!l.handoverLog && l.handoverLog.type === "CHECK_IN" && l.handoverLog.status === "SUBMITTED";
      const needsCheckIn = l.status === "APPROVED" && !hasCheckIn;
      const needsCheckOut = l.status === "ACTIVE" || l.status === "OVERDUE";
      const handoverType = needsCheckIn ? "CHECK_IN" : needsCheckOut ? "CHECK_OUT" : null;
      let assetImage: string | null = null;
      try { assetImage = JSON.parse(l.asset.images)?.[0] || null; } catch { assetImage = null; }
      return { id: l.id, transactionType: "LOAN", ticketNumber: l.ticketNumber, borrowerName: l.user.name, borrowerEmail: l.user.email, assetName: l.asset.name, assetCode: l.asset.code, assetImage, startDate: l.startDate, endDate: l.endDate, status: l.status, handoverType, handoverStatus: l.handoverLog?.status || null };
    }).filter(item => item.handoverType !== null);

    const bookingItems = bookings.map(b => {
      const hasCheckIn = !!b.handoverLog && b.handoverLog.type === "CHECK_IN" && b.handoverLog.status === "SUBMITTED";
      const needsCheckIn = b.bookingStatus === "CONFIRMED" && !hasCheckIn;
      const needsCheckOut = b.bookingStatus === "ACTIVE";
      const handoverType = needsCheckIn ? "CHECK_IN" : needsCheckOut ? "CHECK_OUT" : null;
      return { id: b.id, transactionType: "BOOKING", ticketNumber: b.bookingNumber, borrowerName: b.renter.name, borrowerEmail: b.renter.email || null, assetName: b.location?.name || 'Paket Peralatan Sarpras', assetCode: b.location?.building || '-', assetImage: null, startDate: b.startTime, endDate: b.endTime, status: b.bookingStatus, handoverType, handoverStatus: b.handoverLog?.status || null };
    }).filter(item => item.handoverType !== null);

    return NextResponse.json({ loans: loanItems, bookings: bookingItems, total: loanItems.length + bookingItems.length });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
