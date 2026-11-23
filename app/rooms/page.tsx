'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { PublicNavbar } from '@/components/public/Navbar';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/lib/utils';
import { parseFacilities } from '@/lib/roomConstants';
import { MapPin, Users, Maximize, Search, Building2, Wifi, Tv, MonitorPlay, Speaker } from 'lucide-react';

export default function PublicRoomsPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/rooms?bookableOnly=true');
      if (res.ok) setRooms(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = rooms.filter((r) => {
    if (!r.isLoanable && !r.isRentable) return false;
    const matchStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || (r.code && r.code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchStatus && matchSearch;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--color-bg)' }}>
      <PublicNavbar />
      
      {/* Hero Section */}
      <div style={{ background: 'var(--grad-primary)', color: '#fff', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem', color: '#fff' }}>Sewa Ruangan Kami</h1>
        <p style={{ fontSize: '1.1rem', opacity: 0.9, maxWidth: '600px', margin: '0 auto' }}>
          Temukan ruangan yang tepat untuk rapat, presentasi, atau acara Anda.
        </p>
      </div>

      <main style={{ flex: 1, maxWidth: '1280px', margin: '-2rem auto 2rem', padding: '0 1.5rem', width: '100%', position: 'relative', zIndex: 10 }}>
        
        {/* Search Bar */}
        <div style={{ background: 'var(--color-surface)', padding: '1.5rem', borderRadius: 'var(--radius-lg)', boxShadow: '0 8px 30px rgba(0,0,0,0.08)', marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 300px', display: 'flex', alignItems: 'center', background: 'var(--color-surface2)', borderRadius: 'var(--radius-md)', padding: '0.5rem 1rem' }}>
            <Search size={20} style={{ color: 'var(--color-muted)', marginRight: '0.5rem' }} />
            <input 
              placeholder="Cari nama atau kode ruangan..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ background: 'transparent', border: 'none', outline: 'none', width: '100%', fontSize: '1rem' }}
            />
          </div>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)', background: 'var(--color-surface)' }}
          >
            <option value="ALL">Semua Status</option>
            <option value="AVAILABLE">Tersedia</option>
            <option value="MAINTENANCE">Maintenance</option>
          </select>
        </div>

        {/* Room Grid */}
        {loading ? (
          <div className="catalog-grid">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: '380px', background: 'var(--color-surface2)', borderRadius: 'var(--radius-lg)', animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)' }}>
            <Building2 size={48} style={{ color: 'var(--color-border)', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tidak ada ruangan ditemukan</h3>
            <p style={{ color: 'var(--color-muted)' }}>Coba gunakan kata kunci atau filter status yang berbeda.</p>
          </div>
        ) : (
          <div className="catalog-grid">
            {filtered.map(room => {
              const photos = room.photos ? JSON.parse(room.photos) : [];
              const facilities = parseFacilities(room.facilities);
              const photoUrl = photos.length > 0 ? photos[0] : null;

              return (
                <Link href={`/rooms/${room.id}`} key={room.id} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
                  <div 
                    style={{ 
                      background: 'var(--color-surface)', 
                      borderRadius: 'var(--radius-lg)', 
                      overflow: 'hidden', 
                      boxShadow: '0 4px 15px rgba(0,0,0,0.05)',
                      transition: 'transform 0.2s, boxShadow 0.2s',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 25px rgba(0,0,0,0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.05)';
                    }}
                  >
                    {/* Image Area */}
                    <div style={{ height: '200px', background: photoUrl ? `url(${photoUrl}) center/cover` : 'var(--color-surface2)', position: 'relative' }}>
                      <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
                        <Badge status={room.status} />
                      </div>
                      {room.code && (
                        <div style={{ position: 'absolute', bottom: '12px', left: '12px', background: 'rgba(0,0,0,0.7)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
                          {room.code}
                        </div>
                      )}
                    </div>

                    {/* Content Area */}
                    <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.25rem', lineHeight: 1.3 }}>{room.name}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--color-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                        <MapPin size={14} />
                        {room.building} {room.floor ? `— ${room.floor}` : ''}
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
                        {room.capacity && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-muted)' }}>
                            <Users size={16} style={{ color: 'var(--color-primary)' }}/> {room.capacity} org
                          </div>
                        )}
                        {room.area && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--color-muted)' }}>
                            <Maximize size={16} style={{ color: 'var(--color-accent)' }}/> {room.area} m²
                          </div>
                        )}
                      </div>

                      {facilities.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
                          {facilities.slice(0, 3).map((f, i: number) => (
                            <span key={i} style={{ background: 'var(--color-surface2)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-muted)' }}>
                              {f.name}{f.qty > 1 ? ` (${f.qty})` : ''}
                            </span>
                          ))}
                          {facilities.length > 3 && (
                            <span style={{ background: 'var(--color-surface2)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-muted)' }}>
                              +{facilities.length - 3}
                            </span>
                          )}
                        </div>
                      )}

                      <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
                        <div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-muted)', marginBottom: '0.1rem' }}>Mulai dari</div>
                          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)' }}>{room.pricePerHour ? formatCurrency(room.pricePerHour) : 'Rp 0'}<span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-muted)' }}>/jam</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
