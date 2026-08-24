## TEMUAN DAN CATATAN

### 1. Cacat validasi masukan ditemukan oleh test, lalu diperbaiki

Uji 4 pada awalnya menghasilkan 20 kegagalan. Penyebabnya: fungsi
`assertNonNegativeNumber` hanya dipanggil di dalam `classifyAsset`, tidak di
keempat fungsi `scoreMarketCap`, `scoreVolume24h`, `scoreVolatility`, dan
`scoreLiquidityRatio` yang juga diekspor. Ketika keempat fungsi itu dipanggil
langsung, JavaScript melakukan koersi tipe secara diam-diam:

- Masukan `null` menjadi angka 0, sehingga menghasilkan skor 3 (paling berisiko)
- Masukan `NaN`, string, dan objek membuat seluruh perbandingan bernilai salah,
  sehingga jatuh ke pernyataan `return` terakhir dan menghasilkan skor 0
  (paling aman)

Arah kegagalan kedua inilah yang berbahaya bagi sistem penilaian risiko: data
rusak akan dilaporkan sebagai aset paling aman, bukan ditolak.

Perbaikan yang diterapkan: menambahkan pemanggilan `assertNonNegativeNumber`
pada keempat fungsi tersebut. Total perubahan 4 baris, seluruhnya penambahan.
Tidak ada satu pun dari 12 ambang batas yang diubah, dan tidak ada logika
klasifikasi yang diubah. Untuk setiap masukan yang valid, keluaran sistem tetap
identik. Setelah perbaikan, seluruh 346 test pada 12 suite lulus tanpa regresi.

Catatan yang meringankan: jalur produksi tidak pernah terdampak. Hasil
penelusuran menunjukkan hanya `classifyAsset` dan `determineRiskLevel` yang
diimpor kode produksi (`riskController.js:8` dan `portfolioScanService.js:14`),
dan tidak ada satu pun pemanggilan langsung ke keempat fungsi skor di seluruh
`server/src` maupun `client/src`.

### 2. Salah ketik label kelas pada kode sumber, sudah diperbaiki

Dua label bucket pada `riskClassifier.js` keliru dan akan muncul pada antarmuka
sistem maupun pada lampiran skripsi:

- Tertulis "Large Cap (>= $10M)", seharusnya "$10B", karena ambangnya 1e10
- Tertulis "Tinggi (>= $10M)", seharusnya "$100M", karena ambangnya 1e8

Kesalahan ini murni pada teks label; nilai ambang dan logika perhitungan sudah
benar sejak awal. Namun label yang salah akan terbaca oleh penguji pada
antarmuka sistem dan pada lampiran, sehingga berpotensi menimbulkan kesan bahwa
ambang batas yang dipakai keliru.

Perbaikan telah diterapkan pada `riskClassifier.js:28` dan `riskClassifier.js:36`.
Perubahan hanya menyentuh dua teks label, tidak menyentuh satu pun dari 12 ambang
batas maupun logika perhitungan. Seluruh 346 test tetap lulus setelah perbaikan.
Test lama memverifikasi bucket memakai pola kata seperti `/Large/` dan `/Small/`,
bukan angka nominalnya, sehingga tidak terdampak.

Setelah perbaikan, mutation test dijalankan ulang terhadap kode yang baru dan
tetap menangkap 3 dari 3 mutasi.

Kolom Kelas Sistem pada BLOK-4.10-REKONSILIASI di atas sudah memuat label yang
benar. Label tersebut dihitung ulang dari nilai Market Cap yang sama persis
dengan hasil pengambilan awal; tidak ada nilai harga, supply, market cap, maupun
skor yang diubah, dan seluruh angka tetap berasal dari snapshot yang sama.

### 3. Cacat data pada dua aset Kinesis (KAU dan KAG)

Ditemukan artefak pada data harga CoinGecko untuk dua token beragun logam mulia
terbitan Kinesis, keduanya pada titik data yang sama (hari ke-23 dari 31):

- KAU (Kinesis Gold): harga turun dari 130,9708 ke 65,6188 (turun 49,90%) lalu
  melonjak ke 136,9760 (naik 108,75%) pada hari berikutnya
- KAG (Kinesis Silver): pola serupa, turun 47,10% lalu naik 97,70%

Token beragun emas dan perak tidak mungkin bergerak sebesar itu dalam satu hari.
Pola ini konsisten dengan kesalahan umpan data pihak ketiga, bukan pergerakan
pasar yang sebenarnya.

Dampak terhadap klasifikasi, apabila titik rusak diinterpolasi dari dua
tetangganya:

| Aset | Volatilitas apa adanya | Level | Volatilitas terkoreksi | Level |
|---|---|---|---|---|
| KAU | 21,78% | High (skor 9) | 1,41% | Medium (skor 6) |
| KAG | 20,36% | High (skor 11) | 5,16% | High (skor 9) |

Artinya satu dari enam aset kelas High (yaitu KAU) masuk ke kelas tersebut
semata-mata karena cacat data. KAG tetap berada di kelas High walaupun
dikoreksi, karena skornya sudah tinggi pada variabel volume dan rasio
likuiditas.

Sesuai keputusan peneliti, data dibiarkan apa adanya dan tidak dimanipulasi.
Temuan ini justru menunjukkan bahwa proses validasi mampu mendeteksi cacat data
yang berasal dari sumber eksternal.

Aset DEXE dengan volatilitas 32,36% telah diperiksa terpisah dan TIDAK
menunjukkan pola artefak yang sama; penurunannya berlangsung bertahap selama
beberapa hari, konsisten dengan peristiwa pasar yang sebenarnya.

### 4. Kelas skor 3 pada variabel Market Cap kosong

Tidak ada satu pun aset pada dataset yang berkapitalisasi di bawah 100 juta
dolar, sehingga kelas skor 3 untuk Market Cap tidak terisi. Penyebabnya bersifat
struktural: dataset diambil dari 250 aset dengan kapitalisasi terbesar, dan
kapitalisasi terkecil yang lolos saring adalah 108.199.227 dolar, masih di atas
ambang 100 juta dolar.

Ini bukan kesalahan implementasi. Ambang tersebut memang dirancang untuk
menjangkau aset mikro yang berada jauh di luar 250 besar. Untuk mengisi kelas
tersebut, pengambilan data perlu diperluas melampaui peringkat 250.

Tiga variabel lainnya, yaitu Volume 24 Jam, Volatilitas, dan Rasio Likuiditas,
terisi lengkap pada keempat kelas skor.

### 5. Dua belas aset bervolume perdagangan tepat nol

Aset berikut memiliki volume 24 jam senilai 0 dolar, sehingga rasio
likuiditasnya juga bernilai 0 dan memperoleh skor 3:

BUIDL, EURSAFO, BCAP, USTB, EUTBL, JTRSY, JAAA, OUSG, VBILL, USTBL, SAFO, JPYSC

Seluruhnya merupakan token surat berharga atau aset dunia nyata yang
diperdagangkan melalui penerbitan primer, bukan melalui bursa publik. Secara
teknis skor 3 sudah tepat karena rasio likuiditasnya memang nol. Namun secara
tafsir ekonomi, ketiadaan volume pada aset semacam ini menandakan struktur pasar
yang berbeda, bukan kesulitan menjual sebagaimana yang dimaksud oleh variabel
Rasio Likuiditas dalam skripsi ini. Perbedaan tafsir ini perlu disebutkan
sebagai keterbatasan penelitian.

### 6. Kolom deviasi terhadap web CoinGecko bernilai nol secara tautologis

Pada BLOK-4.10-REKONSILIASI, kolom Deviasi vs Web diisi 0,0000 karena sistem
membaca angka dari CoinGecko API, sedangkan halaman web CoinGecko menampilkan
angka dari basis data yang sama. Kedua nilai berasal dari satu sumber, sehingga
kesesuaian di antara keduanya tidak membuktikan apa pun secara independen.
Angka 0,0000 pada kolom tersebut sebaiknya tidak dijadikan klaim keberhasilan.

Terdapat dua pembuktian yang benar-benar independen:

Pertama, BLOK-4.11-IDENTITAS merekonsiliasi Market Cap terhadap hasil perkalian
Harga dengan Circulating Supply. Selisih terbesar hanya 0,0978% dan selisih
rata-rata 0,0496%, seluruhnya jauh di bawah toleransi 1%.

Kedua, kolom Market Cap CoinMarketCap kini terisi angka sungguhan, bukan
penanda pengisian manual. Rinciannya dijelaskan pada temuan nomor 14.

### 14. Verifikasi lintas sumber terhadap CoinMarketCap

CoinMarketCap merupakan penyedia data yang sepenuhnya terpisah dari CoinGecko,
dengan metodologi agregasi bursa dan penentuan circulating supply sendiri.
Kesesuaian antara keduanya merupakan bukti silang yang sesungguhnya bahwa nilai
variabel yang masuk ke sistem memang benar.

Kedua sumber diambil dalam satu proses yang sama dengan jeda hanya 0,6 detik,
sehingga deviasi yang terukur mencerminkan perbedaan metodologi antar-penyedia,
bukan pergerakan harga akibat beda waktu pengambilan.

Hasil untuk sepuluh aset:

- 9 dari 10 aset berstatus Sesuai, dengan deviasi di bawah 1%
- Deviasi rata-rata 0,2075%
- Deviasi terbesar 1,6279% pada PEPE, satu-satunya yang berstatus Periksa

Penelusuran terhadap PEPE menunjukkan penyebabnya bukan kesalahan harga:

| Komponen | CoinGecko | CoinMarketCap | Deviasi |
|---|---|---|---|
| Harga | 0,00000284 | 0,000002843284 | 0,1156% |
| Circulating supply | 420.690.000.000.000 | 413.772.355.236.800 | -1,6444% |

Harga kedua sumber praktis sama. Seluruh deviasi berasal dari circulating
supply: CoinGecko melaporkan angka pasokan penuh 420,69 triliun token,
sedangkan CoinMarketCap mengurangi sekitar 6,92 triliun token yang telah
dibakar. Ini merupakan perbedaan kebijakan akuntansi pasokan antar-penyedia,
bukan kesalahan sistem. Sistem membaca angka dari CoinGecko secara setia, dan
hal itu memang yang seharusnya dilakukan.

Yang paling penting untuk penelitian ini: **deviasi antar-sumber tidak mengubah
kelas risiko satu pun aset.** Skor Market Cap untuk kesepuluh aset identik
apabila dihitung memakai angka CoinGecko maupun angka CoinMarketCap. Hal ini
menunjukkan klasifikasi bersifat kokoh terhadap perbedaan sumber data, karena
ambang batas yang dipakai berskala orde besaran, jauh lebih lebar daripada
selisih antar-penyedia yang hanya berkisar sepersekian persen.

Catatan sumber: data CoinMarketCap diambil dari endpoint data publik yang
dipakai situs coinmarketcap.com sendiri, tanpa kunci API. Angkanya identik
dengan yang tampil pada halaman web. Skrip pengambilannya adalah
`validasi/uji-lintas-sumber.mjs` dan hasil mentahnya tersimpan pada
`validasi/hasil-lintas-sumber.json`.

Perlu dicatat bahwa BLOK-4.10 dan BLOK-4.11 berasal dari dua momen pengambilan
yang berbeda, karena keduanya menguji hal yang berbeda. BLOK-4.10 memakai
pengambilan lintas sumber, BLOK-4.11 memakai pengambilan rekonsiliasi
identitas. Kedua waktunya tercantum pada bagian ANGKA PENTING.

### 7. Cohen's Kappa bernilai 1,0000 — apa yang sebenarnya diukur

Nilai Kappa sempurna pada penelitian ini mengukur KESETIAAN IMPLEMENTASI
terhadap spesifikasi tertulis, bukan akurasi prediksi risiko terhadap kenyataan
pasar. Kedua jalur klasifikasi menerima masukan yang sama persis; yang diuji
adalah apakah kode pada `riskClassifier.js` berperilaku identik dengan aturan
pada Tabel 3.1 sampai 3.4 skripsi.

Konsekuensinya, walaupun sebuah aset memiliki data yang cacat seperti KAU, kedua
jalur tetap mengklasifikasikannya secara konsisten. Nilai Kappa 1,0000 sama
sekali tidak menyatakan bahwa penilaian risiko sistem sesuai dengan risiko yang
sebenarnya terjadi di pasar. Klaim semacam itu memerlukan rancangan penelitian
yang berbeda, misalnya pengujian terhadap kerugian aktual portofolio.

Perlu dicatat pula bahwa nilai p_e sebesar 0,490385 tergolong tinggi, akibat
sebaran kelas yang tidak seimbang, yaitu 57 Low, 93 Medium, dan 6 High.

### 8. Komposisi dataset condong ke aset berpatokan nilai

Sebagian besar aset yang lolos saring merupakan stablecoin, token surat
berharga, dan token logam mulia. Aset semacam ini secara struktural memiliki
volatilitas mendekati nol, sehingga 131 dari 156 aset memperoleh skor 0 pada
variabel Volatilitas.

Penyebabnya adalah metode penyaringan: aset berkapitalisasi terbesar di
ekosistem Ethereum memang didominasi stablecoin. Hal ini menyebabkan variabel
Volatilitas menjadi kurang diskriminatif pada dataset ini dibandingkan
penggunaannya pada portofolio kripto yang sesungguhnya.

### 9. Satu aset gagal diambil

Aset dengan simbol M (CoinGecko id `mantis`) gagal diproses karena endpoint
`market_chart` mengembalikan 0 titik harga, sehingga volatilitas tidak dapat
dihitung. Aset ini dikeluarkan dari dataset. Dari 157 aset yang lolos saring,
156 berhasil dikumpulkan.

### 10. Proyek bukan git repository

Perintah `git rev-parse` mengembalikan pesan `fatal: not a git repository`,
sehingga kolom Commit repo tidak dapat diisi dan verifikasi `git diff` pada
Tahap 3 tidak dapat dijalankan. Sebagai gantinya dipakai checksum SHA-256, yang
memberikan jaminan setara untuk membuktikan kode sumber kembali utuh setelah
mutation test.

Checksum `riskClassifier.js` sebelum dan sesudah ketiga mutasi tercatat identik:
`53b957d7f74cff0de21ba6f8e68c6ced50911ca93b5d3928a4395d93dd377123`

Checksum ini merupakan nilai setelah perbaikan validasi masukan (temuan nomor 1)
dan perbaikan label (temuan nomor 2). Mutation test dijalankan ulang terhadap
kode versi final ini, sehingga bukti pada Tahap 3 berlaku untuk kode yang
sekarang, bukan untuk versi sebelumnya.

### 11. Jumlah test lama pada repo adalah 183, bukan 87

Instruksi awal menyebutkan angka 87 test lama. Hasil eksekusi yang sebenarnya
menunjukkan 183 test lama pada 11 suite, yang seluruhnya lulus. Setelah ditambah
163 test validasi baru, totalnya menjadi 346 test pada 12 suite. Angka 183 dan
346 inilah yang dipakai dalam laporan ini.

### 12. Jendela volatilitas lebih pendek pada sebagian aset

Beberapa aset yang baru terdaftar mengembalikan kurang dari 31 titik harga dari
endpoint `market_chart`, sehingga volatilitasnya dihitung dari jendela yang
lebih pendek daripada 30 hari. Contohnya USYC dengan 13 titik dan JPYSC dengan
18 titik. Sistem tetap menghitung selama tersedia minimal 2 titik harga, sesuai
guard pada `portfolioAnalyzer.js:29`. Perbedaan panjang jendela ini dapat
memengaruhi keterbandingan nilai volatilitas antar-aset.

### 13. Angka yang tidak berhasil diperoleh

- **Commit hash repo** tidak tersedia karena folder proyek bukan git
  repository, sebagaimana dijelaskan pada temuan nomor 10. Digantikan checksum
  SHA-256.

Seluruh angka lain pada laporan ini berhasil diperoleh dari eksekusi. Kolom
Market Cap CoinMarketCap pada BLOK-4.10-REKONSILIASI yang semula direncanakan
diisi manual dari peramban kini sudah terisi otomatis melalui
`validasi/uji-lintas-sumber.mjs`, sehingga kolom Deviasi vs CMC juga sudah
terhitung. Rinciannya pada temuan nomor 14.

Kolom Market Cap Web CoinGecko diisi dengan nilai yang sama persis dengan kolom
Market Cap Sistem, karena keduanya memang berasal dari basis data CoinGecko
yang sama. Konsekuensinya kolom Deviasi vs Web bernilai 0,0000 secara
tautologis, sebagaimana dijelaskan pada temuan nomor 6.
