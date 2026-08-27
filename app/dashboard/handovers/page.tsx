"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { ClipboardCheck, ArrowRight, Package, Building2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";

interface HandoverItem {
  id: string;
  transactionType: "LOAN" | "BOOKING";
  ticketNumber: string;
  borrowerName: string;
  borrowerEmail: string | null;
  assetName: string;
  assetCode: string;
  assetImage: string | null;
  startDate: string;
  endDate: string;
  status: string;
  handoverType: "CHECK_IN" | "CHECK_OUT" | null;
  handoverStatus: string | null;
}

interface HandoverData {
  loans: HandoverItem[];
  bookings: HandoverItem[];
  total: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  APPROVED: { label: "Disetujui", color: "#059669", bg: "rgba(5,150,105,0.1)" },
  ACTIVE: { label: "Aktif Dipinjam", color: "#2563eb", bg: "rgba(37,99,235,0.1)" },
  OVERDUE: { label: "Terlambat", color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
  CONFIRMED: { label: "Dikonfirmasi", color: "#7c3aed", bg: "rgba(124,58,237,0.1)" },
};

export default function HandoversPage() {
  const [data, setData] = useState<HandoverData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "checkin" | "checkout">("all");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/handovers/pending");
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const allItems = data ? [...data.loans, ...data.bookings] : [];
  const filtered = activeTab === "all" ? allItems
    : activeTab === "checkin" ? allItems.filter(i => i.handoverType === "CHECK_IN")
    : allItems.filter(i => i.handoverType === "CHECK_OUT");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ fontSize: "1.6rem", fontWeight: 800, display: "flex", alignItems: "center", gap: "0.6rem" }}>
            <ClipboardCheck size={26} color="var(--color-primary)" /> Serah Terima Aset
          </h1>
          <p style={{ color: "var(--color-muted)", marginTop: "0.25rem", fontSize: "0.9rem" }}>
            Daftar peminjaman & sewa yang perlu diproses serah terima atau pengembalian.
          </p>
        </div>
        <Button variant="secondary" onClick={fetchData} style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
        {[
          { label: "Total Pending", value: data?.total || 0, color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
          { label: "Siap Ambil (Check-In)", value: allItems.filter(i => i.handoverType === "CHECK_IN").length, color: "#059669", bg: "rgba(5,150,105,0.08)" },
          { label: "Siap Kembali (Check-Out)", value: allItems.filter(i => i.handoverType === "CHECK_OUT").length, color: "#f59e0b", bg: "rgba(245,158,11,0.08)" },
        ].map(stat => (
          <Card key={stat.label} style={{ padding: "1.25rem", borderLeft: `3px solid ${stat.color}`, background: stat.bg }}>
            <div style={{ fontSize: "0.82rem", color: "var(--color-muted)", fontWeight: 600 }}>{stat.label}</div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: stat.color, lineHeight: 1.1, marginTop: "0.25rem" }}>{loading ? "..." : stat.value}</div>
          </Card>
        ))}
      </div>

      {/* Tab Filter */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1.5px solid var(--color-border)", paddingBottom: "0" }}>
        {[
          { key: "all", label: "Semua" },
          { key: "checkin", label: "🚚 Pengambilan (Check-In)" },
          { key: "checkout", label: "📦 Pengembalian (Check-Out)" },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key as any)} style={{
            padding: "0.6rem 1.1rem", border: "none", background: "transparent",
            fontSize: "0.83rem", fontWeight: activeTab === tab.key ? 800 : 500,
            color: activeTab === tab.key ? "var(--color-primary)" : "var(--color-muted)",
            borderBottom: activeTab === tab.key ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
            cursor: "pointer", transition: "all 0.15s",
          }}>{tab.label}</button>
        ))}
      </div>

      {/* List */}
      <Card style={{ padding: "0" }}>
        {loading ? (
          <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            {[1, 2, 3].map(i => <Skeleton key={i} style={{ height: "80px" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "4rem", textAlign: "center" }}>
            <CheckCircle2 size={48} color="#22c55e" style={{ margin: "0 auto 1rem" }} />
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Tidak ada transaksi pending</div>
            <div style={{ color: "var(--color-muted)", fontSize: "0.85rem", marginTop: "0.4rem" }}>Semua serah terima telah selesai diproses.</div>
          </div>
        ) : (
          <div>
            {filtered.map((item, idx) => {
              const isCheckIn = item.handoverType === "CHECK_IN";
              const statusInfo = statusConfig[item.status] || { label: item.status, color: "#64748b", bg: "rgba(100,116,139,0.08)" };
              
              return (
                <div key={item.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "1.25rem 1.5rem", borderBottom: idx < filtered.length - 1 ? "1px solid var(--color-border)" : "none",
                  flexWrap: "wrap", gap: "1rem",
                }}>
                  {/* Left: Asset Info */}
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem", minWidth: 0 }}>
                    {/* Icon / Image */}
                    <div style={{
                      width: "52px", height: "52px", borderRadius: "var(--radius-md)",
                      background: item.assetImage ? "transparent" : "var(--color-surface2)",
                      border: "1px solid var(--color-border)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      overflow: "hidden", flexShrink: 0,
                    }}>
                      {item.assetImage
                        ? <img src={item.assetImage} alt={item.assetName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : item.transactionType === "BOOKING"
                          ? <Building2 size={22} color="var(--color-muted)" />
                          : <Package size={22} color="var(--color-muted)" />
                      }
                    </div>
                    
                    {/* Details */}
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: "0.95rem", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {item.assetName}
                      </div>
                      <div style={{ fontSize: "0.78rem", color: "var(--color-muted)", marginTop: "0.1rem" }}>
                        #{item.ticketNumber} · {item.borrowerName}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--color-muted)", marginTop: "0.05rem" }}>
                        {format(new Date(item.startDate), "dd MMM", { locale: localeId })} — {format(new Date(item.endDate), "dd MMM yyyy", { locale: localeId })}
                      </div>
                    </div>
                  </div>

                  {/* Right: Badges + Action */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
                    <span style={{ padding: "0.2rem 0.7rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700, color: statusInfo.color, background: statusInfo.bg }}>
                      {statusInfo.label}
                    </span>
                    <span style={{
                      padding: "0.2rem 0.7rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 700,
                      color: isCheckIn ? "#059669" : "#f59e0b",
                      background: isCheckIn ? "rgba(5,150,105,0.1)" : "rgba(245,158,11,0.1)",
                    }}>
                      {isCheckIn ? "🚚 Pengambilan" : "📦 Pengembalian"}
                    </span>
                    
                    <Link href={`/dashboard/handovers/${item.id}?type=${item.handoverType}`}>
                      <Button variant={isCheckIn ? "primary" : "secondary"} style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", padding: "0.5rem 1rem" }}>
                        Proses <ArrowRight size={14} />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
