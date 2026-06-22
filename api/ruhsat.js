export const config = {
  maxDuration: 30,
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { image, mediaType, markalar = [], modeller = {} } = req.body
    const apiKey = process.env.ANTHROPIC_API_KEY

    if (!apiKey) {
      return res.status(200).json({ ok: false, error: 'API key bulunamadı' })
    }

    // Markalar listesini prompt'a ekle
    const markaListesiMetin = markalar.length > 0
      ? `\n\nSistemdeki kayıtlı markalar: ${markalar.join(', ')}\n\nMarka okurken bu listeden en yakın eşleşmeyi kullan. Örneğin "DMW" gördüğünde listede "BMW" varsa "BMW" yaz. Eğer listede yoksa ruhsattan okuduğun değeri yaz.`
      : ''

    // Model listesini de ekle
    const modelListesiMetin = Object.keys(modeller).length > 0
      ? `\nKayıtlı modeller (marka: modeller): ${Object.entries(modeller).map(([m, ml]) => `${m}: ${ml.join(', ')}`).join(' | ')}\n\nModel okurken de bu listeden en yakın eşleşmeyi kullan.`
      : ''

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType,
                  data: image,
                },
              },
              {
                type: 'text',
                text: `Bu Türk araç ruhsatı fotoğrafı. Ruhsattaki bilgileri oku ve SADECE şu JSON formatında döndür, başka hiçbir şey yazma:\n{"plaka":"","marka":"","model":"","yil":"","renk":"","sasi_no":"","motor_no":""}${markaListesiMetin}${modelListesiMetin}`,
              },
            ],
          },
        ],
      }),
    })

    if (!response.ok) {
      const err = await response.json()
      return res.status(200).json({ ok: false, error: err.error?.message || 'API hatası' })
    }

    const data = await response.json()
    const text = (data.content?.[0]?.text || '').trim()

    let bilgiler = null
    try { bilgiler = JSON.parse(text) } catch {}
    if (!bilgiler) {
      const m = text.match(/\{[\s\S]*?\}/)
      if (m) try { bilgiler = JSON.parse(m[0]) } catch {}
    }

    if (bilgiler) return res.status(200).json({ ok: true, bilgiler })
    return res.status(200).json({ ok: false, error: 'Bilgiler okunamadı' })

  } catch (error) {
    return res.status(200).json({ ok: false, error: error.message })
  }
}
