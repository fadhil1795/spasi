'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ShoppingBag, Plus, CheckCircle2, Clock, XCircle,
  Truck, Building2, User, ChevronRight, FileText, Check, Trash2, Box, Eye
} from 'lucide-react';

export default function ProcurementDashboardPage() {
  const { showToast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // New Request Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [targetFiscalYear, setTargetFiscalYear] = useState(new Date().getFullYear().toString());
  const [vendorName, setVendorName] = useState('');
  const [items, setItems] = useState<any[]>([
    { itemName: '', categoryId: '', brand: '', specs: '', quantity: 1, unit: 'Unit', estimatedPrice: 0 },
  ]);
  const [creating, setCreating] = useState(false);

  // Detail Modal State
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [viewingRequest, setViewingRequest] = useState<any>(null);

  // Receive & Auto-Asset Modal State
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [receiveLocationId, setReceiveLocationId] = useState('');
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    fetchRequests();
    fetchMetadata();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/procurement');
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch {
      showToast('Gagal memuat usulan pengadaan', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [deptRes, catRes, locRes] = await Promise.all([
        fetch('/api/departments'),
        fetch('/api/categories'),
        fetch('/api/rooms'),
      ]);
      if (deptRes.ok) setDepartments(await deptRes.json());
      if (catRes.ok) setCategories(await catRes.json());
      if (locRes.ok) setLocations(await locRes.json());
    } catch {}
  };

  const handleAddItemRow = () => {
    setItems([
      ...items,
      { itemName: '', categoryId: categories[0]?.id || '', brand: '', specs: '', quantity: 1, unit: 'Unit', estimatedPrice: 0 },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const handleCreateRequest = async () => {
    if (!title.trim() || !departmentId) {
      showToast('Judul usulan dan jurusan/unit pemohon wajib diisi', 'error');
      return;
    }

    const validItems = items.filter((it) => it.itemName.trim() && it.categoryId);
    if (validItems.length === 0) {
      showToast('Minimal 1 item barang harus memiliki nama barang dan kategori', 'error');
      return;
    }

    try {
      setCreating(true);
      const res = await fetch('/api/procurement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          departmentId,
          targetFiscalYear: parseInt(targetFiscalYear),
          vendorName: vendorName.trim() || null,
          items: validItems.map((it) => ({
            itemName: it.itemName.trim(),
            categoryId: it.categoryId,
            quantity: Math.max(1, parseInt(it.quantity || 1)),
            unit: it.unit || 'Unit',
            estimatedPrice: Math.max(0, parseFloat(it.estimatedPrice || 0)),
            specs: it.specs?.trim() || null,
          })),
        }),
      });

      if (res.ok) {
        showToast('Usulan pengadaan berhasil diajukan!', 'success');
        setCreateModalOpen(false);
        setTitle('');
        setDepartmentId('');
        setVendorName('');
        setItems([
          { itemName: '', categoryId: categories[0]?.id || '', brand: '', specs: '', quantity: 1, unit: 'Unit', estimatedPrice: 0 },
        ]);
        fetchRequests();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal mengajukan pengadaan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleApprove = async (id: string, newStatus: 'APPROVED_SARPRAS' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/procurement/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        showToast(`Usulan pengadaan berhasil ${newStatus === 'APPROVED_SARPRAS' ? 'disetujui' : 'ditolak'}`, 'success');
        fetchRequests();
      }
    } catch {
      showToast('Gagal memproses persetujuan', 'error');
    }
  };

  const handleExecuteReceive = async () => {
    if (!selectedRequest) return;
    try {
      setReceiving(true);
      const res = await fetch(`/api/procurement/${selectedRequest.id}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: receiveLocationId || null,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        showToast(result.message, 'success');
        setReceiveModalOpen(false);
        setSelectedRequest(null);
        fetchRequests();
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal menerima barang', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setReceiving(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    return filterStatus === 'ALL' || r.status === filterStatus;
  });

  const totalBudget = requests.reduce((sum, r) => sum + (r.estimatedBudget || 0), 0);
  const totalApproved = requests.filter((r) => r.status === 'APPROVED_SARPRAS' || r.status === 'IN_PURCHASE').length;
  const totalReceived = requests.filter((r) => r.status === 'RECEIVED').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1280px', margin: '0 auto' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'rgba(34, 197, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingBag size={22} color="var(--color-success)" />
            </div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Usulan & Pengadaan Aset Sarpras</h1>
          </div>
          <p style={{ color: 'var(--color-muted)', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            Siklus pengusulan barang dari jurusan, approval anggaran, dan otomatisasi registrasi aset katalog saat penerimaan.
          </p>
        </div>

        <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
          <Plus size={16} /> Buat Usulan Pengadaan
        </Button>
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Usulan Pengadaan
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem' }}>{requests.length}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Tahun Anggaran Berjalan</div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Disetujui / Proses Beli
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--color-primary-light)' }}>
            {totalApproved}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Siap proses pengadaan</div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Barang Diterima (Teregistrasi)
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--color-success)' }}>
            {totalReceived}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>Aset aktif & QR tercetak</div>
        </Card>

        <Card style={{ padding: '1.25rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Estimasi Anggaran
          </div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, marginTop: '0.4rem', color: 'var(--color-text)' }}>
            {formatCurrency(totalBudget)}
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-muted)', marginTop: '0.2rem' }}>RAB Usulan Keseluruhan</div>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {[
          { id: 'ALL', label: 'Semua Status' },
          { id: 'SUBMITTED', label: 'Diajukan' },
          { id: 'APPROVED_SARPRAS', label: 'Disetujui Sarpras' },
          { id: 'RECEIVED', label: 'Diterima & Terdaftar Aset' },
          { id: 'REJECTED', label: 'Ditolak' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            style={{
              padding: '0.45rem 0.9rem',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: filterStatus === tab.id ? '1px solid var(--color-primary)' : '1px solid var(--color-border)',
              background: filterStatus === tab.id ? 'var(--color-primary)' : 'var(--color-surface)',
              color: filterStatus === tab.id ? '#fff' : 'var(--color-text)',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests Table */}
      <Card style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', color: 'var(--color-muted)', fontWeight: 700 }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Nomor & Judul Usulan</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Unit / Jurusan</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Rincian Barang</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Estimasi Anggaran</th>
                <th style={{ padding: '0.85rem 1.25rem' }}>Status Usulan</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Aksi Persetujuan & Penerimaan</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                    Memuat daftar usulan pengadaan...
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: 'var(--color-muted)' }}>
                    Belum ada data usulan pengadaan yang sesuai filter.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req) => {
                  const itemCount = req.items?.length || 0;
                  const totalUnits = (req.items || []).reduce((s: number, i: any) => s + (i.quantity || 1), 0);

                  return (
                    <tr key={req.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--color-text)' }}>{req.title}</div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem' }}>
                          <span style={{ fontFamily: 'monospace', fontSize: '0.78rem', color: 'var(--color-primary-light)' }}>
                            {req.requestNumber}
                          </span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-muted)' }}>
                            &bull; TA {req.targetFiscalYear}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600 }}>{req.department?.name || 'Unit Kampus'}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)' }}>
                          Pemohon: {req.requestedBy?.name || '-'}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <div style={{ fontWeight: 600 }}>{itemCount} Macam Barang ({totalUnits} Unit)</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--color-muted)', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {(req.items || []).map((i: any) => `${i.itemName} (${i.quantity})`).join(', ')}
                        </div>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', fontWeight: 700 }}>
                        {formatCurrency(req.estimatedBudget || 0)}
                      </td>

                      <td style={{ padding: '1rem 1.25rem' }}>
                        <span
                          style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.2rem 0.6rem',
                            borderRadius: 'var(--radius-sm)',
                            background:
                              req.status === 'RECEIVED'
                                ? 'rgba(34, 197, 94, 0.15)'
                                : req.status === 'APPROVED_SARPRAS'
                                ? 'rgba(59, 130, 246, 0.15)'
                                : req.status === 'REJECTED'
                                ? 'rgba(239, 68, 68, 0.15)'
                                : 'rgba(234, 179, 8, 0.15)',
                            color:
                              req.status === 'RECEIVED'
                                ? 'var(--color-success)'
                                : req.status === 'APPROVED_SARPRAS'
                                ? 'var(--color-primary)'
                                : req.status === 'REJECTED'
                                ? '#ef4444'
                                : '#eab308',
                          }}
                        >
                          {req.status === 'SUBMITTED' && 'Diajukan'}
                          {req.status === 'APPROVED_SARPRAS' && 'Disetujui Sarpras'}
                          {req.status === 'RECEIVED' && 'Diterima & Teregistrasi'}
                          {req.status === 'REJECTED' && 'Ditolak'}
                        </span>
                      </td>

                      <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setViewingRequest(req);
                              setDetailModalOpen(true);
                            }}
                          >
                            <Eye size={14} /> Detail
                          </Button>

                          {req.status === 'SUBMITTED' && (
                            <>
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => handleApprove(req.id, 'APPROVED_SARPRAS')}
                              >
                                <Check size={14} /> Setujui
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleApprove(req.id, 'REJECTED')}
                              >
                                Tolak
                              </Button>
                            </>
                          )}

                          {req.status === 'APPROVED_SARPRAS' && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(req);
                                setReceiveModalOpen(true);
                              }}
                            >
                              <Truck size={14} /> Terima & Registrasi Aset
                            </Button>
                          )}

                          {req.status === 'RECEIVED' && (
                            <Link href="/dashboard/assets" className="btn btn-secondary btn-sm">
                              Lihat di Katalog Aset
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: Buat Usulan Pengadaan */}
      {createModalOpen && (
        <Modal
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          title="Buat Usulan Pengadaan Sarpras Baru"
          maxWidth="1060px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Judul Pengadaan *
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Misal: Pengadaan Proyektor & TV Interaktif Lab 2"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Jurusan / Unit Pemohon *
                </label>
                <select
                  className="input-field"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Pilih Jurusan / Departemen --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Tahun Anggaran
                </label>
                <input
                  type="number"
                  className="input-field"
                  value={targetFiscalYear}
                  onChange={(e) => setTargetFiscalYear(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                  Toko / Vendor Rekanan (Opsional)
                </label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="Misal: PT Teknologi Cemerlang"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Item Rows Table */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--color-text)' }}>
                    Rincian Barang Yang Diusulkan
                  </span>
                  <p style={{ fontSize: '0.78rem', color: 'var(--color-muted)', margin: '0.1rem 0 0 0' }}>
                    Cantumkan nama barang, jumlah, satuan, estimasi harga satuan, dan spesifikasi/keterangan.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleAddItemRow}>
                  <Plus size={14} /> Tambah Baris Barang
                </Button>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', minWidth: '920px' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.65rem 0.6rem', width: '35px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '0.65rem 0.6rem', width: '220px' }}>Nama Barang *</th>
                      <th style={{ padding: '0.65rem 0.6rem', width: '140px' }}>Kategori *</th>
                      <th style={{ padding: '0.65rem 0.6rem', width: '75px', textAlign: 'center' }}>Jumlah *</th>
                      <th style={{ padding: '0.65rem 0.6rem', width: '95px' }}>Satuan</th>
                      <th style={{ padding: '0.65rem 0.6rem', width: '130px', textAlign: 'right' }}>Harga Satuan (Rp)</th>
                      <th style={{ padding: '0.65rem 0.6rem', width: '130px', textAlign: 'right' }}>Total Harga</th>
                      <th style={{ padding: '0.65rem 0.6rem' }}>Keterangan / Spesifikasi</th>
                      <th style={{ padding: '0.65rem 0.6rem', width: '38px', textAlign: 'center' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const qty = Math.max(1, parseInt(it.quantity || 1));
                      const price = Math.max(0, parseFloat(it.estimatedPrice || 0));
                      const subtotal = qty * price;

                      return (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--color-border)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)' }}>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center', color: 'var(--color-muted)', fontWeight: 600 }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="Nama barang..."
                              value={it.itemName}
                              onChange={(e) => handleItemChange(idx, 'itemName', e.target.value)}
                              style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.55rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <select
                              className="input-field"
                              value={it.categoryId}
                              onChange={(e) => handleItemChange(idx, 'categoryId', e.target.value)}
                              style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.55rem' }}
                            >
                              <option value="">Kategori...</option>
                              {categories.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <input
                              type="number"
                              min="1"
                              className="input-field"
                              value={it.quantity}
                              onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                              style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.4rem', textAlign: 'center' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <select
                              className="input-field"
                              value={it.unit || 'Unit'}
                              onChange={(e) => handleItemChange(idx, 'unit', e.target.value)}
                              style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.4rem' }}
                            >
                              <option value="Unit">Unit</option>
                              <option value="Pcs">Pcs</option>
                              <option value="Set">Set</option>
                              <option value="Buah">Buah</option>
                              <option value="Paket">Paket</option>
                              <option value="Rim">Rim</option>
                              <option value="Dus">Dus</option>
                              <option value="Box">Box</option>
                              <option value="Meter">Meter</option>
                              <option value="Roll">Roll</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <input
                              type="number"
                              min="0"
                              step="1000"
                              className="input-field"
                              placeholder="0"
                              value={it.estimatedPrice}
                              onChange={(e) => handleItemChange(idx, 'estimatedPrice', e.target.value)}
                              style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.55rem', textAlign: 'right' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                            {formatCurrency(subtotal)}
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem' }}>
                            <input
                              type="text"
                              className="input-field"
                              placeholder="Merk, tipe, spek..."
                              value={it.specs || ''}
                              onChange={(e) => handleItemChange(idx, 'specs', e.target.value)}
                              style={{ width: '100%', fontSize: '0.82rem', padding: '0.45rem 0.55rem' }}
                            />
                          </td>
                          <td style={{ padding: '0.5rem 0.6rem', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveItemRow(idx)}
                              disabled={items.length <= 1}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: items.length <= 1 ? 'var(--color-border)' : '#ef4444',
                                cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                                padding: '0.2rem',
                              }}
                              title="Hapus baris"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Summary Bar */}
              <div
                style={{
                  marginTop: '0.75rem',
                  padding: '0.85rem 1.25rem',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--color-surface2)',
                  border: '1px solid var(--color-border)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.85rem' }}>
                  <span>
                    <strong style={{ color: 'var(--color-text)' }}>{items.length}</strong> Macam Barang
                  </span>
                  <span>
                    <strong style={{ color: 'var(--color-text)' }}>
                      {items.reduce((s, it) => s + Math.max(1, parseInt(it.quantity || 1)), 0)}
                    </strong> Total Fisik
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--color-muted)', fontWeight: 600 }}>
                    Total Estimasi Anggaran (RAB):
                  </span>
                  <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-success)' }}>
                    {formatCurrency(
                      items.reduce(
                        (s, it) =>
                          s + Math.max(1, parseInt(it.quantity || 1)) * Math.max(0, parseFloat(it.estimatedPrice || 0)),
                        0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setCreateModalOpen(false)} disabled={creating}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleCreateRequest} loading={creating}>
                Ajukan Usulan Pengadaan
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Detail Usulan Pengadaan */}
      {detailModalOpen && viewingRequest && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => {
            setDetailModalOpen(false);
            setViewingRequest(null);
          }}
          title={`Detail Usulan: ${viewingRequest.requestNumber}`}
          maxWidth="920px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', padding: '1rem', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>JUDUL PENGADAAN</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>{viewingRequest.title}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>UNIT / PEMOHON</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                  {viewingRequest.department?.name || '-'} ({viewingRequest.requestedBy?.name || '-'})
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>TAHUN ANGGARAN & VENDOR</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginTop: '0.2rem' }}>
                  TA {viewingRequest.targetFiscalYear} &bull; {viewingRequest.vendorName || 'Belum Ditentukan'}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', fontWeight: 600 }}>STATUS</div>
                <div style={{ marginTop: '0.25rem' }}>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.6rem',
                      borderRadius: 'var(--radius-sm)',
                      background:
                        viewingRequest.status === 'RECEIVED'
                          ? 'rgba(34, 197, 94, 0.15)'
                          : viewingRequest.status === 'APPROVED_SARPRAS'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : viewingRequest.status === 'REJECTED'
                          ? 'rgba(239, 68, 68, 0.15)'
                          : 'rgba(234, 179, 8, 0.15)',
                      color:
                        viewingRequest.status === 'RECEIVED'
                          ? 'var(--color-success)'
                          : viewingRequest.status === 'APPROVED_SARPRAS'
                          ? 'var(--color-primary)'
                          : viewingRequest.status === 'REJECTED'
                          ? '#ef4444'
                          : '#eab308',
                    }}
                  >
                    {viewingRequest.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                Daftar Rincian Barang ({viewingRequest.items?.length || 0} Macam):
              </div>
              <div style={{ overflowX: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-surface2)', borderBottom: '1px solid var(--color-border)', textAlign: 'left' }}>
                      <th style={{ padding: '0.65rem 0.75rem', width: '35px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Nama Barang</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Kategori</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Jumlah</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Satuan</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Harga Satuan</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>Total Harga</th>
                      <th style={{ padding: '0.65rem 0.75rem' }}>Keterangan / Spesifikasi</th>
                      <th style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>Status Aset</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(viewingRequest.items || []).map((it: any, idx: number) => {
                      const totalItemPrice = (it.quantity || 1) * (it.estimatedPrice || 0);
                      return (
                        <tr key={it.id || idx} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', color: 'var(--color-muted)' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', fontWeight: 600 }}>{it.itemName}</td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>{it.category?.name || '-'}</td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center', fontWeight: 700 }}>
                            {it.quantity}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem' }}>{it.unit || 'Unit'}</td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right' }}>
                            {formatCurrency(it.estimatedPrice || 0)}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'right', fontWeight: 700, color: 'var(--color-primary-light)' }}>
                            {formatCurrency(totalItemPrice)}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', color: 'var(--color-muted)' }}>
                            {it.specs || '-'}
                          </td>
                          <td style={{ padding: '0.65rem 0.75rem', textAlign: 'center' }}>
                            <span
                              style={{
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                padding: '0.15rem 0.5rem',
                                borderRadius: 'var(--radius-sm)',
                                background: it.isRegistered ? 'rgba(34, 197, 94, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                                color: it.isRegistered ? 'var(--color-success)' : 'var(--color-muted)',
                              }}
                            >
                              {it.isRegistered ? 'Terdaftar Aset' : 'Belum Terdaftar'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--color-surface2)', fontWeight: 700 }}>
                      <td colSpan={6} style={{ padding: '0.75rem', textAlign: 'right' }}>
                        Total Anggaran Pengadaan:
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', color: 'var(--color-success)', fontSize: '0.95rem' }}>
                        {formatCurrency(viewingRequest.estimatedBudget || 0)}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setDetailModalOpen(false)}>
                Tutup
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Penerimaan Barang & Registrasi Aset Otomatis */}
      {receiveModalOpen && selectedRequest && (
        <Modal
          isOpen={receiveModalOpen}
          onClose={() => setReceiveModalOpen(false)}
          title="Verifikasi Penerimaan Barang & Registrasi Otomatis"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)', borderRadius: 'var(--radius-md)', padding: '0.85rem', fontSize: '0.85rem' }}>
              <strong>Otomatisasi Sistem Sarpras:</strong> Tindakan ini akan secara otomatis membuat rekaman Aset Fisik baru ke dalam katalog master sistem lengkap dengan Kode Inventaris dan Token QR Code untuk setiap item barang yang telah datang.
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem' }}>
                Lokasi Ruangan / Gudang Penempatan Awal *
              </label>
              <select
                className="input-field"
                value={receiveLocationId}
                onChange={(e) => setReceiveLocationId(e.target.value)}
                style={{ width: '100%' }}
              >
                <option value="">-- Pos / Gudang Penerimaan Umum --</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name || loc.building} (Lt. {loc.floor || '1'} {loc.room ? `- ${loc.room}` : ''})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--color-muted)' }}>
              Pengadaan: <strong>{selectedRequest.title}</strong> ({selectedRequest.requestNumber})<br />
              Total Item: <strong>{selectedRequest.items?.length || 0} macam barang</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
              <Button variant="secondary" onClick={() => setReceiveModalOpen(false)} disabled={receiving}>
                Batal
              </Button>
              <Button variant="primary" onClick={handleExecuteReceive} loading={receiving}>
                <Truck size={15} /> Konfirmasi Penerimaan & Buat Aset
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
