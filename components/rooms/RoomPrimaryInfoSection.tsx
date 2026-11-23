'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { ROOM_TYPES } from '@/lib/roomConstants';
import { Building2, Sparkles, Plus, X, Wand2 } from 'lucide-react';

export interface RoomPrimaryInfoData {
  code: string;
  name: string;
  roomType: string;
  buildingId: string;
  building: string;
  floor: string;
  room: string;
  departmentId: string;
  picName: string;
  picPhone: string;
}

interface RoomPrimaryInfoSectionProps {
  data: RoomPrimaryInfoData;
  onChange: (next: RoomPrimaryInfoData) => void;
  autoNamingDefault?: boolean;
}

export function RoomPrimaryInfoSection({
  data,
  onChange,
  autoNamingDefault = false,
}: RoomPrimaryInfoSectionProps) {
  const { showToast } = useToast();

  const [buildingsList, setBuildingsList] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [roomTypes, setRoomTypes] = useState<{ code: string; name: string; color?: string }[]>(
    ROOM_TYPES.map((t) => ({ code: t.value, name: t.label, color: t.color }))
  );

  // Auto-naming & Custom naming toggle
  const [autoNaming, setAutoNaming] = useState(autoNamingDefault);
  const [customFloorMode, setCustomFloorMode] = useState(false);

  // Inline custom RoomType creator
  const [showAddType, setShowAddType] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [savingType, setSavingType] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/buildings').then((r) => r.json()).catch(() => []),
      fetch('/api/departments').then((r) => r.json()).catch(() => []),
      fetch('/api/room-types').then((r) => r.json()).catch(() => []),
    ]).then(([bData, dData, tData]) => {
      if (Array.isArray(bData)) setBuildingsList(bData);
      if (Array.isArray(dData)) setDepartments(dData);
      if (Array.isArray(tData) && tData.length > 0) {
        setRoomTypes(tData);
      }
    });
  }, []);

  // Auto-generate standardized room name when autoNaming is ON
  useEffect(() => {
    if (!autoNaming) return;

    const typeObj = roomTypes.find((t) => t.code === data.roomType);
    const typeLabel = typeObj ? typeObj.name.split('/')[0].trim() : 'Ruangan';
    const roomPart = data.room?.trim() ? ` ${data.room.trim()}` : '';
    const buildingPart = data.building?.trim() ? ` — ${data.building.trim()}` : '';

    const generated = `${typeLabel}${roomPart}${buildingPart}`.trim();
    if (generated && generated !== data.name) {
      onChange({ ...data, name: generated });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoNaming, data.roomType, data.room, data.building, roomTypes]);

  const selectedBuildingObj = buildingsList.find((b) => b.id === data.buildingId) || null;

  // Detect if current floor is non-numeric or outside building floor range
  useEffect(() => {
    if (selectedBuildingObj && data.floor) {
      const num = parseInt(data.floor, 10);
      if (isNaN(num) || num < 1 || num > selectedBuildingObj.totalFloors || String(num) !== data.floor.trim()) {
        setCustomFloorMode(true);
      }
    }
  }, [selectedBuildingObj, data.floor]);

  const handleGenerateCode = () => {
    const bCode = selectedBuildingObj?.code || (data.building ? data.building.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4) : 'RNG');
    const floorNum = data.floor ? data.floor.replace(/[^0-9]/g, '').padStart(2, '0') || '01' : '01';
    const roomClean = data.room ? data.room.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 6) : '01';
    const generatedCode = `${bCode}-${floorNum}-${roomClean}`;
    onChange({ ...data, code: generatedCode });
  };

  const handleCreateCustomType = async () => {
    if (!newTypeName.trim()) return;
    try {
      setSavingType(true);
      const res = await fetch('/api/room-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTypeName.trim() }),
      });
      const created = await res.json();
      if (res.ok) {
        setRoomTypes((prev) => [...prev, created]);
        onChange({ ...data, roomType: created.code });
        setNewTypeName('');
        setShowAddType(false);
        showToast(`Tipe ruangan "${created.name}" berhasil ditambahkan!`, 'success');
      } else {
        showToast(created.error || 'Gagal menambah tipe ruangan', 'error');
      }
    } catch {
      showToast('Terjadi kesalahan jaringan', 'error');
    } finally {
      setSavingType(false);
    }
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '0.4rem',
    fontSize: '0.84rem',
    fontWeight: 600,
    color: 'var(--color-muted)',
  };

  return (
    <Card style={{ padding: '1.5rem' }}>
      <h3
        style={{
          fontSize: '1.05rem',
          fontWeight: 700,
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          color: 'var(--color-text)',
        }}
      >
        <Building2 size={18} style={{ color: 'var(--color-primary-light)' }} />
        A — Informasi Utama &amp; Standarisasi Penamaan
      </h3>

      {/* Baris 1: Tipe Ruangan, Gedung, Lantai, Nomor Ruang */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.15rem',
        }}
      >
        {/* 1. Tipe / Fungsi Ruangan (+ Custom) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Tipe / Fungsi Ruangan <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <button
              type="button"
              onClick={() => setShowAddType(!showAddType)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary-light)',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
            >
              {showAddType ? <><X size={12} /> Tutup</> : <><Plus size={12} /> Custom Tipe</>}
            </button>
          </div>

          {showAddType ? (
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                className="input-field"
                style={{ height: '40px', fontSize: '0.84rem', flex: 1 }}
                placeholder="mis. Ruang Sidang Senat"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateCustomType();
                  }
                }}
              />
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={savingType}
                onClick={handleCreateCustomType}
                style={{ height: '40px' }}
              >
                Simpan
              </Button>
            </div>
          ) : (
            <select
              className="input-field"
              value={data.roomType}
              onChange={(e) => onChange({ ...data, roomType: e.target.value })}
              style={{ width: '100%' }}
            >
              {roomTypes.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* 2. Gedung dari Master Gedung */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Gedung <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <Link
              href="/dashboard/buildings"
              target="_blank"
              style={{ fontSize: '0.73rem', color: 'var(--color-primary-light)', fontWeight: 700 }}
            >
              + Master Gedung
            </Link>
          </div>
          {buildingsList.length > 0 ? (
            <select
              className="input-field"
              value={data.buildingId}
              onChange={(e) => {
                const bId = e.target.value;
                const bObj = buildingsList.find((b) => b.id === bId);
                onChange({
                  ...data,
                  buildingId: bId,
                  building: bObj ? bObj.name : data.building,
                });
              }}
              style={{ width: '100%' }}
              required={!data.building}
            >
              <option value="">
                {data.building ? `-- ${data.building} (Manual) --` : '-- Pilih Gedung --'}
              </option>
              {buildingsList.map((b) => (
                <option key={b.id} value={b.id}>
                  [{b.code}] {b.name} ({b.totalFloors} Lt)
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              placeholder="Contoh: Gedung Kuliah Bersama"
              value={data.building}
              onChange={(e) => onChange({ ...data, building: e.target.value })}
              style={{ width: '100%' }}
              required
            />
          )}
        </div>

        {/* 3. Lantai (Seragam Dropdown + Opsi Custom) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--color-muted)' }}>
              Lantai
            </label>
            {selectedBuildingObj && (
              <button
                type="button"
                onClick={() => setCustomFloorMode(!customFloorMode)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-muted)',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {customFloorMode ? 'Pilih Dropdown' : 'Ketik Custom'}
              </button>
            )}
          </div>
          {selectedBuildingObj && !customFloorMode ? (
            <select
              className="input-field"
              value={data.floor}
              onChange={(e) => onChange({ ...data, floor: e.target.value })}
              style={{ width: '100%' }}
            >
              {Array.from({ length: selectedBuildingObj.totalFloors || 1 }, (_, i) => String(i + 1)).map((fl) => (
                <option key={fl} value={fl}>
                  Lantai {fl}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input-field"
              placeholder="Contoh: 1 / Basement"
              value={data.floor}
              onChange={(e) => onChange({ ...data, floor: e.target.value })}
              style={{ width: '100%' }}
            />
          )}
        </div>

        {/* 4. Nomor Ruang / Area Spesifik */}
        <div>
          <label style={labelStyle}>Nomor Ruang / Area Spesifik</label>
          <input
            className="input-field"
            placeholder="Contoh: 201 / B101 / Sayap Timur"
            value={data.room}
            onChange={(e) => onChange({ ...data, room: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* Baris 2: Kotak Standarisasi & Custom Nama Resmi Ruangan + Kode Ruangan */}
      <div
        style={{
          padding: '1rem',
          borderRadius: 'var(--radius-md)',
          background: 'var(--color-surface2)',
          border: '1px solid var(--color-border)',
          marginBottom: '1.15rem',
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '1rem',
        }}
      >
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Nama Resmi Ruangan <span style={{ color: 'var(--color-danger)' }}>*</span>
            </label>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.76rem', color: autoNaming ? 'var(--color-primary-light)' : 'var(--color-muted)', cursor: 'pointer', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={autoNaming}
                onChange={(e) => setAutoNaming(e.target.checked)}
                style={{ cursor: 'pointer', accentColor: 'var(--color-primary)' }}
              />
              <Sparkles size={13} />
              <span>{autoNaming ? 'Mode Standar Otomatis' : 'Mode Nama Custom (Ketik Bebas)'}</span>
            </label>
          </div>
          <input
            className="input-field"
            placeholder="Contoh: Aula Serbaguna Srikandi atau Ruang Kelas 201 - GKB"
            value={data.name}
            onChange={(e) => {
              setAutoNaming(false);
              onChange({ ...data, name: e.target.value });
            }}
            style={{ width: '100%' }}
            required
          />
          <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
            {autoNaming
              ? 'Nama tersusun otomatis dari Tipe + Nomor Ruang + Gedung. Ketik langsung di kolom untuk beralih ke Nama Custom.'
              : 'Mode Custom aktif: Anda bebas menentukan penamaan resmi ruangan sesuai kebutuhan kampus.'}
          </div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.45rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-text)' }}>
              Kode Ruangan
            </label>
            <button
              type="button"
              onClick={handleGenerateCode}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary-light)',
                fontSize: '0.73rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
              }}
              title="Generate kode standar dari Gedung + Lantai + Nomor Ruang"
            >
              <Wand2 size={12} /> Auto-Kode
            </button>
          </div>
          <input
            className="input-field"
            placeholder="Kosongkan utk Auto (GKB-01-201)"
            value={data.code}
            onChange={(e) => onChange({ ...data, code: e.target.value.toUpperCase() })}
            style={{ width: '100%', fontFamily: 'monospace', fontWeight: 700 }}
          />
          <div style={{ fontSize: '0.73rem', color: 'var(--color-muted)', marginTop: '0.3rem' }}>
            Dapat diisi custom atau klik Auto-Kode.
          </div>
        </div>
      </div>

      {/* Baris 3: Unit Pengelola, PIC & Kontak */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
        }}
      >
        <div>
          <label style={labelStyle}>Fakultas / Unit Pengelola</label>
          <select
            className="input-field"
            value={data.departmentId}
            onChange={(e) => onChange({ ...data, departmentId: e.target.value })}
            style={{ width: '100%' }}
          >
            <option value="">-- Dikelola Umum / Pusat --</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={labelStyle}>Penanggung Jawab (PIC / Kepala Lab)</label>
          <input
            className="input-field"
            placeholder="Contoh: Bpk. Ahmad, S.Kom"
            value={data.picName}
            onChange={(e) => onChange({ ...data, picName: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={labelStyle}>No. WhatsApp / Kontak PIC</label>
          <input
            className="input-field"
            placeholder="081234567890"
            value={data.picPhone}
            onChange={(e) => onChange({ ...data, picPhone: e.target.value })}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </Card>
  );
}

