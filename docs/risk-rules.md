# Justifikasi Threshold Rule-Based Classification

> **Dokumen pendukung BAB 3 — "Perancangan Sistem"**
> Skripsi: *Sistem Penilaian Risiko Portofolio Cryptocurrency Berbasis Web Menggunakan Metode Rule-Based Classification*
> Author: Istu Amlu Baihaqqi (NIM 221420010) — Universitas Bina Darma

---

## ⚠️ Catatan Penggunaan Dokumen

- **Angka threshold** di dokumen ini diambil **persis dari implementasi kode** (`server/src/services/riskClassifier.js` dan `portfolioAnalyzer.js`). Jadi dokumen dan sistem dijamin konsisten.
- Setiap blok bertanda **`📝 ISI:`** adalah bagian *justifikasi* yang **harus diisi/divalidasi penulis** dengan referensi skripsi + persetujuan pembimbing. Kerangka kalimat di sana cuma draf awal — **wajib dikasih sitasi**, jangan dipakai mentah pas sidang.
- Kalau threshold final dari pembimbing berbeda dengan kode, **ubah kode dulu** (`riskClassifier.js`) baru sinkronkan dokumen ini.

---

## 1. Ringkasan Metode

Sistem mengklasifikasi risiko **per aset** menggunakan **rule-based scoring** atas **4 variabel risiko**. Tiap variabel diberi skor diskret **0–3 poin** berdasarkan rentang (bucket) nilainya. Total skor (**0–12**) menentukan level risiko aset.

| Total Skor | Level Risiko |
|-----------|--------------|
| `score >= 9` | **High** |
| `5 <= score < 9` | **Medium** |
| `score < 5` | **Low** |

> **Kenapa rule-based (bukan machine learning)?**
> 📝 ISI: jelaskan alasan pemilihan metode rule-based — misalnya transparansi/keterjelasan keputusan (explainable), tidak butuh dataset training berlabel, cocok untuk skala data skripsi, dan mudah divalidasi pakar. Kaitkan dengan rumusan masalah & tujuan penelitian di BAB 1.

---

## 2. Empat Variabel Risiko

Tiap variabel di-scoring oleh fungsi terpisah di `riskClassifier.js` (`scoreMarketCap`, `scoreVolume24h`, `scoreVolatility`, `scoreLiquidityRatio`).

### 2.1 Market Cap (Kapitalisasi Pasar)

**Prinsip:** semakin kecil kapitalisasi pasar → semakin berisiko (rentan manipulasi harga, likuiditas tipis).

| Rentang Nilai (USD) | Bucket | Skor |
|---------------------|--------|------|
| `< $100.000.000` (< $100M) | Micro Cap | **3** |
| `$100M – < $1B` | Small Cap | **2** |
| `$1B – < $10B` | Mid Cap | **1** |
| `>= $10B` | Large Cap | **0** |

> 📝 ISI — Justifikasi batas $100M / $1B / $10B: jelaskan dasar pemilihan tiap batas (misal konvensi klasifikasi market cap di industri crypto, atau referensi jurnal/literatur). Sertakan sitasi.

---

### 2.2 Volume Perdagangan 24 Jam

**Prinsip:** volume rendah = likuiditas market rendah = susah jual tanpa menggerakkan harga = risiko tinggi.

| Rentang Nilai (USD) | Bucket | Skor |
|---------------------|--------|------|
| `< $1.000.000` (< $1M) | Sangat rendah | **3** |
| `$1M – < $10M` | Rendah | **2** |
| `$10M – < $100M` | Sedang | **1** |
| `>= $100M` | Tinggi | **0** |

> 📝 ISI — Justifikasi batas $1M / $10M / $100M: dasar pemilihan rentang volume. Sertakan sitasi.

---

### 2.3 Volatilitas (30 Hari)

**Prinsip:** fluktuasi harga harian yang tinggi = ketidakpastian tinggi = risiko tinggi.

**Definisi:** standar deviasi (populasi) dari **return harian** selama jendela **30 hari**.

```
1. Return harian:   r_t = (P_t − P_{t−1}) / P_{t−1}
2. Mean:            μ   = (Σ r_t) / N
3. Variansi:        σ²  = (Σ (r_t − μ)²) / N      ← populasi (bagi N, bukan N−1)
4. Volatilitas:     σ   = √σ²
```

> Implementasi: `calculateVolatility()` di `portfolioAnalyzer.js`. Memakai **standar deviasi populasi** (membagi N, bukan N−1).
> 📝 ISI — Justifikasi pakai populasi vs sampel: jelaskan kenapa dibagi N (seluruh data 30 hari dianggap populasi observasi, bukan sampel dari populasi lebih besar). Sertakan dasar statistiknya.

| Rentang Nilai (desimal) | Bucket | Skor |
|-------------------------|--------|------|
| `> 0.15` (> 15%) | Sangat tinggi | **3** |
| `0.08 – 0.15` (8%–15%) | Tinggi | **2** |
| `0.04 – 0.08` (4%–8%) | Sedang | **1** |
| `<= 0.04` (<= 4%) | Rendah | **0** |

> 📝 ISI — Justifikasi batas 4% / 8% / 15%: dasar pemilihan threshold volatilitas harian. Sertakan sitasi.
> **Catatan arah operator:** variabel ini satu-satunya yang pakai operator `>` (lebih besar = lebih berisiko), sedangkan 3 variabel lain pakai `<` (lebih kecil = lebih berisiko). Lihat Bagian 3.

---

### 2.4 Rasio Likuiditas

**Prinsip:** rasio kecil = volume jauh lebih kecil dari kapitalisasi = aset susah di-*exit* tanpa menggerakkan harga = risiko tinggi.

**Definisi:**

```
liquidityRatio = volume24h / marketCap
```

| Rentang Nilai (desimal) | Bucket | Skor |
|-------------------------|--------|------|
| `< 0.01` (< 1%) | Sangat rendah | **3** |
| `0.01 – < 0.05` (1%–5%) | Rendah | **2** |
| `0.05 – < 0.1` (5%–10%) | Sedang | **1** |
| `>= 0.1` (>= 10%) | Tinggi | **0** |

> 📝 ISI — Justifikasi batas 1% / 5% / 10%: dasar pemilihan threshold rasio likuiditas. Sertakan sitasi.

---

## 3. Semantik Batas (Boundary Semantics)

Penting dicatat di BAB 3 untuk menghindari ambiguitas pada nilai yang **tepat** di batas:

- **Market Cap, Volume, Rasio Likuiditas** → operator `<` (*strict less than*). Nilai **tepat di batas** masuk ke bucket dengan **skor lebih rendah**.
  *Contoh:* market cap **tepat $100.000.000** → bukan Micro Cap (3), tapi Small Cap (**2**), karena syaratnya `< 1e8`.
- **Volatilitas** → operator `>` (*strict greater than*). Nilai **tepat di batas** masuk ke bucket dengan **skor lebih rendah**.
  *Contoh:* volatilitas **tepat 0.15** → bukan Sangat tinggi (3), tapi Tinggi (**2**), karena syaratnya `> 0.15`.

> 📝 ISI: konfirmasi konvensi ini sesuai dengan yang ditulis di BAB 3. Konsistensi operator antara dokumen dan kode wajib.

---

## 4. Klasifikasi Risiko Aset (Agregasi Skor)

Total skor = penjumlahan skor 4 variabel (rentang **0–12**), lalu dipetakan ke level lewat `determineRiskLevel()`:

```js
score >= 9  → 'High'
score >= 5  → 'Medium'
score <  5  → 'Low'
```

> 📝 ISI — Justifikasi cut-off 5 dan 9: jelaskan dasar pembagian 3 kelas. Misalnya: rentang 0–12 dibagi menjadi 3 zona, di mana High menuntut mayoritas variabel berada di kategori berisiko tinggi. Jelaskan logika pembagiannya dan kaitkan dengan distribusi skor yang mungkin.

---

## 5. HHI — Konsentrasi Portofolio

Selain risiko per aset, sistem menilai **risiko konsentrasi** portofolio memakai **Herfindahl-Hirschman Index**.

**Definisi:**

```
HHI = Σ (weight_i)²,    weight_i = valueUSD_i / total_value_portofolio
```

Rentang nilai: **0** (terdiversifikasi sempurna) sampai **1** (portofolio 1 aset tunggal).

> Implementasi: `calculateHHI()` & `interpretHHI()` di `portfolioAnalyzer.js`.

| Rentang HHI | Level Konsentrasi | Label |
|-------------|-------------------|-------|
| `< 0.15` | **Low** | Terdiversifikasi |
| `0.15 – < 0.25` | **Medium** | Moderat |
| `>= 0.25` | **High** | Terkonsentrasi |

> 📝 ISI — Justifikasi batas 0.15 / 0.25: HHI banyak dipakai di ekonomi (mis. evaluasi konsentrasi pasar oleh regulator). Jelaskan adaptasi threshold-nya untuk konteks portofolio crypto + sitasi sumber.

---

## 6. Risiko Portofolio Keseluruhan (Overall)

Skor risiko portofolio = **rata-rata tertimbang** (weighted average) skor risiko tiap aset, dengan bobot = porsi nilai aset terhadap total portofolio:

```
overallRiskScore = Σ ( weight_i × riskScore_i )
overallRiskLevel = determineRiskLevel(overallRiskScore)   // ambang sama: >=9 High, >=5 Medium
```

> Implementasi: `portfolioScanService.js` (langkah agregasi). Aset bernilai lebih besar berkontribusi lebih besar terhadap skor portofolio.
> 📝 ISI — Justifikasi pakai weighted average (bukan rata-rata sederhana): jelaskan kenapa bobot nilai aset relevan — aset yang porsinya besar memang lebih menentukan profil risiko portofolio.

---

## 7. Contoh Perhitungan (Worked Example)

> 📝 ISI: ganti angka di bawah dengan **data aset nyata** dari hasil scan (mis. screenshot dashboard untuk BAB 4), supaya contohnya konsisten dengan demo sistem.

Misal sebuah aset hipotetis:

| Variabel | Nilai | Bucket | Skor |
|----------|-------|--------|------|
| Market Cap | $450.000.000 | Small Cap ($100M–$1B) | 2 |
| Volume 24h | $5.000.000 | Rendah ($1M–$10M) | 2 |
| Volatilitas 30d | 0.12 (12%) | Tinggi (8%–15%) | 2 |
| Rasio Likuiditas | 0.011 (1.1%) | Rendah (1%–5%) | 2 |
| **Total** | | | **8** |

→ Total skor **8** → `5 <= 8 < 9` → **Medium Risk**.

---

## 8. Ringkasan Tabel Threshold (Lampiran Cepat)

| Variabel | Skor 3 | Skor 2 | Skor 1 | Skor 0 |
|----------|--------|--------|--------|--------|
| Market Cap | `< $100M` | `$100M–$1B` | `$1B–$10B` | `>= $10B` |
| Volume 24h | `< $1M` | `$1M–$10M` | `$10M–$100M` | `>= $100M` |
| Volatilitas 30d | `> 15%` | `8%–15%` | `4%–8%` | `<= 4%` |
| Rasio Likuiditas | `< 1%` | `1%–5%` | `5%–10%` | `>= 10%` |

**Level aset:** `>=9` High · `5–8` Medium · `<5` Low
**Level HHI:** `>=0.25` High · `0.15–0.25` Medium · `<0.15` Low

---

*Sumber kebenaran threshold: `server/src/services/riskClassifier.js` & `server/src/services/portfolioAnalyzer.js`. Jika kode berubah, perbarui dokumen ini.*
