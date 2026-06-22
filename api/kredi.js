export default async function handler(req, res) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return res.status(200).json({ ok: false })

    // Kullanım bilgisini al - Workspace billing
    const response = await fetch('https://api.anthropic.com/v1/organizations/billing/credit_balance', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      }
    })

    if (!response.ok) {
      // Alternatif endpoint dene
      return res.status(200).json({ ok: true, kredi: null })
    }

    const data = await response.json()
    const kredi = (data.credits_remaining_usd || data.balance || 0)
    return res.status(200).json({ ok: true, kredi: parseFloat(kredi) })
  } catch {
    return res.status(200).json({ ok: false })
  }
}
