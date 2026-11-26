# Kur'an Satır Arası — Türkçe Fonetik

Kur'an-ı Kerim'i **Arapça metniyle birebir hizalı, uzun ünlülü ve tecvid işaretli Türkçe fonetik okunuşla** sunan ücretsiz, reklamsız ve tamamen çevrimdışı açık kaynaklı okuma uygulaması.

- **Web demo:** `demo/index.html` (tek dosya, sıfır bağımlılık)
- **Android APK:** [GitHub Releases](https://github.com/skonuksal/turkce-fonetik-kurani-kerim/releases)
- **Gizlilik Politikası:** [PRIVACY.md](PRIVACY.md)

## Özellikler

- **6.236 ayetin tamamında (77.429 Arapça kelime) %100 hizalı birleşik Türkçe fonetik:**
  - Uzun ünlüler (`â, î, û`), kalın/ince ünlü ayrımı (`ı/i`, `ü/u`), gerçek okunuş (idğâm/iklâb/şemsî bağlama), nûn-u kutnî ve mîm-i cem' kuralları
- **Üç okuma modu:**
  - **Türkçe:** Her Arapça kelimeye dokununca heceli okunuşu ve bağlantılı grubun birleşik okunuşu açılır
  - **Arapça:** Her kelime bağımsız dokunma balonuyla gösterilir
  - **Kelime:** Birbirine bağlanarak okunan kelimeler tek kartta gruplanır; heceli okunuş + kelime anlamı satır altında görünür
- **İki okunuş seviyesi + uygulama içi Tecvid İşaretleri Rehberi:** **Temel** / **Tecvid** (`z̲, s̲, ż̲, ḋ, ṫ, h̄, ḣ, g, ğ`)
- **İki Arapça hat:** **Mushaf** (Uthmânî) / **Diyanet** (Açık Kuran)
- **Dört tema:** Papirüs, Deniz, Gece, Bordo
- **Kolay gezinme:** 114 sure (Türkçe arama destekli), 30 cüz, 604 sayfa seçicileri, sure başı Besmele, sure sonu Önceki/Sonraki geçişi, Meal & Kelime Anlamı aç/kapat
- **Tamamen çevrimdışı & yerel:** Ayarlar ve son okunan yer cihazda saklanır (`localStorage`)

## Tecvid İşaretleri

| İşaret | Arapça | Okunuş | Örnek |
|---|---|---|---|
| **â î û** | Med | Uzun ünlü | rah-mâ-nir-ra-hîm |
| **z̲** | ذ | Peltek z | el-le-z̲î-ne |
| **s̲** | ث | Peltek s | ke-s̲î-ra-tey |
| **ż̲** | ظ | Kalın + peltek z | a-ż̲îm |
| **ḋ** | ض | Kalın d (dâd) | ve-leḋ-ḋâl-lîn |
| **ṫ** | ط | Kalın t (tı) | sı-râ-ṫal |
| **ḣ** | خ | Hırıltılı h (hı) | ḣal-fe-hüm |
| **h̄** | ح | Boğazdan kalın h (hâ) | rah̄-mân |
| **g** | ق | Kalın k (kâf) | gul, ga-rî-bâ |
| **ğ** | غ | Yumuşak g (ğayın) | ğay-ril-mağ-ḋû-bi |
| **-** | Bağ | Hece / idğâm geçişi | hü-del-lil-müt-te-gîn |

## Mimari

- **`src/phonetic.js`** — Tanzil Uthmânî Arapça metni ile Muhammet Abay çeviriyazısını 6.236 ayette birebir hizalar; bağlama ünsüz kaydırma, idğâm tespiti, kalın `ı` kuralı, Türkçe heceleme ve Temel/Tecvid dönüşümlerini üretir.
- **`generate.js`** — `output/turkish-syllables.json`, `output/turkish-syllables-tajweed.json` ve `apk-build/www/output/` kopyalarını üretir.
- **`demo/index.html`** & **`apk-build/www/index.html`** — Tek dosyalık çevrimdışı okuyucu.
- **`test/transliteration.test.js`** — 6.236 ayet / 77.429 kelime bütünlük, sıfır akademik sembol sızıntısı ve paket eşitliği testleri.
- **`checks/reader-tap.cjs`** — APK içinden çıkarılan okuyucuda mobil dokunma, arama, tema, Besmele, Kelime modu ve tam korpus Playwright testi.

## Geliştirme

```bash
npm run generate
npm test
```

Web önizleme:

```bash
python -m http.server 4173 --directory apk-build/www
# http://127.0.0.1:4173/
```

## Veri Kaynakları ve Lisans

- **Kod:** MIT ([LICENSE](LICENSE))
- **Arapça Mushaf:** [Tanzil](https://tanzil.net) (Uthmânî) ve [Açık Kuran](https://acikkuran.com) (Diyanet hattı)
- **Türkçe Fonetik Tabanı:** [Tanzil](https://tanzil.net/trans/) — Muhammet Abay *Çeviriyazı* edisyonu (ücretsiz ve ticari olmayan kullanım için)
- **Meal:** Diyanet İşleri Başkanlığı
