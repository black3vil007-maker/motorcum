import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useAuth } from '../../context/AuthContext'

const ROL_STIL = {
  admin:      { bg: 'rgba(229,72,77,.12)',    color: '#e5484d',  border: 'rgba(229,72,77,.25)',    label: '🔒 Admin' },
  yönetici:   { bg: 'rgba(229,72,77,.12)',    color: '#e5484d',  border: 'rgba(229,72,77,.25)',    label: '👑 Yönetici' },
  usta:       { bg: 'rgba(245,166,35,.12)',   color: '#f5a623',  border: 'rgba(245,166,35,.25)',   label: '⭐ Usta' },
  teknisyen:  { bg: 'rgba(59,130,246,.12)',   color: '#3b82f6',  border: 'rgba(59,130,246,.25)',   label: '🔧 Teknisyen' },
  kullanici:  { bg: 'rgba(100,100,120,.12)',  color: '#8890a8',  border: 'rgba(100,100,120,.25)',  label: '👤 Kullanıcı' },
}

const getRolStil = (rol) => ROL_STIL[rol] || ROL_STIL['kullanici']

const Personel = () => {
  const { isAdmin } = useAuth()
  const [kullanicilar, setKullanicilar] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState({ text: '', type: '' })

  useEffect(() => { fetchKullanicilar() }, [])

  const fetchKullanicilar = async () => {
    setLoading(true)
    // profiles tablosundan tüm kullanıcıları çek
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    setKullanicilar(data || [])
    setLoading(false)
  }

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 3000)
  }

  const toggleAktif = async (id, aktif) => {
    if (!isAdmin) return
    const { error } = await supabase
      .from('profiles')
      .update({ aktif: !aktif })
      .eq('id', id)
    if (!error) {
      // personel tablosundaki eşleşen kaydı da güncelle (email ile eşleştir)
      const kullanici = kullanicilar.find(k => k.id === id)
      if (kullanici?.email) {
        await supabase
          .from('personel')
          .update({ aktif: !aktif })
          .eq('email', kullanici.email)
      }
      setKullanicilar(prev => prev.map(k => k.id === id ? { ...k, aktif: !aktif } : k))
      showMsg(!aktif ? '✅ Kullanıcı aktif edildi.' : 'Kullanıcı pasif yapıldı.')
    }
  }

  const rolDegistir = async (id, yeniRol) => {
    if (!isAdmin) return
    const { error } = await supabase
      .from('profiles')
      .update({ rol: yeniRol })
      .eq('id', id)
    if (!error) {
      setKullanicilar(prev => prev.map(k => k.id === id ? { ...k, rol: yeniRol } : k))
      showMsg('Rol güncellendi.')
    }
  }

  const ROLLER = ['kullanici', 'teknisyen', 'usta', 'yönetici', 'admin']

  return (
    <div>
      {msg.text && (
        <div className={`alert ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`} style={{ marginBottom: '1rem' }}>
          {msg.text}
        </div>
      )}

      <div className="table-card">
        <div className="table-header">
          <span className="table-title">
            Personel & Kullanıcılar
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
              ({kullanicilar.length})
            </span>
          </span>
          {!isAdmin && (
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              🔒 Düzenleme sadece admin yetkisiyle
            </span>
          )}
        </div>

        {loading ? (
          <div className="empty-state"><p>Yükleniyor...</p></div>
        ) : kullanicilar.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">👨‍🔧</div>
            <p>Kayıtlı kullanıcı bulunamadı</p>
          </div>
        ) : (
          <>
            {/* Masaüstü */}
            <div className="desktop-only" style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Ad Soyad</th>
                    <th>Kullanıcı Adı</th>
                    <th>Rol</th>
                    <th>Telefon</th>
                    <th>E-posta</th>
                    <th>Kayıt Tarihi</th>
                    <th>Durum</th>
                    {isAdmin && <th>İşlem</th>}
                  </tr>
                </thead>
                <tbody>
                  {kullanicilar.map(k => {
                    const stil = getRolStil(k.rol)
                    return (
                      <tr key={k.id}>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                          {k.ad} {k.soyad}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                          @{k.kullanici_adi || '-'}
                        </td>
                        <td>
                          {isAdmin ? (
                            <select
                              value={k.rol || 'kullanici'}
                              onChange={e => rolDegistir(k.id, e.target.value)}
                              style={{
                                background: stil.bg,
                                color: stil.color,
                                border: `1px solid ${stil.border}`,
                                borderRadius: '20px',
                                padding: '3px 10px',
                                fontSize: '11px',
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif',
                                cursor: 'pointer',
                                outline: 'none',
                              }}
                            >
                              {ROLLER.map(r => (
                                <option key={r} value={r} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                                  {getRolStil(r).label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              padding: '3px 10px', borderRadius: '20px',
                              fontSize: '11px', fontWeight: 600,
                              background: stil.bg, color: stil.color,
                              border: `1px solid ${stil.border}`,
                            }}>
                              {stil.label}
                            </span>
                          )}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>{k.telefon || '-'}</td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{k.email || '-'}</td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                          {new Date(k.created_at).toLocaleDateString('tr-TR')}
                        </td>
                        <td>
                          <span className={`badge ${k.aktif ? 'badge-tamamlandi' : 'badge-iptal'}`}>
                            {k.aktif ? 'Aktif' : 'Pasif'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td>
                            {k.rol !== 'admin' && (
                              <button
                                className={`btn btn-sm ${k.aktif ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={() => toggleAktif(k.id, k.aktif)}
                              >
                                {k.aktif ? 'Pasif Yap' : 'Aktif Et'}
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobil */}
            <div className="mobile-only" style={{ padding: '8px' }}>
              {kullanicilar.map(k => {
                const stil = getRolStil(k.rol)
                return (
                  <div key={k.id} style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '12px',
                    marginBottom: '8px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '14px' }}>
                          {k.ad} {k.soyad}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{k.kullanici_adi || '-'}</div>
                      </div>
                      <span className={`badge ${k.aktif ? 'badge-tamamlandi' : 'badge-iptal'}`}>
                        {k.aktif ? 'Aktif' : 'Pasif'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        padding: '3px 10px', borderRadius: '20px',
                        fontSize: '11px', fontWeight: 600,
                        background: stil.bg, color: stil.color,
                        border: `1px solid ${stil.border}`,
                      }}>
                        {stil.label}
                      </span>
                      {isAdmin && k.rol !== 'admin' && (
                        <button
                          className={`btn btn-sm ${k.aktif ? 'btn-secondary' : 'btn-primary'}`}
                          onClick={() => toggleAktif(k.id, k.aktif)}
                        >
                          {k.aktif ? 'Pasif Yap' : 'Aktif Et'}
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Bilgi notu */}
      <div style={{
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '12px 16px',
        marginTop: '12px',
        fontSize: '12px',
        color: 'var(--text-muted)',
        lineHeight: 1.6,
      }}>
        💡 <strong style={{ color: 'var(--text-secondary)' }}>Nasıl çalışır?</strong> Kayıt olan kullanıcılar otomatik <strong>Pasif</strong> olarak eklenir.
        Admin kullanıcısı "Aktif Et" butonuyla onaylayınca login yapabilirler.
      </div>
    </div>
  )
}

export default Personel
