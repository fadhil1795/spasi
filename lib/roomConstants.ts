export const ROOM_TYPES = [
  { value: 'CLASSROOM', label: 'Ruang Kelas / Teori', color: '#3b82f6' },
  { value: 'LABORATORY', label: 'Laboratorium / Praktikum', color: '#8b5cf6' },
  { value: 'AUDITORIUM', label: 'Aula / Serbaguna / Hall', color: '#ec4899' },
  { value: 'MEETING_ROOM', label: 'Ruang Rapat / Sidang', color: '#f59e0b' },
  { value: 'OFFICE', label: 'Ruang Kerja / Dosen / Kantor', color: '#10b981' },
  { value: 'STUDIO', label: 'Studio Multimedia / Podcast', color: '#06b6d4' },
  { value: 'STORAGE', label: 'Gudang / Penyimpanan', color: '#64748b' },
  { value: 'OTHER', label: 'Lainnya', color: '#94a3b8' },
];

export function getRoomTypeLabel(type?: string | null): string {
  const found = ROOM_TYPES.find((t) => t.value === type);
  return found ? found.label : 'Ruang Kelas / Teori';
}

export function getRoomTypeColor(type?: string | null): string {
  const found = ROOM_TYPES.find((t) => t.value === type);
  return found ? found.color : '#3b82f6';
}

export interface FacilityEntry {
  name: string;
  qty: number;
}

export function parseFacilities(raw: any): FacilityEntry[] {
  if (!raw) return [];
  let arr: any[] = [];
  if (Array.isArray(raw)) {
    arr = raw;
  } else if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) arr = parsed;
    } catch {
      return [];
    }
  }
  return arr
    .map((item) => {
      if (typeof item === 'string') return { name: item, qty: 1 };
      if (item && typeof item === 'object' && item.name) {
        return { name: String(item.name), qty: Math.max(1, parseInt(item.qty) || 1) };
      }
      return null;
    })
    .filter((x): x is FacilityEntry => x !== null);
}


