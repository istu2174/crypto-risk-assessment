# BAHAN LAMPIRAN SKRIPSI

Berkas ini berisi bahan mentah yang diambil langsung dari repositori untuk memperbaiki
Lampiran 2 (salinan kode) dan Lampiran 3 (tabel test case) skripsi.

| Item | Keterangan |
|---|---|
| Tanggal pengambilan | 15 Agustus 2026 |
| Repositori | `Classiificasi crypto web/` |
| Modul yang diperiksa | `server/src/services/riskClassifier.js` |
| Perintah test | `npm test` → `node --experimental-vm-modules node_modules/jest/bin/jest.js` (dijalankan di `server/`) |
| Hasil eksekusi test | 12 suite, 346 test, **346 lulus, 0 gagal** |
| Berkas kode diubah | **Tidak ada.** Seluruh isi `src/` hanya dibaca, tidak dimodifikasi. |

---

## BAHAN 1 — Salinan Kode `riskClassifier.js`

### 1.1 Checksum SHA-256

| Butir | Nilai |
|---|---|
| Berkas | `server/src/services/riskClassifier.js` |
| SHA-256 aktual | `53b957d7f74cff0de21ba6f8e68c6ced50911ca93b5d3928a4395d93dd377123` |
| SHA-256 rujukan (dari pertanyaan) | `53b957d7f74cff0de21ba6f8e68c6ced50911ca93b5d3928a4395d93dd377123` |
| **Status** | ✅ **SAMA / COCOK** |
| Jumlah baris | 117 baris |

Nilai ini juga identik dengan yang tercatat di `validasi/.baseline-checksum.txt`, yaitu berkas
checksum yang dibuat pada sesi validasi 12 Agustus 2026. Artinya berkas `riskClassifier.js`
**tidak berubah sejak sesi validasi** — versi yang tercantum di bawah ini adalah versi yang
sama persis dengan yang diuji oleh seluruh 346 test.

**Catatan penting untuk penyunting dokumen:** versi terkini yang checksum-nya tercantum di atas
**sudah memuat** `assertNonNegativeNumber` pada keempat fungsi penilai variabel (baris 24, 32, 40,
dan 48), serta pada `classifyAsset` (baris 93–96). Jika Lampiran 2 skripsi masih memuat versi
tanpa pemanggilan tersebut, maka Lampiran 2 **usang** dan harus diganti dengan salinan di bawah.

### 1.2 Salinan lengkap (117 baris, apa adanya)

Gunakan ini bila Lampiran 2 memuat seluruh berkas.

```js
  1  /**
  2   * Rule-Based Classifier untuk risiko aset cryptocurrency.
  3   * 4 Variabel Risiko (skor 0-3 per variabel, total 0-12):
  4   *   1. Market Cap        → semakin kecil = semakin berisiko
  5   *   2. Volume 24h        → likuiditas market, low volume = high risk
  6   *   3. Volatilitas (30d) → standar deviasi return harian
  7   *   4. Rasio Likuiditas  → volume_24h / market_cap, makin rendah = makin susah exit
  8
  9   * Klasifikasi final:
 10   *   score >= 9 → High
 11   *   score >= 5 → Medium
 12   *   score <  5 → Low
 13   *
 14
 15   *   - Market Cap, Volume, Liquidity Ratio pakai operator '<' (strict less than).
 16   *   - Volatility pakai operator '>' (strict greater than).
 17   *   - Konsekuensi: nilai TEPAT di batas threshold masuk ke bucket dengan
 18   *     skor lebih rendah (kecuali volatilitas yg sebaliknya).
 19   */
 20
 21  // --- Per-rule scoring ---
 22
 23  export function scoreMarketCap(value) {
 24    assertNonNegativeNumber('marketCap', value);
 25    if (value < 1e8) return { points: 3, bucket: 'Micro Cap (< $100M)' };
 26    if (value < 1e9) return { points: 2, bucket: 'Small Cap ($100M – $1B)' };
 27    if (value < 1e10) return { points: 1, bucket: 'Mid Cap ($1B – $10B)' };
 28    return { points: 0, bucket: 'Large Cap (>= $10B)' };
 29  }
 30
 31  export function scoreVolume24h(value) {
 32    assertNonNegativeNumber('volume24h', value);
 33    if (value < 1e6) return { points: 3, bucket: 'Sangat rendah (< $1M)' };
 34    if (value < 1e7) return { points: 2, bucket: 'Rendah ($1M – $10M)' };
 35    if (value < 1e8) return { points: 1, bucket: 'Sedang ($10M – $100M)' };
 36    return { points: 0, bucket: 'Tinggi (>= $100M)' };
 37  }
 38
 39  export function scoreVolatility(value) {
 40    assertNonNegativeNumber('volatility', value);
 41    if (value > 0.15) return { points: 3, bucket: 'Sangat tinggi (> 15%)' };
 42    if (value > 0.08) return { points: 2, bucket: 'Tinggi (8% – 15%)' };
 43    if (value > 0.04) return { points: 1, bucket: 'Sedang (4% – 8%)' };
 44    return { points: 0, bucket: 'Rendah (<= 4%)' };
 45  }
 46
 47  export function scoreLiquidityRatio(value) {
 48    assertNonNegativeNumber('liquidityRatio', value);
 49    if (value < 0.01) return { points: 3, bucket: 'Sangat rendah (< 1%)' };
 50    if (value < 0.05) return { points: 2, bucket: 'Rendah (1% – 5%)' };
 51    if (value < 0.1) return { points: 1, bucket: 'Sedang (5% – 10%)' };
 52    return { points: 0, bucket: 'Tinggi (>= 10%)' };
 53  }
 54
 55  // --- Final classification dari total skor ---
 56
 57  export function determineRiskLevel(score) {
 58    if (score >= 9) return 'High';
 59    if (score >= 5) return 'Medium';
 60    return 'Low';
 61  }
 62
 63  // --- Input validation ---
 64
 65  function assertNonNegativeNumber(name, value) {
 66    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
 67      throw new Error(
 68        `Parameter '${name}' harus angka non-negatif yang finite. Diterima: ${value}`,
 69      );
 70    }
 71  }
 72
 73  /**
 74   * Klasifikasi risiko sebuah aset.
 75   *
 76   * @param {object} input
 77   * @param {number} input.marketCap        - dalam USD
 78   * @param {number} input.volume24h        - dalam USD
 79   * @param {number} input.volatility       - desimal (0.05 = 5%)
 80   * @param {number} input.liquidityRatio   - desimal (volume24h / marketCap)
 81   * @returns {{
 82   *   riskLevel: 'Low' | 'Medium' | 'High',
 83   *   riskScore: number,
 84   *   breakdown: {
 85   *     marketCap:      { value: number, points: number, bucket: string },
 86   *     volume24h:      { value: number, points: number, bucket: string },
 87   *     volatility:     { value: number, points: number, bucket: string },
 88   *     liquidityRatio: { value: number, points: number, bucket: string }
 89   *   }
 90   * }}
 91   */
 92  export function classifyAsset({ marketCap, volume24h, volatility, liquidityRatio }) {
 93    assertNonNegativeNumber('marketCap', marketCap);
 94    assertNonNegativeNumber('volume24h', volume24h);
 95    assertNonNegativeNumber('volatility', volatility);
 96    assertNonNegativeNumber('liquidityRatio', liquidityRatio);
 97
 98    const mc = scoreMarketCap(marketCap);
 99    const vol = scoreVolume24h(volume24h);
100    const vt = scoreVolatility(volatility);
101    const lq = scoreLiquidityRatio(liquidityRatio);
102
103    const riskScore = mc.points + vol.points + vt.points + lq.points;
104    const riskLevel = determineRiskLevel(riskScore);
105
106    return {
107      riskLevel,
108      riskScore,
109      breakdown: {
110        marketCap:      { value: marketCap,      points: mc.points, bucket: mc.bucket },
111        volume24h:      { value: volume24h,      points: vol.points, bucket: vol.bucket },
112        volatility:     { value: volatility,     points: vt.points,  bucket: vt.bucket },
113        liquidityRatio: { value: liquidityRatio, points: lq.points,  bucket: lq.bucket },
114      },
115    };
116  }
117
```

### 1.3 Potongan relevan saja

Gunakan ini bila Lampiran 2 hanya memuat sebagian kode. Isinya adalah blok
`assertNonNegativeNumber` beserta keempat fungsi penilai variabel secara utuh
(salinan verbatim dari baris 23–53 dan 63–71 di atas).

```js
// --- Per-rule scoring ---

export function scoreMarketCap(value) {
  assertNonNegativeNumber('marketCap', value);
  if (value < 1e8) return { points: 3, bucket: 'Micro Cap (< $100M)' };
  if (value < 1e9) return { points: 2, bucket: 'Small Cap ($100M – $1B)' };
  if (value < 1e10) return { points: 1, bucket: 'Mid Cap ($1B – $10B)' };
  return { points: 0, bucket: 'Large Cap (>= $10B)' };
}

export function scoreVolume24h(value) {
  assertNonNegativeNumber('volume24h', value);
  if (value < 1e6) return { points: 3, bucket: 'Sangat rendah (< $1M)' };
  if (value < 1e7) return { points: 2, bucket: 'Rendah ($1M – $10M)' };
  if (value < 1e8) return { points: 1, bucket: 'Sedang ($10M – $100M)' };
  return { points: 0, bucket: 'Tinggi (>= $100M)' };
}

export function scoreVolatility(value) {
  assertNonNegativeNumber('volatility', value);
  if (value > 0.15) return { points: 3, bucket: 'Sangat tinggi (> 15%)' };
  if (value > 0.08) return { points: 2, bucket: 'Tinggi (8% – 15%)' };
  if (value > 0.04) return { points: 1, bucket: 'Sedang (4% – 8%)' };
  return { points: 0, bucket: 'Rendah (<= 4%)' };
}

export function scoreLiquidityRatio(value) {
  assertNonNegativeNumber('liquidityRatio', value);
  if (value < 0.01) return { points: 3, bucket: 'Sangat rendah (< 1%)' };
  if (value < 0.05) return { points: 2, bucket: 'Rendah (1% – 5%)' };
  if (value < 0.1) return { points: 1, bucket: 'Sedang (5% – 10%)' };
  return { points: 0, bucket: 'Tinggi (>= 10%)' };
}

// --- Input validation ---

function assertNonNegativeNumber(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(
      `Parameter '${name}' harus angka non-negatif yang finite. Diterima: ${value}`,
    );
  }
}
```

---

## BAHAN 2 — Rincian Jumlah Test

Seluruh angka di bawah berasal dari satu kali eksekusi `npm test` dengan keluaran JSON Jest
(`--json`), lalu dihitung per berkas dari medan `assertionResults`. Bukan estimasi.

### 2.1 Enam angka yang diminta

| No | Cakupan | Berkas | **Jumlah test** |
|:--:|---|---|--:|
| 1 | Test lama untuk `riskClassifier.js` | `src/services/__tests__/riskClassifier.test.js` | **54** |
| 2 | Test lama untuk `portfolioAnalyzer.js` | `src/services/__tests__/portfolioAnalyzer.test.js` | **33** |
| 3 | Test validasi yang ditambahkan sesi validasi | `src/services/__tests__/riskClassifier.validation.test.js` | **163** |
| 4 | **Gabungan (1) + (2)** — test lama pada dua modul inti saja | — | **87** |
| 5 | **Gabungan (1) + (2) + (3)** — seluruh test dua modul inti termasuk validasi | — | **250** |
| 6 | Total seluruh test pada repositori | 12 berkas test | **346** |

### 2.2 Temuan penting: angka 87 dan 250 keduanya benar

Ini menjawab langsung persoalan konsistensi Tabel L3.1:

- **87** = 54 + 33 → jumlah test **lama** pada dua modul inti. Inilah angka yang cocok
  dengan 87 baris test case pada Tabel L3.1.
- **250** = 54 + 33 + 163 → jumlah **seluruh** test dua modul inti **setelah** test validasi
  ditambahkan. Inilah angka yang disebut paragraf pengantar.

Jadi tidak ada angka yang salah — keduanya mengukur cakupan yang berbeda. Ketidakkonsistenan
muncul karena paragraf pengantar sudah diperbarui ke cakupan pasca-validasi (250) sementara
Tabel L3.1 masih memuat cakupan pra-validasi (87). Ada dua cara memperbaikinya:

- **Opsi A (paling sedikit mengubah tabel):** pertahankan Tabel L3.1 dengan 87 baris, lalu
  ubah paragraf pengantar agar menyebut 87 sebagai isi tabel dan menyebut 163 test validasi
  serta total 250 sebagai keterangan tambahan yang dirangkum (bukan didaftar) — rangkumannya
  tersedia di Bahan 3.
- **Opsi B (tabel mengikuti paragraf):** perluas Tabel L3.1 menjadi 250 baris dengan
  memasukkan 163 test validasi satu per satu.

Angka 346 sebaiknya tidak dipakai di Lampiran 3 kecuali lampiran itu memang mengklaim
mencakup seluruh repositori, karena 96 test sisanya menguji modul di luar dua modul inti.

### 2.3 Rincian lengkap seluruh 12 berkas test (penyusun angka 346)

| Berkas test | Jumlah test | Termasuk dua modul inti? |
|---|--:|:--:|
| `src/services/__tests__/riskClassifier.validation.test.js` | 163 | ✅ |
| `src/services/__tests__/riskClassifier.test.js` | 54 | ✅ |
| `src/services/__tests__/portfolioAnalyzer.test.js` | 33 | ✅ |
| `src/services/__tests__/authService.test.js` | 26 | — |
| `src/services/__tests__/coinResolver.test.js` | 14 | — |
| `src/services/__tests__/heliusService.test.js` | 13 | — |
| `src/services/__tests__/portfolioScanService.test.js` | 12 | — |
| `src/controllers/__tests__/walletController.test.js` | 8 | — |
| `src/middleware/__tests__/errorHandler.test.js` | 7 | — |
| `src/services/__tests__/alchemyService.test.js` | 7 | — |
| `src/utils/__tests__/concurrency.test.js` | 5 | — |
| `src/services/__tests__/blockstreamService.test.js` | 4 | — |
| **TOTAL** | **346** | 250 di dua modul inti + 96 di luar |

### 2.4 Dasar pembedaan "test lama" vs "test sesi validasi"

Pembedaan didasarkan pada tanggal modifikasi berkas, karena repositori ini bukan repositori Git
(tidak ada riwayat commit yang bisa dirujuk):

| Berkas | Terakhir diubah | Kategori |
|---|---|---|
| `riskClassifier.test.js` | 26 Mei 2026 | Lama (pra-validasi) |
| `portfolioAnalyzer.test.js` | 12 Juli 2026 | Lama (pra-validasi) |
| `riskClassifier.validation.test.js` | 12 Agustus 2026 | Ditambahkan pada sesi validasi |

Sesi validasi berlangsung 12 Agustus 2026, konsisten dengan tanggal berkas keluaran di folder
`validasi/` (`.baseline-checksum.txt`, `HASIL-VALIDASI.md`, dan lain-lain).

---

## BAHAN 3 — Pengelompokan Test Validasi

Rincian 163 test pada `riskClassifier.validation.test.js`, dikelompokkan menurut blok
`describe` sebagaimana tertulis di berkas test. Nama kelompok disalin verbatim.

### 3.1 Ringkasan per kelompok utama

| Kelompok `describe` (nama verbatim) | Jumlah test | Porsi |
|---|--:|--:|
| UJI 1 — Equivalence Partitioning | 25 | 15,3 % |
| UJI 2 — Boundary Value Analysis | 65 | 39,9 % |
| UJI 3 — Property-based testing (100.000 masukan acak per variabel) | 24 | 14,7 % |
| UJI 4 — Penanganan masukan tidak valid | 49 | 30,1 % |
| **TOTAL** | **163** | 100 % |

### 3.2 Rincian sub-kelompok

**UJI 1 — Equivalence Partitioning (25 test)**

| Sub-kelompok | Jumlah |
|---|--:|
| `marketCap` | 6 |
| `volume24h` | 6 |
| `volatility` | 6 |
| `liquidityRatio` | 6 |
| Test pada tingkat kelompok utama (di luar keempat sub-kelompok) | 1 |

**UJI 2 — Boundary Value Analysis (65 test)**

Setiap variabel diuji pada tiga ambang, masing-masing 5 test (pola nilai batas: tepat di bawah,
tepat pada, dan tepat di atas ambang beserta variannya), ditambah satu sub-kelompok untuk batas
skor akhir.

| Sub-kelompok | Jumlah |
|---|--:|
| `marketCap` → Market Cap — ambang ke-1 = 100.000.000 | 5 |
| `marketCap` → Market Cap — ambang ke-2 = 1.000.000.000 | 5 |
| `marketCap` → Market Cap — ambang ke-3 = 10.000.000.000 | 5 |
| `volume24h` → Volume 24 Jam — ambang ke-1 = 1.000.000 | 5 |
| `volume24h` → Volume 24 Jam — ambang ke-2 = 10.000.000 | 5 |
| `volume24h` → Volume 24 Jam — ambang ke-3 = 100.000.000 | 5 |
| `volatility` → Volatilitas 30 Hari — ambang ke-1 = 0,04 | 5 |
| `volatility` → Volatilitas 30 Hari — ambang ke-2 = 0,08 | 5 |
| `volatility` → Volatilitas 30 Hari — ambang ke-3 = 0,15 | 5 |
| `liquidityRatio` → Rasio Likuiditas — ambang ke-1 = 0,01 | 5 |
| `liquidityRatio` → Rasio Likuiditas — ambang ke-2 = 0,05 | 5 |
| `liquidityRatio` → Rasio Likuiditas — ambang ke-3 = 0,1 | 5 |
| `determineRiskLevel` — batas skor akhir | 5 |

**UJI 3 — Property-based testing (24 test)**

| Sub-kelompok | Jumlah |
|---|--:|
| `marketCap` | 6 |
| `volume24h` | 6 |
| `volatility` | 6 |
| `liquidityRatio` | 6 |

**UJI 4 — Penanganan masukan tidak valid (49 test)**

Kelompok inilah yang menguji `assertNonNegativeNumber` — sehingga kelompok ini yang menjadi
alasan Lampiran 2 harus memakai salinan kode terbaru pada Bahan 1.

| Sub-kelompok | Jumlah |
|---|--:|
| `marketCap` | 5 |
| `volume24h` | 5 |
| `volatility` | 5 |
| `liquidityRatio` | 5 |
| `classifyAsset` — validasi input terpadu (`assertNonNegativeNumber`) | 29 |

### 3.3 Pengelompokan test lama (bonus, bila diperlukan untuk Tabel L3.1)

Karena angka 87 kemungkinan besar yang dipakai untuk Tabel L3.1, berikut pembagiannya:

| Berkas | Kelompok `describe` | Jumlah |
|---|---|--:|
| `riskClassifier.test.js` | `riskClassifier` (satu kelompok tunggal) | 54 |
| `portfolioAnalyzer.test.js` | `calculateVolatility` | 9 |
| `portfolioAnalyzer.test.js` | `calculateHHI` | 11 |
| `portfolioAnalyzer.test.js` | `interpretHHI` | 11 |
| `portfolioAnalyzer.test.js` | `CONCENTRATION_ENUM` | 2 |
| | **TOTAL** | **87** |

---

## Catatan Verifikasi

- Tidak ada berkas di `src/` yang diubah, dibuat, atau dihapus. Hanya dibaca.
- Tidak ada angka yang diperkirakan atau dikarang. Seluruh angka pada Bahan 2 dan Bahan 3
  berasal dari keluaran JSON Jest hasil satu kali eksekusi `npm test` pada 15 Agustus 2026,
  dengan hasil 346 lulus dan 0 gagal.
- Tidak ada butir yang berstatus GAGAL; seluruh permintaan pada Bahan 1, 2, dan 3 berhasil
  diperoleh.
- Satu keterbatasan yang perlu dicatat: repositori ini bukan repositori Git, sehingga
  pembedaan "test lama" versus "test sesi validasi" pada bagian 2.4 didasarkan pada tanggal
  modifikasi berkas dan tanggal berkas keluaran di folder `validasi/`, bukan pada riwayat commit.
