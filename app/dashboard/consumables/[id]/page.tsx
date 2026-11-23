'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowLeft,
  Package,
  ArrowDownRight,
  ArrowUpRight,
  Search,
  Download,
  RefreshCw,
  Receipt,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Tag,
} from 'lucide-react';

export default function ConsumableDetailHistoryPage() {
  const params = useParams();
  const id = String(params?.id || '');
  const { showToast } = useToast();

  const [item, setItem] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (id) fetchDetailAndLogs();
  }, [id]);

  const fetchDetailAndLogs = async () => {
    try {
      setLoading(true);
      const [itemRes, logsRes] = await Promise.all([
        fetch(`/api/consumables/${encodeURIComponent(id)}`),
        fetch(`/api/consumables/transactions?consumableId=${encodeURIComponent(id)}&limit=500`),
      ]);
      if (itemRes.ok) {
        setItem(await itemRes.json());
      } else {
        showToast('Barang habis pakai tidak ditemukan', 'error');
      }
      if (logsRes.ok) {
        setLogs(await logsRes.json());
      }
    } catch {
      showToast('Gagal memuat kartu stok barang', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter((l) => {
    if (typeFilter !== 'ALL' && l.type !== typeFilter) return false;
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      l.supplierName?.toLowerCase().includes(q) ||
      l.invoiceNumber?.toLowerCase().includes(q) ||
      l.recipientName?.toLowerCase().includes(q) ||
      l.departmentName?.toLowerCase().includes(q) ||
      l.recordedBy?.name?.toLowerCase().includes(q) ||
      l.notes?.toLowerCase().includes(q) ||
      l.brand?.toLowerCase().includes(q)
    );
  });

  const totalIn = logs.filter((l) => l.type === 'IN').reduce((s, l) => s + (l.quantity || 0), 0);
  const totalOut = logs.filter((l) => l.type === 'OUT').reduce((s, l) => s + (l.quantity || 0), 0);
  const totalSpend = logs
    .filter((l) => l.type === 'IN')
    .reduce((s, l) => s + (l.totalCost || (l.unitCost ? l.unitCost * l.quantity : 0) || 0), 0);

  const handleExportCsv = () => {
    if (!item) return;
    const headers = [
      'Waktu Transaksi',
      'Kode',
      'Nama Barang',
      'Merek',
      'Tipe',
      'Jumlah',
      'Satuan',
      'Harga Beli Satuan',
      'Total Biaya',
      'Nama Toko / Supplier',
      'No Nota',
      'Bukti Pembelian',
      'Penerima',
      'Unit/Bagian',
      'Petugas',
      'Catatan',
    ];
    const rows = filteredLogs.map((t) => [
      new Date(t.transactionDate).toLocaleString('id-ID'),
      item.code,
      `"${(item.name || '').replace(/"/g, '""')}"`,
      `"${(t.brand || item.brand || '-').replace(/"/g, '""')}"`,
      t.type === 'IN' ? 'MASUK' : 'KELUAR',
      t.quantity,
      item.unit || '',
      t.unitCost || 0,
      t.totalCost || 0,
      `"${(t.supplierName || '-').replace(/"/g, '""')}"`,
      `"${(t.invoiceNumber || '-').replace(/"/g, '""')}"`,
      `"${(t.receiptUrl || '-').replace(/"/g, '""')}"`,
      `"${(t.recipientName || '-').replace(/"/g, '""')}"`,
      `"${(t.departmentName || '-').replace(/"/g, '""')}"`,
      `"${(t.recordedBy?.name || '-').replace(/"/g, '""')}"`,
      `"${(t.notes || '-').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kartu-stok-${item.code}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        <Skeleton height="90px" />
        <Skeleton height="120px" />
        <Skeleton height="360px" />
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ maxWidth: '720px', margin: '2rem auto', textAlign: 'center' }}>
        <Card style={{ padding: '2.5rem' }}>
          <Package size={44} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem' }}>Barang Habis Pakai Tidak Ditemukan</h2>
          <p style={{ color: 'var(--color-muted)', marginBottom: '1.25rem' }}>
            Data ATK mungkin sudah dihapus atau ID tidak valid.
          </p>
          <Link href="/dashboard/consumables" className="btn btn-primary">
            <ArrowLeft size={16} /> Kembali ke Daftar ATK
          </Link>
        </Card>
      </div>
    );
  }

  const isLow = item.stock <= item.minimumStock;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <Link
            href="/dashboard/consumables"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--color-primary-light)',
              marginBottom: '0.6rem',
            }}
          >
            <ArrowLeft size={15} /> Kembali ke Barang Habis Pakai
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{item.name}</h1>
            <span
              className="badge"
              style={{
                fontFamily: 'monospace',
                background: 'var(--color-surface2)',
                color: 'var(--color-primary-light)',
                fontWeight: 700,
              }}
            >
              {item.code}
            </span>
            {isLow ? (
              <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.14)', color: '#ef4444', fontWeight: 700 }}>
                <AlertTriangle size={13} /> Stok Menipis
              </span>
            ) : (
              <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.14)', color: '#10b981', fontWeight: 700 }}>
                <CheckCircle2 size={13} /> Stok Aman
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.45rem', fontSize: '0.84rem', color: 'var(--color-muted)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <Tag size={14} /> Kategori: <strong>{item.category?.name || 'Umum'}</strong>
            </span>
            <span>
              Merek: <strong>{item.brand || '-'}</strong>
            </span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
              <MapPin size={14} /> Lokasi: <strong>{item.location?.name || item.location?.building || 'Gudang Pusat ATK'}</strong>
            </span>
            <span>
              Batas Minimum: <strong>{item.minimumStock} {item.unit}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Button variant="secondary" onClick={fetchDetailAndLogs}>
            <RefreshCw size={15} /> Refresh
          </Button>
          <Button variant="secondary" onClick={handleExportCsv}>
            <Download size={15} /> Export Kartu Stok (CSV)
          </Button>
          <Link href={`/dashboard/consumables?action=in&itemId=${item.id}`} className="btn btn-primary">
            <ArrowDownRight size={15} /> + Masuk
          </Link>
          <Link href={`/dashboard/consumables?action=out&itemId=${item.id}`} className="btn btn-secondary" style={{ color: '#ef4444' }}>
            <ArrowUpRight size={15} /> - Keluar
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.15rem', borderLeft: isLow ? '4px solid #ef4444' : undefined }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Sisa Stok Saat Ini
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.3rem', color: isLow ? '#ef4444' : 'var(--color-primary-light)' }}>
            {item.stock} {item.unit}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Harga satuan terakhir: {item.unitCost ? formatCurrency(item.unitCost) : '-'}
          </div>
        </Card>

        <Card style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Barang Masuk (IN)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.3rem', color: '#10b981' }}>
            +{totalIn} {item.unit}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            {logs.filter((l) => l.type === 'IN').length} kali transaksi masuk
          </div>
        </Card>

        <Card style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Total Pengeluaran / Keluar (OUT)
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.3rem', color: '#ef4444' }}>
            -{totalOut} {item.unit}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            {logs.filter((l) => l.type === 'OUT').length} kali pengambilan unit
          </div>
        </Card>

        <Card style={{ padding: '1.15rem' }}>
          <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', fontWeight: 700, textTransform: 'uppercase' }}>
            Akumulasi Belanja Item Ini
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.35rem', color: 'var(--color-success)' }}>
            {formatCurrency(totalSpend)}
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>
            Berdasarkan histori pembelian masuk
          </div>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', minWidth: '260px', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-muted)' }} />
            <input
              type="text"
              placeholder="Cari nama toko, penerima, unit bagian, no. nota, petugas, atau catatan..."
              className="input-field"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '2.4rem', width: '100%' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(['ALL', 'IN', 'OUT'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={`btn btn-sm ${typeFilter === t ? 'btn-primary' : 'btn-secondary'}`}
              >
                {t === 'ALL'
                  ? `Semua (${logs.length})`
                  : t === 'IN'
                  ? `Masuk (${logs.filter((l) => l.type === 'IN').length})`
                  : `Keluar / Pengeluaran (${logs.filter((l) => l.type === 'OUT').length})`}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Full Page Transaction History Table */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                <th style={{ padding: '0.9rem 1.15rem' }}>Waktu Transaksi</th>
                <th style={{ padding: '0.9rem 1.15rem' }}>Tipe</th>
                <th style={{ padding: '0.9rem 1.15rem' }}>Jumlah</th>
                <th style={{ padding: '0.9rem 1.15rem' }}>Merek</th>
                <th style={{ padding: '0.9rem 1.15rem' }}>Nama Toko / Penerima &amp; Unit</th>
                <th style={{ padding: '0.9rem 1.15rem' }}>Harga &amp; No. Nota</th>
                <th style={{ padding: '0.9rem 1.15rem' }}>Petugas, Catatan &amp; Bukti</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                    Belum ada riwayat transaksi untuk filter ini.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((l) => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '0.9rem 1.15rem', whiteSpace: 'nowrap', fontSize: '0.8rem', color: 'var(--color-muted)' }}>
                      {new Date(l.transactionDate).toLocaleString('id-ID')}
                    </td>
                    <td style={{ padding: '0.9rem 1.15rem' }}>
                      <span
                        className="badge"
                        style={{
                          background: l.type === 'IN' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(239, 68, 68, 0.14)',
                          color: l.type === 'IN' ? '#10b981' : '#ef4444',
                          fontWeight: 700,
                        }}
                      >
                        {l.type === 'IN' ? 'MASUK (IN)' : 'KELUAR (OUT)'}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 1.15rem', fontWeight: 800, color: l.type === 'IN' ? '#10b981' : '#ef4444' }}>
                      {l.type === 'IN' ? '+' : '-'}{l.quantity} {item.unit}
                    </td>
                    <td style={{ padding: '0.9rem 1.15rem' }}>
                      {l.brand || item.brand || '-'}
                    </td>
                    <td style={{ padding: '0.9rem 1.15rem' }}>
                      {l.type === 'IN' ? (
                        <div style={{ fontWeight: 600 }}>{l.supplierName || 'Pembelian / Restock'}</div>
                      ) : (
                        <div>
                          <div style={{ fontWeight: 600 }}>{l.recipientName || '-'}</div>
                          {l.departmentName && (
                            <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)' }}>{l.departmentName}</div>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1.15rem' }}>
                      {l.type === 'IN' ? (
                        <div>
                          {(l.totalCost || l.unitCost) ? (
                            <div style={{ fontWeight: 700, color: 'var(--color-success)' }}>
                              {formatCurrency(l.totalCost || l.unitCost * l.quantity)}
                            </div>
                          ) : (
                            <span>-</span>
                          )}
                          {l.unitCost ? (
                            <div style={{ fontSize: '0.74rem', color: 'var(--color-muted)' }}>
                              @{formatCurrency(l.unitCost)}/{item.unit}
                            </div>
                          ) : null}
                          {l.invoiceNumber && (
                            <div style={{ fontFamily: 'monospace', fontSize: '0.74rem', color: 'var(--color-primary-light)' }}>
                              Nota: {l.invoiceNumber}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-muted)' }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: '0.9rem 1.15rem' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{l.recordedBy?.name || 'System'}</div>
                      {l.notes && (
                        <div style={{ fontSize: '0.76rem', color: 'var(--color-muted)', marginTop: '0.15rem' }}>
                          {l.notes}
                        </div>
                      )}
                      {l.receiptUrl && (
                        <a
                          href={l.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            marginTop: '0.3rem',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            color: 'var(--color-primary-light)',
                            textDecoration: 'underline',
                          }}
                        >
                          <Receipt size={13} /> Lihat Bukti Pembelian <ExternalLink size={11} />
                        </a>
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

