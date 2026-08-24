# Folder Validasi

Berisi seluruh perangkat dan hasil validasi sistem penilaian risiko, disusun
untuk menjawab dua pertanyaan penguji seminar hasil:

1. Apakah nilai variabel yang masuk ke sistem memang benar?
2. Apakah setiap nilai ditempatkan pada kelas skor yang benar?

## Berkas hasil utama

| Berkas | Isi |
|---|---|
| `HASIL-VALIDASI.md` | **Laporan akhir.** Berisi seluruh blok data untuk dimasukkan ke dokumen skripsi |
| `TEMUAN.md` | Bagian temuan dan keterbatasan, ditulis manual lalu digabungkan ke laporan |
| `dataset-uji.json` | Dataset 156 aset hasil pengambilan dari CoinGecko |
| `dataset-meta.json` | Metadata pembangunan dataset: waktu, sebaran ekosistem, kegagalan |
| `hasil-mutation-test.json` | Bukti mutation test beserta checksum sebelum dan sesudah |
| `hasil-data-masukan.json` | Hasil rekonsiliasi identitas 10 aset |
| `hasil-klasifikasi.json` | Matriks konfusi, metrik, kalibrasi, dan rincian per aset |
| `hasil-lintas-sumber.json` | Deviasi market cap CoinGecko terhadap CoinMarketCap |

## Skrip

| Skrip | Fungsi |
|---|---|
| `jalankan-test.mjs` | Menjalankan Jest, menyimpan hasil sebagai JSON |
| `mutation-test.mjs` | Menerapkan 3 mutasi, mencatat hasil, mengembalikan kode sumber |
| `build-dataset.mjs` | Membangun dataset dari CoinGecko |
| `uji-data-masukan.mjs` | Rekonsiliasi harga x supply terhadap market cap |
| `uji-lintas-sumber.mjs` | Pembandingan market cap CoinGecko terhadap CoinMarketCap |
| `uji-klasifikasi.mjs` | Matriks konfusi, metrik evaluasi, kalibrasi |
| `buat-laporan.mjs` | Menyusun `HASIL-VALIDASI.md` dari seluruh berkas hasil |

## Cara mengulang seluruh validasi dari nol

Jalankan dari **root repo** secara berurutan:

```bash
# 1. Jalankan test, simpan hasilnya sebagai JSON
node validasi/jalankan-test.mjs

# 2. Mutation test (kode sumber otomatis dikembalikan setelah selesai)
node validasi/mutation-test.mjs

# 3. Bangun dataset dari CoinGecko (memakan waktu beberapa menit)
node validasi/build-dataset.mjs --limit=250

# 4. Rekonsiliasi data masukan 10 aset
node validasi/uji-data-masukan.mjs

# 4b. Pembandingan lintas sumber terhadap CoinMarketCap
node validasi/uji-lintas-sumber.mjs

# 5. Matriks konfusi, metrik, kalibrasi
node validasi/uji-klasifikasi.mjs

# 6. Susun laporan akhir
node validasi/buat-laporan.mjs
```

Langkah 3 memerlukan `COINGECKO_API_KEY` pada `server/.env`. Tanpa kunci, skrip
tetap berjalan memakai kuota publik, namun lebih sering terkena batas laju.
Skrip menyimpan checkpoint tiap aset, jadi proses yang terputus dapat
dilanjutkan tanpa mengulang dari awal. Tambahkan `--fresh` untuk memaksa mulai
dari nol.

## Prinsip yang dipegang

**Tidak ada angka yang diketik manual.** Seluruh angka pada `HASIL-VALIDASI.md`
dibaca oleh `buat-laporan.mjs` dari berkas hasil eksekusi. Status pada
BLOK-4.12 diturunkan dari hasil Jest per-test, bukan ditulis tangan. Hal ini
sudah diuji secara falsifikasi: ketika kode sumber sengaja dimutasi, blok
tersebut berubah menjadi `GAGAL` hanya pada baris dan properti yang relevan.

**Kode sumber dijaga keutuhannya.** `mutation-test.mjs` memakai `try/finally`
dan penangan `SIGINT`, sehingga kode dikembalikan walaupun proses dihentikan
paksa. Keutuhan diverifikasi memakai checksum SHA-256, karena folder proyek ini
bukan git repository sehingga `git diff` tidak tersedia.

**Klasifikasi diverifikasi lewat dua jalur independen.** `uji-klasifikasi.mjs`
memuat implementasi ulang aturan Tabel 3.1 sampai 3.4 yang ditulis dari nol dan
tidak mengimpor apa pun dari `riskClassifier.js`, sehingga kesepakatan antara
keduanya bukan tautologi.

## Berkas kerja

Berkas berawalan titik merupakan berkas kerja, bukan hasil:
`.jest-hasil.json`, `.jest-total.json`, `.checkpoint-dataset.json`,
`.baseline-checksum.txt`, `.riskClassifier.baseline.bak`.
