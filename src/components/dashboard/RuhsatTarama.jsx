import { useState, useRef, useEffect } from 'react'

const RuhsatTarama = ({ onDoldur, markalar = [], modeller = {} }) => {
  const [durum, setDurum] = useState('idle')
  const [mesaj, setMesaj] = useState('')
  const [kredi, setKredi] = useState(null)
  const inputRef = useRef(null)

  useEffect(() => {
    // Kredi bakiyesini kontrol et
    fetch('/api/kredi').then(r => r.json()).then(d => {
      if (d.ok) setKredi(d.kredi)
    }).catch(() => {})
  }, [])

  const handleDosya = async (e) => {
    const dosya = e.target.files[0]
    if (!dosya) return
    setDurum('yukleniyor')
    setMesaj('')

    try {
      // Görseli sıkıştır ve base64'e çevir
      const { base64, mediaType } = await new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            // Max 1200px
            const maxW = 1200
            let w = img.width, h = img.height
            if (w > maxW) { h = Math.round(h * maxW / w); w = maxW }
            canvas.width = w; canvas.height = h
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, w, h)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg' })
          }
          img.onerror = () => reject(new Error('Görsel yüklenemedi'))
          img.src = reader.result
        }
        reader.onerror = () => reject(new Error('Dosya okuma hatası'))
        reader.readAsDataURL(dosya)
      })

      const response = await fetch('/api/ruhsat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mediaType, markalar, modeller }),
      })

      if (!response.ok) throw new Error('Sunucu hatası: ' + response.status)

      const data = await response.json()

      if (data.ok && data.bilgiler) {
        onDoldur(data.bilgiler)
        setDurum('basari')
        setMesaj('Bilgiler otomatik dolduruldu!')
        // Krediyi güncelle
        fetch('/api/kredi').then(r => r.json()).then(d => {
          if (d.ok) setKredi(d.kredi)
        }).catch(() => {})
      } else {
        setDurum('hata')
        setMesaj(data.error || 'Ruhsat okunamadı, lütfen manuel girin.')
      }
    } catch (err) {
      setDurum('hata')
      setMesaj('Hata: ' + err.message)
    }

    if (inputRef.current) inputRef.current.value = ''
  }

  const renkler = {
    idle:       { border: 'var(--border)',          bg: 'var(--bg-elevated)' },
    yukleniyor: { border: '#3b82f6',                bg: 'rgba(59,130,246,.06)' },
    basari:     { border: '#22c55e',                bg: 'rgba(34,197,94,.06)' },
    hata:       { border: '#e5484d',                bg: 'rgba(229,72,77,.06)' },
  }
  const r = renkler[durum]

  return (
    <div style={{ marginBottom: '1rem' }}>
      {/* Kredi gösterimi */}
      {kredi !== null && (
        <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:'4px' }}>
          <span style={{
            fontSize:'10px', color: kredi < 1 ? '#e5484d' : kredi < 2 ? '#f5a623' : '#22c55e',
            background:'var(--bg-elevated)', border:'1px solid var(--border)',
            borderRadius:'20px', padding:'2px 8px'
          }}>
            💳 Kalan kredi: ${kredi.toFixed(2)}
          </span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
        onChange={handleDosya}
        style={{ display: 'none' }}
      />

      <div style={{
        border: `1.5px dashed ${r.border}`,
        borderRadius: '8px', padding: '10px 14px',
        background: r.bg,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px',
        transition: 'all .2s',
      }}>
        {durum === 'yukleniyor' ? (
          <span style={{ color: '#3b82f6', fontSize: '13px' }}>⏳ AI ile okunuyor...</span>
        ) : durum === 'basari' ? (
          <>
            <span style={{ color: '#22c55e', fontSize: '13px' }}>✅ {mesaj}</span>
            <button type="button" className="btn btn-secondary btn-sm"
              onClick={() => {
                setDurum('idle')
                onDoldur({ plaka:'', marka:'', model:'', yil:'', renk:'', sasi_no:'', motor_no:'', yakit_tipi:'' })
                inputRef.current?.click()
              }}>
              Tekrar
            </button>
          </>
        ) : (
          <>
            <div>
              <div style={{ color:'var(--text-primary)', fontSize:'13px', fontWeight:500, marginBottom:'2px' }}>
                📷 Ruhsat Tarama
              </div>
              <div style={{ color:'var(--text-muted)', fontSize:'11px' }}>
                Fotoğraf çek veya galeriden seç → bilgiler otomatik dolar
              </div>
              {durum === 'hata' && (
                <div style={{ color:'#e5484d', fontSize:'11px', marginTop:'3px' }}>⚠️ {mesaj}</div>
              )}
            </div>
            <button type="button" className="btn btn-primary btn-sm"
              onClick={() => inputRef.current?.click()}>
              {durum === 'hata' ? 'Tekrar' : 'Tara'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default RuhsatTarama
