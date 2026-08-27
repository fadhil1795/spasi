"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ArrowDownRight, ArrowUpRight, Wallet } from "lucide-react";

interface CashTransaction {
  id: string;
  type: string;
  category: string;
  amount: number;
  referenceId: string | null;
  description: string | null;
  transactionDate: string;
}

export default function FinanceDashboard() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [summary, setSummary] = useState({ totalIn: 0, totalOut: 0, balance: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance/cash");
      const data = await res.json();
      setTransactions(data.transactions || []);
      setSummary(data.summary || { totalIn: 0, totalOut: 0, balance: 0 });
    } catch (error) {
      console.error("Failed to fetch finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTypeBadge = (type: string) => {
    if (type === "IN") {
      return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, color: '#166534', background: '#dcfce7' }}><ArrowDownRight size={12} /> Uang Masuk</span>;
    }
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.2rem 0.6rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, color: '#991b1b', background: '#fee2e2' }}><ArrowUpRight size={12} /> Uang Keluar</span>;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Keuangan &amp; Kas</h2>
        <p style={{ color: 'var(--color-muted)' }}>
          Pantau arus kas harian, pendapatan sewa, denda, serta pengeluaran operasional.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.25rem' }}>
        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #22c55e' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Uang Masuk</span>
            <ArrowDownRight size={16} color="#22c55e" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#16a34a' }}>{formatCurrency(summary.totalIn)}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>Pendapatan kotor</p>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #ef4444' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Total Uang Keluar</span>
            <ArrowUpRight size={16} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#dc2626' }}>{formatCurrency(summary.totalOut)}</div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginTop: '0.25rem' }}>Beban operasional &amp; deposit</p>
        </Card>

        <Card style={{ padding: '1.25rem', borderLeft: '4px solid #3b82f6', background: 'rgba(59,130,246,0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Saldo Akhir Kas</span>
            <Wallet size={16} color="#3b82f6" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#1d4ed8' }}>{formatCurrency(summary.balance)}</div>
          <p style={{ fontSize: '0.75rem', color: '#2563eb', opacity: 0.8, marginTop: '0.25rem' }}>Uang tunai / bank bersih</p>
        </Card>
      </div>

      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Riwayat Transaksi Kas</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)' }}>
                {['Tanggal', 'Kategori', 'Deskripsi', 'Tipe', 'Nominal'].map((h, i) => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: i === 4 ? 'right' : 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Memuat mutasi kas...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Belum ada transaksi kas yang dicatat
                  </td>
                </tr>
              ) : (
                transactions.map((trx, i) => (
                  <tr key={trx.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                    <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                      {format(new Date(trx.transactionDate), "dd MMM yyyy HH:mm", { locale: localeId })}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <span style={{ background: 'var(--color-surface2)', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {trx.category}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {trx.description || "-"}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{getTypeBadge(trx.type)}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: trx.type === 'IN' ? '#16a34a' : '#dc2626' }}>
                      {trx.type === 'IN' ? '+' : '-'}{formatCurrency(trx.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
