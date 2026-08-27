"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Plus, CheckCircle, HandCoins } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Commission {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  createdAt: string;
  partner: {
    id: string;
    name: string;
    company: string | null;
  };
}

export default function PartnerCommissionPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/commissions");
      const data = await res.json();
      setCommissions(data);
    } catch (error) {
      console.error("Failed to fetch commissions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (id: string) => {
    try {
      setPaying(id);
      const res = await fetch("/api/commissions/pay", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commissionId: id })
      });
      if (res.ok) {
        fetchCommissions();
      } else {
        alert("Gagal membayar komisi.");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPaying(null);
    }
  };

  return (
    <div className="space-y-6">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Mitra &amp; Komisi</h2>
          <p style={{ color: 'var(--color-muted)' }}>
            Kelola mitra marketing/broker dan bayarkan tagihan komisi.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button variant="secondary">
            <Plus className="mr-2 h-4 w-4" /> Tambah Mitra
          </Button>
          <Button variant="primary">
            <Plus className="mr-2 h-4 w-4" /> Catat Komisi
          </Button>
        </div>
      </div>

      <Card style={{ padding: '1.5rem' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1.25rem' }}>Daftar Tagihan Komisi</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)' }}>
                {['Tanggal', 'Nama Mitra', 'Catatan', 'Nominal', 'Status', 'Aksi'].map(h => (
                  <th key={h} style={{ padding: '0.75rem', textAlign: h === 'Nominal' || h === 'Aksi' ? 'right' : 'left', fontWeight: 700, borderBottom: '1.5px solid var(--color-border)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Memuat data komisi...
                  </td>
                </tr>
              ) : commissions.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                    Belum ada catatan komisi
                  </td>
                </tr>
              ) : (
                commissions.map((c, i) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--color-border)', background: i % 2 === 0 ? 'transparent' : 'var(--color-surface2)' }}>
                    <td style={{ padding: '0.75rem' }}>
                      {format(new Date(c.createdAt), "dd MMM yyyy", { locale: localeId })}
                    </td>
                    <td style={{ padding: '0.75rem', fontWeight: 600 }}>
                      {c.partner.name}
                      {c.partner.company && <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--color-muted)' }}>{c.partner.company}</span>}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{c.notes || "-"}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary)' }}>
                      {formatCurrency(c.amount)}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {c.status === "PAID" 
                        ? <Badge status="PAID" />
                        : <Badge status="UNPAID" />
                      }
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                      {c.status === "UNPAID" && (
                        <Button 
                          variant="secondary" 
                          onClick={() => handlePay(c.id)}
                          disabled={paying === c.id}
                        >
                          {paying === c.id ? 'Memproses...' : <><HandCoins size={14} style={{ marginRight: '4px' }} /> Bayar</>}
                        </Button>
                      )}
                      {c.status === "PAID" && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-success)', fontWeight: 600, display: 'inline-flex', alignItems: 'center' }}>
                          <CheckCircle size={14} style={{ marginRight: '4px' }} /> Lunas
                        </span>
                      )}
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
