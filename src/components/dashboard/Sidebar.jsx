import { useAuth } from '../../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  IconDashboard, IconUsers, IconTool, IconUser,
  IconSettings, IconChart, IconLogout, IconMenu
} from '../Icons'

// Admin ikonu
const IconShield = ({ size = 16, color = 'currentColor' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)

const NAV = [
  {
    section: 'Genel',
    items: [{ id: 'genel', Icon: IconDashboard, label: 'Genel Bakış' }]
  },
  {
    section: 'Yönetim',
    items: [
      { id: 'musteriler',  Icon: IconUsers,    label: 'Müşteriler' },
      { id: 'is-emirleri', Icon: IconTool,     label: 'İş Emirleri' },
      { id: 'personel',    Icon: IconUser,     label: 'Personel' },
    ]
  },
  {
    section: 'Sistem',
    items: [
      { id: 'tanimlamalar', Icon: IconSettings, label: 'Tanımlamalar' },
    ]
  },
  {
    section: 'Analiz',
    items: [
      { id: 'raporlar', Icon: IconChart, label: 'Raporlar', ustaPlusSiniri: true },
    ]
  }
]

const ADMIN_NAV = {
  section: 'Admin',
  items: [
    { id: 'yonetici-paneli', Icon: IconShield, label: 'Yönetici Paneli', adminOnly: true }
  ]
}

const Sidebar = ({ activePage, setActivePage, profile, mobileOpen, setMobileOpen }) => {
  const { signOut, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const initials = profile
    ? `${(profile.ad || '')[0] || ''}${(profile.soyad || '')[0] || ''}`.toUpperCase()
    : '?'

  const ustaPlusMi = ['admin', 'usta', 'yönetici'].includes(profile?.rol)
  const navGruplari = [
    ...NAV.map(g => ({
      ...g,
      items: g.items.filter(item => !item.ustaPlusSiniri || ustaPlusMi)
    })),
    ...(isAdmin ? [ADMIN_NAV] : [])
  ].filter(g => g.items.length > 0)

  return (
    <>
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.6)', zIndex:99 }} />
      )}

      <div className="sidebar" style={mobileOpen ? { display:'flex', zIndex:100 } : {}}>
        <div className="sidebar-brand" onClick={() => { setActivePage('genel'); setMobileOpen(false) }}
          style={{ cursor: 'pointer' }}>
          <img
            src="/logo.png"
            alt="Motorcum"
            style={{ width: 68, height: 68, borderRadius: 8, objectFit: 'contain' }}
            onError={e => {
              e.target.style.display = 'none'
              e.target.nextSibling.style.display = 'flex'
            }}
          />
          <div className="sidebar-logo" style={{ display: 'none' }}>
            <IconTool size={17} color="#fff" />
          </div>
          <span>MOTORCUM</span>
        </div>

        <nav className="sidebar-nav">
          {navGruplari.map(group => (
            <div key={group.section} className="nav-section">
              <div className="nav-section-title" style={group.section === 'Admin' ? { color: '#e5484d' } : {}}>
                {group.section === 'Admin' ? '🔒 ' : ''}{group.section}
              </div>
              {group.items.map(({ id, Icon, label }) => (
                <button
                  key={id}
                  className={`nav-item ${activePage === id ? 'active' : ''}`}
                  onClick={() => { setActivePage(id); setMobileOpen(false) }}
                  style={id === 'yonetici-paneli' ? {
                    background: activePage === id ? 'rgba(229,72,77,0.15)' : 'transparent',
                  } : {}}
                >
                  <Icon size={15} color={activePage === id ? '#e5484d' : id === 'yonetici-paneli' ? '#e5484d80' : '#4a5068'} />
                  {label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{profile ? `${profile.ad} ${profile.soyad}` : 'Kullanıcı'}</div>
              <div className="user-email">
                {profile?.kullanici_adi || 'kullanici'}
                {isAdmin && <span style={{ marginLeft: '4px', color: '#e5484d', fontSize: '9px', fontWeight: 700 }}>ADMIN</span>}
              </div>
            </div>
          </div>
          <button className="signout-btn" onClick={handleSignOut}>
            <IconLogout size={13} color="currentColor" />
            Çıkış Yap
          </button>
        </div>
      </div>
    </>
  )
}

export default Sidebar
