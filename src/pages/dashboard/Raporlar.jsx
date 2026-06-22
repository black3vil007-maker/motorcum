import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

// Bar chart - flex tabanlı, responsive
const BarChart = ({ data, color = '#e5484d' }) => {
  if (!data || data.length === 0) return (
    <div style={{height:120,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:'12px'}}>
      Yeterli veri yok
    </div>
  )
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{display:'flex',alignItems:'flex-end',gap:'6px',height:'130px',padding:'0 4px'}}>
      {data.map((d, i) => {
        const pct = max > 0 ? (d.value / max) * 100 : 0
        return (
          <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',height:'100%',justifyContent:'flex-end'}}>
            {d.value > 0 && (
              <span style={{fontSize:'11px',fontWeight:700,color,lineHeight:1}}>{d.value}</span>
            )}
            <div style={{
              width:'100%', borderRadius:'4px 4px 0 0',
              background: d.value > 0 ? color : 'var(--bg-elevated)',
              height: d.value > 0 ? `${Math.max(pct, 8)}%` : '4%',
              opacity: d.value > 0 ? 1 : 0.3,
              transition: 'height .4s ease',
              minHeight: '4px',
            }}/>
            <div style={{textAlign:'center'}}>
              <div style={{fontSize:'10px',color:'var(--text-muted)',fontWeight:500}}>{d.label}</div>
              <div style={{fontSize:'9px',color:'var(--text-muted)',opacity:.6}}>{d.sub||''}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Donut chart
const DonutChart = ({ segments, size = 110 }) => {
  const r = 40, cx = 55, cy = 55
  const circ = 2 * Math.PI * r
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1
  let offset = 0
  return (
    <svg width={size} height={size} viewBox="0 0 110 110">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--bg-elevated)" strokeWidth={13}/>
      {segments.map((seg, i) => {
        const pct = seg.value / total
        const dash = pct * circ
        const gap = circ - dash
        const el = <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={seg.color} strokeWidth={13}
          strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset}
          transform={`rotate(-90 ${cx} ${cy})`}/>
        offset += dash
        return el
      })}
      <text x={cx} y={cy-4} textAnchor="middle" fontSize={16} fontWeight={700} fill="var(--text-primary)">{total}</text>
      <text x={cx} y={cy+10} textAnchor="middle" fontSize={7} fill="var(--text-muted)">toplam</text>
    </svg>
  )
}

const Raporlar = () => {
  const [aralik, setAralik] = useState('hafta')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({
    toplamIs:0, tamamlanan:0, bekleyen:0, devamEden:0, iptal:0,
    toplamCiro:0, tahsilEdilen:0, kismiOdeme:0, bekleyenTahsilat:0,
    gunlukData:[], personelData:[], durumData:[], enCokMusteri:[]
  })

  useEffect(() => { fetchRapor() }, [aralik])

  const fetchRapor = async () => {
    setLoading(true)
    const simdi = new Date()
    let baslangic

    if (aralik === 'bugun') baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), simdi.getDate())
    else if (aralik === 'hafta') baslangic = new Date(simdi.getTime() - 7*24*60*60*1000)
    else if (aralik === 'ay') baslangic = new Date(simdi.getFullYear(), simdi.getMonth(), 1)
    else baslangic = new Date(simdi.getFullYear(), 0, 1)

    const { data: isler } = await supabase
      .from('is_emirleri')
      .select('*, musteriler(ad,soyad), personel(ad,soyad)')
      .gte('created_at', baslangic.toISOString())
      .order('created_at', { ascending: true })

    const liste = isler || []

    const toplamIs = liste.length
    const tamamlanan = liste.filter(i => ['tamamlandi','teslim_edildi'].includes(i.durum)).length
    const bekleyen = liste.filter(i => i.durum === 'bekliyor').length
    const devamEden = liste.filter(i => i.durum === 'devam_ediyor').length
    const iptal = liste.filter(i => i.durum === 'iptal').length
    const toplamCiro = liste.filter(i => i.durum !== 'iptal').reduce((s,i) => s+(i.toplam_tutar||0), 0)
    const tahsilEdilen = liste.filter(i => i.durum !== 'iptal').reduce((s,i) => {
      if (i.odeme_durumu === 'odendi') return s + (i.toplam_tutar||0)
      if (i.odeme_durumu === 'kismi') return s + (i.odenen_tutar||0)
      return s
    }, 0)
    const kismiOdeme = liste.filter(i => i.odeme_durumu==='kismi' && i.durum !== 'iptal').reduce((s,i) => s+(i.odenen_tutar||0), 0)
    const bekleyenTahsilat = liste.filter(i => i.durum !== 'iptal').reduce((s,i) => {
      if (i.odeme_durumu === 'odenmedi') return s + (i.toplam_tutar||0)
      if (i.odeme_durumu === 'kismi') return s + ((i.toplam_tutar||0) - (i.odenen_tutar||0))
      return s
    }, 0)

    // Günlük bar grafik - son 7 gün
    const gunlukData = []
    for (let j = 6; j >= 0; j--) {
      const g = new Date(simdi.getTime() - j*24*60*60*1000)
      const label = g.toLocaleDateString('tr-TR', { weekday:'short' })
      const sub = `${g.getDate()}/${g.getMonth()+1}`
      const gun = g.toDateString()
      const value = liste.filter(i => new Date(i.created_at).toDateString() === gun).length
      gunlukData.push({ label, sub, value })
    }

    // Personel
    const personelMap = {}
    liste.forEach(i => {
      if (i.personel) {
        const isim = `${i.personel.ad} ${i.personel.soyad}`
        if (!personelMap[isim]) personelMap[isim] = { isim, isAdet:0, ciro:0, tamamlanan:0 }
        personelMap[isim].isAdet++
        personelMap[isim].ciro += i.toplam_tutar || 0
        if (['tamamlandi','teslim_edildi'].includes(i.durum)) personelMap[isim].tamamlanan++
      }
    })
    const personelData = Object.values(personelMap).sort((a,b) => b.ciro-a.ciro).slice(0,8)

    // Durum
    const durumData = [
      { label:'Tamamlandı', value: tamamlanan, color:'#22c55e' },
      { label:'Devam Ediyor', value: devamEden, color:'#3b82f6' },
      { label:'Bekliyor', value: bekleyen, color:'#f5a623' },
      { label:'İptal', value: iptal, color:'#e5484d' },
    ].filter(d => d.value > 0)

    // En çok müşteri
    const musteriMap = {}
    liste.forEach(i => {
      if (i.musteriler) {
        const isim = `${i.musteriler.ad} ${i.musteriler.soyad}`
        musteriMap[isim] = (musteriMap[isim]||0) + 1
      }
    })
    const enCokMusteri = Object.entries(musteriMap)
      .sort((a,b) => b[1]-a[1]).slice(0,5)
      .map(([isim,sayi]) => ({ isim, sayi }))

    setData({ toplamIs, tamamlanan, bekleyen, devamEden, iptal, toplamCiro, tahsilEdilen, kismiOdeme, bekleyenTahsilat, gunlukData, personelData, durumData, enCokMusteri })
    setLoading(false)
  }

  const ARALIKLAR = [
    { id:'bugun', label:'Bugün' },
    { id:'hafta', label:'Bu Hafta' },
    { id:'ay', label:'Bu Ay' },
    { id:'yil', label:'Bu Yıl' },
  ]

  const tamamlanmaOrani = data.toplamIs > 0 ? Math.round((data.tamamlanan/data.toplamIs)*100) : 0
  const tahsilatOrani = data.toplamCiro > 0 ? Math.round((data.tahsilEdilen/data.toplamCiro)*100) : 0

  if (loading) return <div className="empty-state"><p>Yükleniyor...</p></div>

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>

      {/* Filtre */}
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
        {ARALIKLAR.map(a => (
          <button key={a.id} className={`btn btn-sm ${aralik===a.id?'btn-primary':'btn-secondary'}`} onClick={() => setAralik(a.id)}>{a.label}</button>
        ))}
      </div>

      {/* KPI - 3+3 grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
        {[
          { label:'Toplam İş', value: data.toplamIs, color:'var(--text-primary)', sub:`%${tamamlanmaOrani} tamamlandı` },
          { label:'Tamamlanan', value: data.tamamlanan, color:'#22c55e', sub:'teslim dahil' },
          { label:'Bekleyen', value: data.bekleyen + data.devamEden, color:'#f5a623', sub:`${data.devamEden} devam ediyor` },
        ].map((k,i) => (
          <div key={i} className="table-card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:'9px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.06em',fontWeight:600,marginBottom:'6px'}}>{k.label}</div>
            <div style={{fontSize:'24px',fontWeight:700,color:k.color,lineHeight:1,marginBottom:'3px'}}>{k.value}</div>
            <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{k.sub}</div>
          </div>
        ))}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'8px'}}>
        {[
          { label:'Toplam Ciro', value:`₺${data.toplamCiro.toLocaleString('tr-TR')}`, color:'#3b82f6', sub:`%${tahsilatOrani} tahsil` },
          { label:'Tahsil Edilen', value:`₺${data.tahsilEdilen.toLocaleString('tr-TR')}`, color:'#22c55e', sub:'ödendi' },
          { label:'Bekleyen Tahsilat', value:`₺${data.bekleyenTahsilat.toLocaleString('tr-TR')}`, color:'#e5484d', sub:'ödenmedi' },
        ].map((k,i) => (
          <div key={i} className="table-card" style={{padding:'12px 14px'}}>
            <div style={{fontSize:'9px',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'.06em',fontWeight:600,marginBottom:'6px'}}>{k.label}</div>
            <div style={{fontSize:k.value.length>8?'16px':'20px',fontWeight:700,color:k.color,lineHeight:1,marginBottom:'3px'}}>{k.value}</div>
            <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Grafikler - yan yana */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        <div className="table-card" style={{padding:'16px'}}>
          <div style={{fontWeight:600,fontSize:'13px',color:'var(--text-primary)',marginBottom:'2px'}}>📊 Günlük İş Dağılımı</div>
          <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'14px'}}>Son 7 gün — iş emri sayısı</div>
          <BarChart data={data.gunlukData} color="#e5484d" />
        </div>
        <div className="table-card" style={{padding:'14px'}}>
          <div style={{fontWeight:600,fontSize:'13px',color:'var(--text-primary)',marginBottom:'2px'}}>🍩 Durum Dağılımı</div>
          <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'8px'}}>İş emirleri</div>
          {data.durumData.length === 0
            ? <div style={{textAlign:'center',color:'var(--text-muted)',fontSize:'12px',padding:'20px 0'}}>Veri yok</div>
            : <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'10px'}}>
                <DonutChart segments={data.durumData} size={100}/>
                <div style={{width:'100%',display:'flex',flexDirection:'column',gap:'6px'}}>
                  {data.durumData.map((s,i) => (
                    <div key={i} style={{display:'flex',alignItems:'center',gap:'7px'}}>
                      <div style={{width:8,height:8,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                      <span style={{fontSize:'11px',color:'var(--text-secondary)',flex:1}}>{s.label}</span>
                      <span style={{fontSize:'12px',fontWeight:700,color:s.color}}>{s.value}</span>
                    </div>
                  ))}
                </div>
              </div>
          }
        </div>
      </div>

      {/* Personel */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">👨‍🔧 Personel Performansı</span>
        </div>
        {data.personelData.length === 0
          ? <div className="empty-state"><div className="empty-state-icon">👤</div><p>Bu dönemde iş emri atanan personel yok</p></div>
          : <>
              {/* Masaüstü */}
              <div className="desktop-only" style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Personel</th><th>İş</th><th>Tamamlanan</th><th>Başarı Oranı</th><th>Ciro</th></tr></thead>
                  <tbody>
                    {data.personelData.map((p,i) => {
                      const basari = p.isAdet > 0 ? Math.round((p.tamamlanan/p.isAdet)*100) : 0
                      return (
                        <tr key={i}>
                          <td style={{color:'var(--text-primary)',fontWeight:500}}>{p.isim}</td>
                          <td style={{color:'var(--text-primary)',fontWeight:600}}>{p.isAdet}</td>
                          <td style={{color:'#22c55e',fontWeight:600}}>{p.tamamlanan}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                              <div style={{flex:1,height:5,background:'var(--bg-elevated)',borderRadius:3,overflow:'hidden',minWidth:60}}>
                                <div style={{width:`${basari}%`,height:'100%',background:basari>70?'#22c55e':basari>40?'#f5a623':'#e5484d',borderRadius:3}}/>
                              </div>
                              <span style={{fontSize:'11px',color:'var(--text-secondary)',minWidth:28}}>%{basari}</span>
                            </div>
                          </td>
                          <td style={{color:'#22c55e',fontWeight:600}}>₺{p.ciro.toLocaleString('tr-TR')}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {/* Mobil */}
              <div className="mobile-only" style={{padding:'8px'}}>
                {data.personelData.map((p,i) => {
                  const basari = p.isAdet > 0 ? Math.round((p.tamamlanan/p.isAdet)*100) : 0
                  return (
                    <div key={i} style={{background:'var(--bg-elevated)',border:'1px solid var(--border)',borderRadius:'10px',padding:'12px',marginBottom:'8px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                        <span style={{fontWeight:600,color:'var(--text-primary)',fontSize:'13px'}}>{p.isim}</span>
                        <span style={{color:'#22c55e',fontWeight:700}}>₺{p.ciro.toLocaleString('tr-TR')}</span>
                      </div>
                      <div style={{display:'flex',gap:'12px',fontSize:'11px',color:'var(--text-secondary)',marginBottom:'6px'}}>
                        <span>📋 {p.isAdet} iş</span>
                        <span>✅ {p.tamamlanan} tamamlandı</span>
                      </div>
                      <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                        <div style={{flex:1,height:5,background:'var(--bg-base)',borderRadius:3,overflow:'hidden'}}>
                          <div style={{width:`${basari}%`,height:'100%',background:basari>70?'#22c55e':basari>40?'#f5a623':'#e5484d',borderRadius:3}}/>
                        </div>
                        <span style={{fontSize:'11px',color:'var(--text-secondary)',minWidth:28}}>%{basari}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
        }
      </div>

      {/* Müşteriler + Tahsilat */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
        <div className="table-card">
          <div className="table-header"><span className="table-title">⭐ En Sık Gelenler</span></div>
          {data.enCokMusteri.length === 0
            ? <div className="empty-state"><p>Veri yok</p></div>
            : <table>
                <thead><tr><th>#</th><th>Müşteri</th><th>Ziyaret</th></tr></thead>
                <tbody>
                  {data.enCokMusteri.map((m,i) => (
                    <tr key={i}>
                      <td style={{color:i===0?'#f5a623':'var(--text-muted)',fontWeight:700,fontSize:'14px'}}>
                        {i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}.`}
                      </td>
                      <td style={{color:'var(--text-primary)',fontWeight:500}}>{m.isim}</td>
                      <td style={{color:'#3b82f6',fontWeight:600}}>{m.sayi}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
          }
        </div>
        <div className="table-card" style={{padding:'14px'}}>
          <div style={{fontWeight:600,fontSize:'13px',color:'var(--text-primary)',marginBottom:'14px'}}>💳 Tahsilat</div>
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {[
              { label:'Ödendi', value:data.tahsilEdilen, color:'#22c55e', pct: data.toplamCiro>0?Math.round((data.tahsilEdilen/data.toplamCiro)*100):0 },
              { label:'Kısmi', value:data.kismiOdeme, color:'#f5a623', pct: data.toplamCiro>0?Math.round((data.kismiOdeme/data.toplamCiro)*100):0 },
              { label:'Ödenmedi', value:data.bekleyenTahsilat, color:'#e5484d', pct: data.toplamCiro>0?Math.round((data.bekleyenTahsilat/data.toplamCiro)*100):0 },
            ].map((t,i) => (
              <div key={i}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:'4px'}}>
                  <span style={{fontSize:'11px',color:'var(--text-secondary)'}}>{t.label}</span>
                  <span style={{fontSize:'12px',fontWeight:600,color:t.color}}>₺{t.value.toLocaleString('tr-TR')} <span style={{fontSize:'10px',opacity:.7}}>(%{t.pct})</span></span>
                </div>
                <div style={{height:5,background:'var(--bg-elevated)',borderRadius:3,overflow:'hidden'}}>
                  <div style={{width:`${t.pct}%`,height:'100%',background:t.color,borderRadius:3,transition:'width .6s'}}/>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}

export default Raporlar
