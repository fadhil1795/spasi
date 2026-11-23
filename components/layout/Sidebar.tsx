'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  LayoutDashboard,
  HelpCircle,
  ArrowRightLeft,
  Activity,
  Box,
  Tag,
  Wrench,
  CalendarCheck,
  Receipt,
  FileSpreadsheet,
  Settings,
  LogOut,
  QrCode,
  SlidersHorizontal,
  Building2,
  CalendarRange,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  ChevronRight,
  User,
  CreditCard,
  Shield,
  FileText,
  Users,
  CheckSquare,
  HardDrive,
  AlertCircle,
  UserCheck,
  ShieldAlert,
  ClipboardCheck,
  Users2,
  Handshake,
  Coins,
  MessageSquare,
  ShoppingBag,
  Package,
  Bookmark,
} from 'lucide-react';

interface SubMenuItem {
  label: string;
  href: string;
  icon: any;
  roles?: string[];
}

interface MenuItem {
  label: string;
  href: string;
  icon: any;
  roles?: string[];
  children?: SubMenuItem[];
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ collapsed, setCollapsed }) => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const currentTab = searchParams.get('tab') || 'profile';

  const [openGroups, setOpenGroups] = React.useState<Record<number, boolean>>({
    0: true, 1: true, 2: true, 3: true, 4: true, 5: true
  });

  const [openSubMenus, setOpenSubMenus] = React.useState<Record<string, boolean>>({
    '/dashboard/settings': true
  });

  const toggleGroup = (idx: number) => {
    setOpenGroups(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  const toggleSubMenu = (href: string) => {
    setOpenSubMenus(prev => ({ ...prev, [href]: !prev[href] }));
  };

  const userRole = (session?.user as any)?.role || 'BORROWER';

  const menuGroups: MenuGroup[] = [
    {
      title: 'MENU UTAMA',
      items: [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Katalog Fasilitas', href: '/dashboard/catalog', icon: Building2 },
        { label: 'Panduan Penggunaan', href: '/guide', icon: HelpCircle },
      ]
    },
    {
      title: 'LAYANAN SAYA',
      items: [
        { label: 'Keranjang Saya', href: '/dashboard/cart', icon: Receipt },
        { label: 'Peminjaman Saya', href: '/dashboard/loans?mode=my', icon: CalendarCheck },
        { label: 'Sewa & Booking Saya', href: '/dashboard/rentals?mode=my', icon: CalendarRange },
        { label: 'Tagihan & Denda', href: '/dashboard/penalties', icon: AlertCircle },
        { label: 'Ganti Rugi & Klaim', href: '/dashboard/claims', icon: ShieldAlert },
        { label: 'Riwayat Transaksi', href: '/dashboard/history', icon: FileSpreadsheet },
        { label: 'Verifikasi Akun', href: '/dashboard/verification', icon: UserCheck, roles: ['BORROWER'] },
      ]
    },
    {
      title: 'SIRKULASI & OPERASIONAL',
      items: [
        { label: 'Scan QR Cepat', href: '/dashboard/loans/scan', icon: QrCode, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Kelola Peminjaman', href: '/dashboard/loans', icon: CalendarCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF', 'APPROVER'] },
        { label: 'Kelola Sewa & Ruang', href: '/dashboard/rentals', icon: CalendarRange, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Serah Terima Aset', href: '/dashboard/handovers', icon: ClipboardCheck, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Manajemen Denda', href: '/dashboard/admin/penalties', icon: AlertCircle, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
      ]
    },
    {
      title: 'SARANA & PRASARANA',
      items: [
        { label: 'Data Aset', href: '/dashboard/assets', icon: Box, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Data Ruangan', href: '/dashboard/rooms', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Gedung & Unit Fakultas', href: '/dashboard/buildings', icon: Building2, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Mutasi Aset', href: '/dashboard/transfers', icon: ArrowRightLeft, roles: ['SUPER_ADMIN', 'ADMIN', 'APPROVER', 'STAFF'] },
        { label: 'Stock Opname QR', href: '/dashboard/stock-opname', icon: QrCode, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Pengadaan Aset', href: '/dashboard/procurement', icon: ShoppingBag, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        {
          label: 'Barang Habis Pakai',
          href: '/dashboard/consumables',
          icon: Package,
          roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'],
          children: [
            { label: 'Stok & Transaksi ATK', href: '/dashboard/consumables', icon: Package, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
            { label: 'Import ATK', href: '/dashboard/consumables?action=import', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
          ],
        },
        { label: 'Maintenance & Servis', href: '/dashboard/maintenance', icon: Wrench, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
      ]
    },
    {
      title: 'PENGGUNA & KEUANGAN',
      items: [
        { label: 'Peminjam & Relasi (CRM)', href: '/dashboard/crm', icon: Users, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Verifikasi Pengguna', href: '/dashboard/verifications', icon: UserCheck, roles: ['SUPER_ADMIN', 'ADMIN'] },
        { label: 'Manajemen User & Akses', href: '/dashboard/admin/users', icon: Shield, roles: ['SUPER_ADMIN'] },
        { label: 'Buku Kas & Keuangan', href: '/dashboard/finance', icon: Coins, roles: ['SUPER_ADMIN', 'ADMIN'] },
        { label: 'Mitra & Komisi', href: '/dashboard/admin/partners', icon: Handshake, roles: ['SUPER_ADMIN', 'ADMIN'] },
      ]
    },
    {
      title: 'SISTEM & LAPORAN',
      items: [
        { label: 'Laporan & Rekapitulasi', href: '/dashboard/reports', icon: FileSpreadsheet, roles: ['SUPER_ADMIN', 'ADMIN', 'APPROVER'] },
        { label: 'Kategori & Klasifikasi', href: '/dashboard/categories', icon: Tag, roles: ['SUPER_ADMIN', 'ADMIN'] },
        { label: 'Master Data Merek', href: '/dashboard/brands', icon: Bookmark, roles: ['SUPER_ADMIN', 'ADMIN', 'STAFF'] },
        { label: 'Utilitas Sistem', href: '/dashboard/tools', icon: SlidersHorizontal, roles: ['SUPER_ADMIN', 'ADMIN'] },
        { label: 'Log Sistem & Audit', href: '/dashboard/logs', icon: Activity, roles: ['SUPER_ADMIN', 'ADMIN'] },
        {
          label: 'Profil & Akun Saya',
          href: '/dashboard/profile',
          icon: User,
        },
        {
          label: 'Pengaturan',
          href: '/dashboard/settings?tab=whatsapp',
          icon: Settings,
          roles: ['SUPER_ADMIN', 'ADMIN'],
          children: [
            { label: 'WhatsApp Gateway', href: '/dashboard/settings?tab=whatsapp', icon: MessageSquare, roles: ['SUPER_ADMIN', 'ADMIN'] },
            { label: 'Rekening & QRIS', href: '/dashboard/settings?tab=payment', icon: CreditCard, roles: ['SUPER_ADMIN', 'ADMIN'] },
            { label: 'Sistem & Otomatisasi', href: '/dashboard/settings?tab=system', icon: Shield, roles: ['SUPER_ADMIN', 'ADMIN'] },
            { label: 'Kelola Kebijakan & Aturan', href: '/dashboard/settings?tab=policies', icon: ShieldAlert, roles: ['SUPER_ADMIN', 'ADMIN'] },
            { label: 'Penyimpanan S3 / MinIO', href: '/dashboard/settings?tab=storage', icon: HardDrive, roles: ['SUPER_ADMIN', 'ADMIN'] },
            { label: 'Template Dokumen', href: '/dashboard/settings?tab=template', icon: FileText, roles: ['SUPER_ADMIN', 'ADMIN'] },
            { label: 'Template Checklist', href: '/dashboard/settings/checklists', icon: CheckSquare, roles: ['SUPER_ADMIN', 'ADMIN'] },
          ]
        },
      ]
    }
  ];

  const filteredGroups = menuGroups.map(group => ({
    ...group,
    items: group.items
      .filter(item => !item.roles || item.roles.includes(userRole))
      .map(item => ({
        ...item,
        children: item.children ? item.children.filter((child: SubMenuItem) => !child.roles || child.roles.includes(userRole)) : undefined
      }))
  })).filter(group => group.items.length > 0);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    const [pathPart, queryPart] = href.split('?');
    if (pathname !== pathPart) return false;
    
    const targetMode = queryPart ? new URLSearchParams(queryPart).get('mode') : null;
    const currentMode = searchParams.get('mode');
    if (targetMode !== currentMode) return false;

    const targetTab = queryPart ? new URLSearchParams(queryPart).get('tab') : null;
    const currentTab = searchParams.get('tab');
    if (targetTab && currentTab && targetTab !== currentTab) return false;

    return true;
  };

  return (
    <>
      {/* Overlay untuk Mobile */}
      {!collapsed && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setCollapsed(true)} 
          title="Tutup Sidebar"
        />
      )}
      
      <aside className={`sidebar-container ${collapsed ? 'collapsed' : ''}`}>
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
          <div
            style={{
              padding: '1.25rem',
              borderBottom: '1px solid var(--color-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.85rem',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                minWidth: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--grad-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 900,
                fontSize: '1.2rem',
                boxShadow: 'var(--shadow-glow)',
              }}
            >
              S
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '0.02em' }}>SPASI</div>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', color: 'var(--color-muted)', fontWeight: 600 }}>
                  Management System
                </div>
              </div>
            )}

            <button
              onClick={() => setCollapsed(!collapsed)}
              style={{
                marginLeft: collapsed ? '0' : 'auto',
                background: 'transparent',
                border: 'none',
                color: 'var(--color-muted)',
                cursor: 'pointer',
                padding: '0.4rem',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface2)'; e.currentTarget.style.color = 'var(--color-text)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--color-muted)'; }}
              title={collapsed ? "Buka Sidebar" : "Tutup Sidebar"}
            >
              {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav style={{ flex: 1, padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', overflowY: 'auto' }}>
            {filteredGroups.map((group, groupIdx) => {
              const isOpen = collapsed ? true : openGroups[groupIdx];
              return (
                <div key={groupIdx} style={{ marginBottom: collapsed ? '0.5rem' : '1rem' }}>
                  {!collapsed && (
                    <button
                      onClick={() => toggleGroup(groupIdx)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '0.4rem 1rem',
                        marginBottom: '0.2rem',
                      }}
                    >
                      <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--color-muted)', letterSpacing: '0.05em' }}>
                        {group.title}
                      </span>
                      {isOpen ? <ChevronDown size={14} style={{ color: 'var(--color-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--color-muted)' }} />}
                    </button>
                  )}
                  {collapsed && groupIdx > 0 && (
                    <div style={{ height: '1px', background: 'var(--color-border)', margin: '0.5rem 1rem' }} />
                  )}
                  
                  {isOpen && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', animation: 'fadeInUp 0.2s ease' }}>
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.href);
                        const hasChildren = item.children && item.children.length > 0;
                        const isSubOpen = openSubMenus[item.href] ?? true;

                        if (!hasChildren || collapsed) {
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              title={collapsed ? item.label : undefined}
                              className={`sidebar-link ${active ? 'active' : ''}`}
                              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                            >
                              <Icon size={20} style={{ minWidth: '20px' }} />
                              {!collapsed && <span>{item.label}</span>}
                            </Link>
                          );
                        }

                        return (
                          <div key={item.href} style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
                            <Link
                              href={item.href}
                              className={`sidebar-link ${active ? 'parent-active' : ''}`}
                              style={{ paddingRight: '2.5rem', justifyContent: 'flex-start' }}
                            >
                              <Icon size={20} style={{ minWidth: '20px' }} />
                              <span>{item.label}</span>
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleSubMenu(item.href);
                              }}
                              style={{
                                position: 'absolute',
                                right: '0.5rem',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--color-muted)',
                                cursor: 'pointer',
                                padding: '0.4rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 'var(--radius-sm)',
                                zIndex: 5,
                              }}
                              title={isSubOpen ? 'Tutup Sub-menu' : 'Buka Sub-menu'}
                            >
                              {isSubOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                            {isSubOpen && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingLeft: '0.85rem', marginTop: '0.15rem' }}>
                                {item.children?.map((child: SubMenuItem) => {
                                  const ChildIcon = child.icon;
                                  const [childPath, childQuery] = child.href.split('?');
                                  const targetTab = childQuery ? new URLSearchParams(childQuery).get('tab') : null;
                                  const isChildActive = targetTab
                                    ? (pathname === childPath && currentTab === targetTab)
                                    : (pathname === childPath);
                                  return (
                                    <Link
                                      key={child.href}
                                      href={child.href}
                                      className={`sidebar-link ${isChildActive ? 'active' : ''}`}
                                      style={{ fontSize: '0.82rem', padding: '0.45rem 0.75rem', gap: '0.6rem' }}
                                    >
                                      <ChildIcon size={16} style={{ minWidth: '16px' }} />
                                      <span>{child.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Footer Profile */}
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--color-border)' }}>
          {!collapsed && session?.user && (
            <Link
              href="/dashboard/profile"
              title="Buka Profil & Akun Saya"
              style={{
                padding: '0.75rem',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface2)',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                textDecoration: 'none',
                color: 'inherit',
                border: pathname === '/dashboard/profile' ? '1px solid var(--color-primary)' : '1px solid transparent',
                transition: 'border-color 0.2s',
              }}
            >
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--grad-accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                }}
              >
                {session.user.name?.[0] || 'U'}
              </div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.user.name}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }}>
                  {session.user.email}
                </div>
                {(() => {
                  const getRoleInfo = (r: string) => {
                    switch (r) {
                      case 'SUPER_ADMIN':
                        return { label: 'Super Admin', color: '#A78BFA', bg: 'rgba(139, 92, 246, 0.15)', border: 'rgba(139, 92, 246, 0.3)' };
                      case 'ADMIN':
                        return { label: 'Admin Sarpras', color: '#60A5FA', bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)' };
                      case 'APPROVER':
                        return { label: 'Pimpinan', color: '#FBBF24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)' };
                      case 'STAFF':
                        return { label: 'Petugas', color: '#34D399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.3)' };
                      case 'BORROWER':
                      default:
                        return { label: 'Peminjam', color: '#22D3EE', bg: 'rgba(6, 182, 212, 0.15)', border: 'rgba(6, 182, 212, 0.3)' };
                    }
                  };
                  const roleBadge = getRoleInfo(userRole);
                  return (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        padding: '0.12rem 0.45rem',
                        borderRadius: '9999px',
                        color: roleBadge.color,
                        background: roleBadge.bg,
                        border: `1px solid ${roleBadge.border}`,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {roleBadge.label}
                    </span>
                  );
                })()}
              </div>
            </Link>
          )}

          <button
            onClick={async () => {
              try {
                await signOut({ redirect: false });
              } catch (e) {
                console.error(e);
              }
              window.location.href = '/login';
            }}
            className="sidebar-link"
            style={{
              width: '100%',
              color: 'var(--color-danger)',
              justifyContent: collapsed ? 'center' : 'flex-start',
            }}
          >
            <LogOut size={20} style={{ minWidth: '20px' }} />
            {!collapsed && <span>Keluar</span>}
          </button>
        </div>
      </aside>
    </>
  );
};
