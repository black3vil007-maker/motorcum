-- =====================================================
-- MOTORCUM v1.0.105 — Admin & Güncelleme Notları Migration
-- Supabase SQL Editor'da çalıştır
-- =====================================================

-- 1) profiles tablosuna rol kolonu ekle
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rol TEXT DEFAULT 'kullanici';

-- 2) Admin kullanıcısını işaretle
--    (admin kullanıcı adını biliyorsan aşağıdaki satırı kullan,
--     yoksa Supabase Auth'dan user id'yi bulup güncelle)
-- UPDATE profiles SET rol = 'admin' WHERE kullanici_adi = 'admin';

-- 3) Güncelleme notları tablosu
CREATE TABLE IF NOT EXISTS guncelleme_notlari (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  baslik        TEXT NOT NULL DEFAULT 'Güncelleme Notu',
  icerik        TEXT NOT NULL,
  aktif         BOOLEAN DEFAULT true,         -- true ise henüz "yeni" sayılır
  hedef_roller  TEXT[] DEFAULT ARRAY['hepsi'], -- ['hepsi'] veya ['usta','kullanici'] gibi
  created_at    TIMESTAMPTZ DEFAULT now(),
  created_by    UUID REFERENCES auth.users(id)
);

-- 4) Kullanıcı - not görme takip tablosu
CREATE TABLE IF NOT EXISTS kullanici_notlar_goruldu (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  not_id      UUID REFERENCES guncelleme_notlari(id) ON DELETE CASCADE,
  goruldu_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, not_id)
);

-- 5) RLS politikaları
ALTER TABLE guncelleme_notlari ENABLE ROW LEVEL SECURITY;
ALTER TABLE kullanici_notlar_goruldu ENABLE ROW LEVEL SECURITY;

-- Güncelleme notları: herkes okuyabilir, sadece admin yazabilir
CREATE POLICY "Herkes okuyabilir" ON guncelleme_notlari
  FOR SELECT USING (true);

CREATE POLICY "Sadece admin yazabilir" ON guncelleme_notlari
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND rol = 'admin'
    )
  );

-- Görme takibi: kullanıcı kendi kayıtlarını yönetir
CREATE POLICY "Kendi goruldu kayitlari" ON kullanici_notlar_goruldu
  FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- TAMAMLANDI
-- Sonraki adım:
-- 1. Supabase Auth > Authentication > Users'dan admin kullanıcısını bul
--    veya yeni oluştur (email: admin@motorcum.local, şifre: 0123456!!)
-- 2. O kullanıcının profile kaydını bul:
--    SELECT id, kullanici_adi FROM profiles;
-- 3. Admin profilini işaretle:
--    UPDATE profiles SET rol = 'admin' WHERE kullanici_adi = 'admin';
-- 4. Erdi kullanıcısı için:
--    UPDATE profiles SET rol = 'usta' WHERE kullanici_adi = 'erdi';
-- =====================================================
