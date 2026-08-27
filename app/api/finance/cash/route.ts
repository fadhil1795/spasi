import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');

    const whereClause: any = {};
    if (category) whereClause.category = category;
    if (type) whereClause.type = type;

    const transactions = await prisma.cashTransaction.findMany({
      where: whereClause,
      orderBy: { transactionDate: 'desc' }
    });

    // Kalkulasi saldo (Uang Masuk - Uang Keluar)
    const totalIn = transactions.filter(t => t.type === 'IN').reduce((acc, t) => acc + t.amount, 0);
    const totalOut = transactions.filter(t => t.type === 'OUT').reduce((acc, t) => acc + t.amount, 0);
    const balance = totalIn - totalOut;

    return NextResponse.json({
      transactions,
      summary: {
        totalIn,
        totalOut,
        balance
      }
    });
  } catch (error) {
    console.error("Error fetching cash transactions:", error);
    return NextResponse.json(
      { error: "Gagal mengambil data transaksi kas" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, category, amount, referenceId, description } = body;

    if (!type || !category || !amount) {
      return NextResponse.json(
        { error: "Data mutasi kas tidak lengkap" },
        { status: 400 }
      );
    }

    const transaction = await prisma.cashTransaction.create({
      data: {
        type,
        category,
        amount: parseFloat(amount),
        referenceId,
        description,
      }
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("Error creating cash transaction:", error);
    return NextResponse.json(
      { error: "Gagal mencatat mutasi kas" },
      { status: 500 }
    );
  }
}
