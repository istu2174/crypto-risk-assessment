# HASIL VALIDASI SISTEM PENILAIAN RISIKO — DATASET 101 ASET

Tanggal eksekusi: 15 Agustus 2026, pukul 04.06.51 UTC

Dataset: 101 aset hasil penarikan sampel stratified purposive berdasarkan tier
kapitalisasi pasar, diambil 28 Juli 2026 pukul 11.36.53 WIB (Lampiran 6 skripsi).
Laporan ini menggantikan hasil dataset 156 aset pada `HASIL-VALIDASI.md`, yang
tetap disimpan sebagai arsip.

Sumber dataset: `server/output/survey-20260728-1136.json` — berkas hasil run 28 Juli 2026
yang masih tersimpan di repo, dibaca ulang apa adanya. Tidak ada pemanggilan
API baru pada sesi ini, sehingga seluruh angka tetap identik dengan Lampiran 6
yang sudah tercetak di skripsi. Acuan Tabel L6.3 diambil dari `survey-20260728-1136.csv`.

Commit repo: TIDAK TERSEDIA — folder proyek ini bukan git repository. Sebagai gantinya dipakai checksum SHA-256 berkas inti:
  - `server/src/services/riskClassifier.js` → `53b957d7f74cff0de21ba6f8e68c6ced50911ca93b5d3928a4395d93dd377123`
  - `server/src/services/portfolioAnalyzer.js` → `4b16b01293c228c9eef60ee42d2f18c6f8288f2fec9a4618044de901dd8814ea`

## RINGKASAN EKSEKUSI

| Tahap | Status | Catatan |
|---|---|---|
| Tahap A Susun dataset 101 | BERHASIL | 101 aset dibaca dari berkas hasil run 28 Juli 2026 |
| Tahap A Verifikasi silang L6.3 | BERHASIL | 89 dari 89 aset identik dengan Tabel L6.3, 0 selisih |
| Tahap B Matriks konfusi | BERHASIL | Akurasi 100,00%, Cohen's Kappa 1,0000 |
| Tahap C Kalibrasi distribusional | BERHASIL | Keempat variabel berstatus Semua kelas terisi |
| Tahap D Perbandingan dataset | BERHASIL | 156 aset vs 101 aset dibandingkan |

## ANGKA PENTING UNTUK NARASI SKRIPSI

- JUMLAH_ASET_DATASET: 101
- JUMLAH_ASET_TERKLASIFIKASI: 89
- JUMLAH_ASET_GAGAL: 12 (6 volume 24 jam nol: JAAA, BCAP, EUTBL, USTB, NXM, FDIT; 6 riwayat harga kurang dari 30 hari: ANTFUN 14 hari, M 4 hari, SWOP 21 hari, TBB 5 hari, USYC 17 hari, CLBTC 23 hari)
- KOMPOSISI_EKOSISTEM: Solana 50, Ethereum 50, Bitcoin 1 (total 101)
- KOMPOSISI_TIER: Large Cap 5, Mid Cap 22, Small Cap 36, Micro Cap 38
- WAKTU_PENGAMBILAN_DATASET: 28 Juli 2026 pukul 11.36.53 WIB
- DISARING_SEBELUM_PENARIKAN_SAMPEL: 231 stablecoin (dipatok, volatilitas ~0); 148 wrapped/staked (duplikat aset native); 313 duplikat lintas ekosistem
- POPULASI_SUMBER: solana-ecosystem 1.512 aset, ethereum-ecosystem 1.826 aset, batas 50 aset per ekosistem
- STATUS_KELAS_MARKETCAP_SKOR3: TERISI, 34 aset dari 89 aset terklasifikasi (38,20%)
- NILAI_MARKETCAP_TERKECIL: 42.651.590 dolar (TROLL — TROLL)
- JUMLAH_TEST_DUA_MODUL_INTI: 250 (portfolioAnalyzer.test.js 33, riskClassifier.test.js 54, riskClassifier.validation.test.js 163)
- JUMLAH_TEST_TOTAL: 346 pada 12 suite, seluruhnya lulus, 0 gagal

## BLOK-4.10-REKONSILIASI
Aset;Market Cap Sistem (USD);Market Cap Web CoinGecko (USD);Market Cap CoinMarketCap (USD);Deviasi vs Web (%);Deviasi vs CMC (%);Kelas Sistem;Status
BTC;1.286.468.731.705;1.286.468.731.705;1.286.163.438.426;0,0000;-0,0237;Large Cap (>= $10B);Sesuai
ETH;230.186.641.798;230.186.641.798;230.203.519.611;0,0000;0,0073;Large Cap (>= $10B);Sesuai
SOL;44.684.164.139;44.684.164.139;44.694.486.521;0,0000;0,0231;Large Cap (>= $10B);Sesuai
LINK;6.578.122.200;6.578.122.200;6.583.160.954;0,0000;0,0766;Mid Cap ($1B – $10B);Sesuai
UNI;2.200.294.750;2.200.294.750;2.200.764.966;0,0000;0,0214;Mid Cap ($1B – $10B);Sesuai
JUP;572.644.817;572.644.817;573.142.931;0,0000;0,0870;Small Cap ($100M – $1B);Sesuai
BONK;199.230.859;199.230.859;199.491.609;0,0000;0,1309;Small Cap ($100M – $1B);Sesuai
WIF;139.121.807;139.121.807;139.020.542;0,0000;-0,0728;Small Cap ($100M – $1B);Sesuai
PEPE;1.195.941.209;1.195.941.209;1.176.472.463;0,0000;-1,6279;Mid Cap ($1B – $10B);Periksa
SHIB;2.645.296.115;2.645.296.115;2.645.399.819;0,0000;0,0039;Mid Cap ($1B – $10B);Sesuai

## BLOK-4.11-IDENTITAS
Aset;Harga (USD);Circulating Supply;Harga x Supply (USD);Market Cap dari API (USD);Selisih (%);Rasio Likuiditas Manual;Rasio Likuiditas Sistem;Status
BTC;63.802,00;20.069.084;1.280.447.697.368;1.280.431.632.766;0,0013%;1,6517%;1,6517%;Sesuai
ETH;1.891,78;120.682.014;228.303.820.433;228.278.151.532;0,0112%;2,9304%;2,9304%;Sesuai
SOL;76,29;582.499.810;44.438.910.499;44.428.125.256;0,0243%;2,9583%;2,9583%;Sesuai
LINK;8,74;748.099.970;6.538.393.742;6.533.890.892;0,0689%;5,3753%;5,3753%;Sesuai
UNI;3,54;624.308.424;2.210.051.820;2.211.504.433;0,0657%;12,6360%;12,6360%;Sesuai
JUP;0,1731;3.320.312.968;574.639.925;574.409.496;0,0401%;4,1875%;4,1875%;Sesuai
BONK;0,000002290000;87.994.589.858.117;201.507.611;201.310.818;0,0978%;14,6387%;14,6387%;Sesuai
WIF;0,1390;998.926.392;138.811.810;138.935.755;0,0892%;12,2895%;12,2895%;Sesuai
PEPE;0,000002830000;420.690.000.000.000;1.190.552.700;1.189.400.539;0,0969%;8,6189%;8,6189%;Sesuai
SHIB;0,000004460000;589.239.603.778.739;2.628.008.633;2.627.979.959;0,0011%;2,2860%;2,2860%;Sesuai

## BLOK-4.12-PROPERTI
Variabel;Jumlah Masukan Uji;Properti 1;Properti 2;Properti 3;Status
Market Cap;100.000;TERPENUHI;TERPENUHI;TERPENUHI;LULUS
Volume 24 Jam;100.000;TERPENUHI;TERPENUHI;TERPENUHI;LULUS
Volatilitas;100.000;TERPENUHI;TERPENUHI;TERPENUHI;LULUS
Rasio Likuiditas;100.000;TERPENUHI;TERPENUHI;TERPENUHI;LULUS

## BLOK-4.13-KONFUSI
;Prediksi Low;Prediksi Medium;Prediksi High;Total Aktual
Aktual Low;34;0;0;34
Aktual Medium;0;44;0;44
Aktual High;0;0;11;11
Total Prediksi;34;44;11;89

## BLOK-4.14-METRIK
Metrik;Nilai;Interpretasi
Akurasi keseluruhan;100,00%;89 dari 89 aset diklasifikasikan tepat
Precision Low;100,00%;TP=34, FP=0
Recall Low;100,00%;TP=34, FN=0
Precision Medium;100,00%;TP=44, FP=0
Recall Medium;100,00%;TP=44, FN=0
Precision High;100,00%;TP=11, FP=0
Recall High;100,00%;TP=11, FN=0
Cohen's Kappa;1,0000;Almost perfect menurut Landis dan Koch (1977)

## BLOK-4.15-KALIBRASI
Variabel;Ambang 1 (persentil);Ambang 2 (persentil);Ambang 3 (persentil);Jumlah Aset per Kelas (skor 0/1/2/3);Status Kalibrasi
Market Cap;38,20%;70,79%;94,38%;5/21/29/34;Semua kelas terisi
Volume 24 Jam;16,85%;49,44%;82,02%;16/29/29/15;Semua kelas terisi
Volatilitas;71,91%;95,51%;97,75%;64/21/2/2;Semua kelas terisi
Rasio Likuiditas;31,46%;53,93%;75,28%;22/19/20/28;Semua kelas terisi

## BLOK-PERBANDINGAN-DATASET
Aspek;Dataset 156 Aset;Dataset 101 Aset
Metode penarikan sampel;250 aset teratas CoinGecko;Stratified purposive per tier kapitalisasi
Waktu pengambilan;12 Agustus 2026 09.30.55 UTC;28 Juli 2026 11.36.53 WIB
Jumlah aset dataset;156;101
Jumlah aset masuk perhitungan;156;89
Jumlah aset gagal;1;12
Akurasi;100,00%;100,00%
Cohen's Kappa;1,0000;1,0000
p_e (kesepakatan acak);0,490385;0,405631
Sebaran kelas risiko (Low/Medium/High);57/93/6;34/44/11
Sebaran skor 0/1/2/3 — Market Cap;6/37/113/0;5/21/29/34
Sebaran skor 0/1/2/3 — Volume 24 Jam;20/57/46/33;16/29/29/15
Sebaran skor 0/1/2/3 — Volatilitas;131/18/4/3;64/21/2/2
Sebaran skor 0/1/2/3 — Rasio Likuiditas;16/38/50/52;22/19/20/28
Status kelas skor 3 Market Cap;KOSONG (0 aset);TERISI (34 aset)
Market cap terkecil (USD);108.199.227;42.651.590

## BLOK-LAMPIRAN-DATASET
Simbol;Ekosistem;Tier;Market Cap (USD);Volume 24h (USD);Volatilitas (%);Rasio Likuiditas (%);Skor Variabel;Total;Level
BTC;Bitcoin;Large Cap;1.269.503.306.219;26.756.509.478;1,6384%;2,1076%;0/0/0/2;2;Low
ETH;Ethereum;Large Cap;226.771.862.225;11.862.269.334;2,3645%;5,2309%;0/0/0/1;1;Low
BNB;Ethereum;Large Cap;75.244.609.440;518.576.025;1,2440%;0,6892%;0/0/0/3;3;Low
SOL;Solana;Large Cap;42.660.530.715;1.824.667.124;2,3540%;4,2772%;0/0/0/2;2;Low
WBT;Ethereum;Large Cap;16.267.039.305;88.513.119;2,6685%;0,5441%;0/1/0/3;4;Low
LEO;Ethereum;Mid Cap;8.971.979.237;243.745;0,9737%;0,0027%;1/3/0/3;7;Medium
LINK;Solana;Mid Cap;6.244.650.347;218.843.870;2,4582%;3,5045%;1/0/0/2;3;Low
AWETH;Ethereum;Mid Cap;4.418.113.043;1.579.136;2,3627%;0,0357%;1/2/0/3;6;Medium
WETH;Ethereum;Mid Cap;4.236.718.722;341.315.451;5,6191%;8,0561%;1/0/1/1;3;Low
GRAM;Ethereum;Mid Cap;3.974.949.568;24.892.525;3,3316%;0,6262%;1/1/0/3;5;Medium
USYC;Ethereum;Mid Cap;2.955.639.885;1.208;;;;;Tidak terklasifikasi (histori harga hanya 17 hari)
SHIB;Ethereum;Mid Cap;2.762.420.319;198.066.491;4,1991%;7,1700%;1/0/1/1;3;Low
CRO;Ethereum;Mid Cap;2.598.686.366;8.312.814;2,8717%;0,3199%;1/2/0/3;6;Medium
XAUT;Ethereum;Mid Cap;2.473.537.859;132.542.255;1,0029%;5,3584%;1/0/0/1;2;Low
UNI;Ethereum;Mid Cap;2.333.712.561;165.405.855;3,4709%;7,0877%;1/0/0/1;2;Low
ONDO;Ethereum;Mid Cap;1.903.743.611;149.364.391;4,6091%;7,8458%;1/0/1/1;3;Low
OKB;Ethereum;Mid Cap;1.811.372.510;20.872.347;1,1547%;1,1523%;1/1/0/2;4;Low
PAXG;Ethereum;Mid Cap;1.796.628.939;105.176.138;1,0338%;5,8541%;1/0/0/1;2;Low
WLFI;Ethereum;Mid Cap;1.746.771.917;26.715.116;1,2908%;1,5294%;1/1/0/2;4;Low
HTX;Ethereum;Mid Cap;1.590.816.512;47.479.491;1,6854%;2,9846%;1/1/0/2;4;Low
AAVE;Ethereum;Mid Cap;1.506.247.519;245.446.316;3,6973%;16,2952%;1/0/0/0;1;Low
MNT;Ethereum;Mid Cap;1.319.476.297;28.686.974;2,1321%;2,1741%;1/1/0/2;4;Low
SKY;Ethereum;Mid Cap;1.316.799.039;11.344.159;3,8078%;0,8615%;1/1/0/3;5;Medium
MORPHO;Ethereum;Mid Cap;1.274.189.113;15.096.638;3,9220%;1,1848%;1/1/0/2;4;Low
WLD;Ethereum;Mid Cap;1.217.298.374;108.437.463;5,0454%;8,9080%;1/0/1/1;3;Low
PEPE;Ethereum;Mid Cap;1.183.327.530;225.065.721;3,8198%;19,0197%;1/0/0/0;1;Low
ICP;Ethereum;Mid Cap;1.164.528.665;33.113.238;2,2514%;2,8435%;1/1/0/2;4;Low
BCAP;Ethereum;Small Cap;967.888.430;0;;;;;Tidak terklasifikasi (volume 24h nol / tidak tersedia)
EUTBL;Ethereum;Small Cap;960.867.716;0;;;;;Tidak terklasifikasi (volume 24h nol / tidak tersedia)
QNT;Ethereum;Small Cap;899.460.819;8.903.537;1,6246%;0,9899%;2/2/0/3;7;Medium
CLBTC;Ethereum;Small Cap;892.409.665;33;;;;;Tidak terklasifikasi (histori harga hanya 23 hari)
USTB;Ethereum;Small Cap;826.184.978;0;;;;;Tidak terklasifikasi (volume 24h nol / tidak tersedia)
PUMP;Solana;Small Cap;809.450.973;150.931.507;6,0471%;18,6462%;2/0/1/0;3;Low
JLP;Solana;Small Cap;800.643.663;2.881.852;1,4831%;0,3599%;2/2/0/3;7;Medium
ENA;Ethereum;Small Cap;793.114.779;127.948.751;3,7905%;16,1324%;2/0/0/0;2;Low
POL;Ethereum;Small Cap;780.363.603;30.449.243;2,1126%;3,9019%;2/1/0/2;5;Medium
RENDER;Ethereum;Small Cap;731.265.933;26.233.476;2,1245%;3,5874%;2/1/0/2;5;Medium
NEXO;Ethereum;Small Cap;714.534.637;6.518.862;1,7597%;0,9123%;2/2/0/3;7;Medium
RETH;Ethereum;Small Cap;705.936.331;417.949;2,2488%;0,0592%;2/3/0/3;8;Medium
GT;Ethereum;Small Cap;696.202.270;2.568.164;1,2023%;0,3689%;2/2/0/3;7;Medium
JAAA;Solana;Small Cap;686.055.418;0;;;;;Tidak terklasifikasi (volume 24h nol / tidak tersedia)
GHO;Ethereum;Small Cap;647.815.662;2.099.289;0,0275%;0,3241%;2/2/0/3;7;Medium
JUP;Solana;Small Cap;603.913.215;20.322.599;3,6833%;3,3652%;2/1/0/2;5;Medium
USX;Solana;Small Cap;522.734.102;1.328.498;0,0121%;0,2541%;2/2/0/3;7;Medium
TRUMP;Solana;Small Cap;376.851.206;53.791.085;2,3989%;14,2738%;2/1/0/0;3;Low
PYTH;Solana;Small Cap;334.116.648;22.986.784;3,9630%;6,8799%;2/1/0/1;4;Low
JTO;Solana;Small Cap;283.462.675;30.638.992;5,0902%;10,8088%;2/1/1/0;4;Low
ANTFUN;Solana;Small Cap;277.201.997;19.003.561;;;;;Tidak terklasifikasi (histori harga hanya 14 hari)
CARDS;Solana;Small Cap;252.974.886;4.008.338;7,5483%;1,5845%;2/2/1/2;7;Medium
ONYC;Solana;Small Cap;245.970.935;1.399.336;0,5014%;0,5689%;2/2/0/3;7;Medium
BC;Solana;Small Cap;214.322.426;72.716;4,4845%;0,0339%;2/3/1/3;9;High
GRASS;Solana;Small Cap;203.246.863;17.408.851;6,7898%;8,5654%;2/1/1/1;5;Medium
2Z;Solana;Small Cap;202.816.128;3.466.202;2,6778%;1,7090%;2/2/0/2;6;Medium
ZBCN;Solana;Small Cap;181.956.501;11.998.645;2,7118%;6,5942%;2/1/0/1;4;Low
RAY;Solana;Small Cap;161.176.817;9.338.925;3,4782%;5,7942%;2/2/0/1;5;Medium
WIF;Solana;Small Cap;147.902.109;20.914.846;3,0145%;14,1410%;2/1/0/0;3;Low
LION;Solana;Small Cap;142.657.073;20.920;2,3562%;0,0147%;2/3/0/3;8;Medium
HOLO;Solana;Small Cap;133.853.845;9.417.834;4,4664%;7,0359%;2/2/1/1;6;Medium
M;Solana;Small Cap;128.717.758;383.597;;;;;Tidak terklasifikasi (histori harga hanya 4 hari)
FARTCOIN;Solana;Small Cap;122.276.439;15.698.411;5,3341%;12,8385%;2/1/1/0;4;Low
CASH;Solana;Small Cap;122.028.460;10.837.563;0,0318%;8,8812%;2/1/0/1;4;Low
XAUT0;Solana;Small Cap;110.558.569;552.840;1,1805%;0,5000%;2/3/0/3;8;Medium
BP;Solana;Small Cap;109.901.325;1.773.072;5,5307%;1,6133%;2/2/1/2;7;Medium
GLM;Ethereum;Micro Cap;98.421.247;5.015.148;2,4487%;5,0956%;3/2/0/1;6;Medium
GEOD;Solana;Micro Cap;98.305.664;29.108.838;3,8493%;29,6105%;3/1/0/0;4;Low
FLUID;Ethereum;Micro Cap;95.411.476;3.630.686;5,7797%;3,8053%;3/2/1/2;8;Medium
KMNO;Solana;Micro Cap;93.339.819;3.383.836;2,7466%;3,6253%;3/2/0/2;7;Medium
CRCLON;Ethereum;Micro Cap;92.689.213;631.821;4,8539%;0,6817%;3/3/1/3;10;High
MET;Solana;Micro Cap;91.525.358;13.922.828;6,2113%;15,2120%;3/1/1/0;5;Medium
GALA;Ethereum;Micro Cap;90.986.643;21.646.250;2,9398%;23,7906%;3/1/0/0;4;Low
RAIL;Ethereum;Micro Cap;90.697.130;119.175;5,6289%;0,1314%;3/3/1/3;10;High
NEX;Ethereum;Micro Cap;90.110.047;522.102;10,7412%;0,5794%;3/3/2/3;11;High
RIF;Ethereum;Micro Cap;87.945.955;36.320.987;17,9463%;41,2992%;3/1/3/0;7;Medium
ZK;Ethereum;Micro Cap;85.896.700;6.927.129;2,7079%;8,0645%;3/2/0/1;6;Medium
NXM;Ethereum;Micro Cap;85.871.302;0;;;;;Tidak terklasifikasi (volume 24h nol / tidak tersedia)
SENT;Ethereum;Micro Cap;84.812.095;10.697.352;6,0378%;12,6130%;3/1/1/0;5;Medium
PYBOBO;Solana;Micro Cap;81.640.606;477.392;1,8216%;0,5847%;3/3/0/3;9;High
DBR;Solana;Micro Cap;80.998.577;2.292.197;2,5559%;2,8299%;3/2/0/2;7;Medium
ATH;Ethereum;Micro Cap;80.632.383;8.077.359;3,2155%;10,0175%;3/2/0/0;5;Medium
MELANIA;Solana;Micro Cap;79.890.133;7.751.321;2,2848%;9,7025%;3/2/0/1;6;Medium
INC;Solana;Micro Cap;79.458.969;110.399;3,3878%;0,1389%;3/3/0/3;9;High
WOULD;Solana;Micro Cap;78.658.385;23.303;1,5308%;0,0296%;3/3/0/3;9;High
BEAM;Ethereum;Micro Cap;78.208.922;4.140.956;3,9563%;5,2947%;3/2/0/1;6;Medium
RSC;Ethereum;Micro Cap;77.911.364;277.794;4,8938%;0,3566%;3/3/1/3;10;High
FDIT;Ethereum;Micro Cap;77.041.361;0;;;;;Tidak terklasifikasi (volume 24h nol / tidak tersedia)
ORDI;Solana;Micro Cap;73.499.411;16.533.934;5,2488%;22,4953%;3/1/1/0;5;Medium
BAN;Solana;Micro Cap;70.556.943;7.941.349;2,5982%;11,2552%;3/2/0/0;5;Medium
ORCA;Solana;Micro Cap;70.172.585;10.064.772;2,0620%;14,3429%;3/1/0/0;4;Low
ANSEM;Solana;Micro Cap;67.806.935;12.222.045;22,6391%;18,0248%;3/1/3/0;7;Medium
HOLO;Solana;Micro Cap;63.672.661;128.873;4,4587%;0,2024%;3/3/1/3;10;High
SWOP;Solana;Micro Cap;61.286.714;5;;;;;Tidak terklasifikasi (histori harga hanya 21 hari)
DOG;Solana;Micro Cap;60.693.065;541.591;2,3592%;0,8923%;3/3/0/3;9;High
USELESS;Solana;Micro Cap;57.395.801;6.442.167;7,1900%;11,2241%;3/2/1/0;6;Medium
JELLYJELLY;Solana;Micro Cap;56.389.265;5.964.383;3,1112%;10,5772%;3/2/0/0;5;Medium
ARC;Solana;Micro Cap;53.894.659;2.614.998;3,0338%;4,8521%;3/2/0/2;7;Medium
IO;Solana;Micro Cap;50.789.375;6.677.200;3,7676%;13,1468%;3/2/0/0;5;Medium
SKR;Solana;Micro Cap;50.405.192;1.854.888;3,2708%;3,6800%;3/2/0/2;7;Medium
HYPE;Solana;Micro Cap;46.739.312;15.299.722;3,6595%;32,7342%;3/1/0/0;4;Low
TBB;Solana;Micro Cap;42.787.340;468.254;;;;;Tidak terklasifikasi (histori harga hanya 5 hari)
OZA;Solana;Micro Cap;42.742.875;547;3,1446%;0,0013%;3/3/0/3;9;High
TROLL;Solana;Micro Cap;42.651.590;3.322.251;10,1105%;7,7893%;3/2/2/1;8;Medium

## TEMUAN DAN CATATAN

### 1. Verifikasi silang cocok sempurna pada ketiga pemeriksaan

Skor keempat variabel, total skor, dan level risiko dihitung ulang untuk
seluruh 89 aset yang dapat diklasifikasi penuh, memakai `riskClassifier.js`
versi sekarang. Hasilnya dibandingkan terhadap tiga acuan:

- Skor yang tercatat di dalam berkas JSON hasil run 28 Juli 2026: 0 selisih
- Kolom Skor Variabel, Total, dan Level pada Tabel L6.3: 0 selisih
- Dampak pembulatan empat desimal pada tabel dokumen: 0 aset bergeser kelas

Ini menjawab kekhawatiran bahwa kode sempat berubah enam baris setelah run
28 Juli 2026. Perubahan tersebut memang tidak memengaruhi keluaran untuk
masukan yang valid, sebagaimana dicatat pada temuan nomor 1 dan 2 laporan
dataset 156 aset: perubahan itu hanya menambahkan validasi masukan dan
memperbaiki dua teks label, tanpa menyentuh satu pun dari 12 ambang batas.

Pemeriksaan ketiga perlu dijelaskan tersendiri. Tabel L6.3 pada skripsi
menampilkan volatilitas dan rasio likuiditas yang sudah dibulatkan ke empat
desimal persen, sedangkan dataset dibangun dari nilai presisi penuh pada
berkas JSON. Kedua versi menghasilkan skor yang sama untuk seluruh aset,
sehingga angka yang tercetak di skripsi dapat dipertanggungjawabkan apa
adanya tanpa perlu direvisi.

### 2. Kelas skor 3 pada variabel Market Cap kini TERISI

Inilah alasan utama penggantian dataset, dan hasilnya positif. Sebanyak
34 aset dari 89 aset terklasifikasi (38,20%) berkapitalisasi di bawah
100 juta dolar, sehingga memperoleh skor 3 pada variabel Market Cap.

Kapitalisasi terkecil pada dataset ini adalah 42.651.590 dolar
(TROLL — TROLL), jauh di bawah ambang 100 juta dolar. Bandingkan dengan
dataset 156 aset yang kapitalisasi terkecilnya 108.199.227 dolar, masih di
atas ambang, sehingga kelas skor 3 kosong sama sekali.

Dengan demikian keempat variabel kini berstatus Semua kelas terisi, dan
keterbatasan yang dicatat pada temuan nomor 4 laporan dataset 156 aset sudah
tidak berlaku lagi.

### 3. Dua belas aset tidak dapat diklasifikasi penuh

Dari 101 aset, 12 aset tidak dapat diklasifikasi dan dikeluarkan dari
seluruh perhitungan matriks konfusi, metrik, dan kalibrasi. Perhitungan
karena itu berjalan pada 89 aset, bukan 101.

Sebanyak 6 aset bervolume 24 jam nol sehingga rasio likuiditas tidak dapat
dihitung:

- JAAA — Janus Henderson Anemoy AAA CLO Fund
- BCAP — Blockchain Capital
- EUTBL — Spiko EU T-Bills Money Market Fund
- USTB — Invesco Short Duration US Government Securities Fund
- NXM — Nexus Mutual
- FDIT — Fidelity Digital Interest Token

Seluruhnya merupakan token surat berharga atau aset dunia nyata yang
diperdagangkan melalui penerbitan primer, bukan melalui bursa publik. Pola
ini sama dengan temuan nomor 5 pada laporan dataset 156 aset.

Sebanyak 6 aset lainnya memiliki riwayat harga kurang dari 30 hari sehingga
volatilitas tidak dapat dihitung pada jendela penuh:

- ANTFUN — AntFun (histori harga hanya 14 hari)
- M — Mantis (histori harga hanya 4 hari)
- SWOP — Swop (histori harga hanya 21 hari)
- TBB — The Bitcoin Bull (histori harga hanya 5 hari)
- USYC — Circle USYC (histori harga hanya 17 hari)
- CLBTC — clBTC (histori harga hanya 23 hari)

Seluruhnya merupakan aset yang baru terdaftar. Perlu dicatat bahwa laporan
dataset 156 aset justru MENYERTAKAN aset semacam ini dengan jendela yang
lebih pendek (temuan nomor 12), sedangkan dataset 101 aset mengeluarkannya.
Dataset 101 aset karena itu lebih ketat pada titik ini, dan nilai
volatilitas antar-aset menjadi lebih terbandingkan.

### 4. Sebaran volatilitas membaik, tetapi kelas atas masih tipis

Ini perlu dikatakan apa adanya karena narasi skripsi akan menyesuaikan.

Pangsa aset berskor 0 pada variabel Volatilitas turun dari 83,97%
(131 dari 156 aset) menjadi 71,91% (64 dari 89 aset). Penyaringan
stablecoin dan aset wrapped atau staked memang bekerja, dan sebarannya lebih
merata daripada dataset 156 aset.

Namun kelas atas tetap sangat tipis. Hanya empat aset yang berskor di atas 1:

- ANSEM — The Black Bull: 22,6391% (skor 3)
- RIF — Rootstock Infrastructure Framework: 17,9463% (skor 3)
- NEX — Nexus: 10,7412% (skor 2)
- TROLL — TROLL: 10,1105% (skor 2)

Artinya kelas skor 2 dan skor 3 masing-masing hanya berisi 2 aset.
Secara teknis status kalibrasi tetap Semua kelas terisi, karena tidak ada
kelas yang kosong dan tidak ada kelas yang menyerap lebih dari 90 persen
populasi (kelas terbesar menyerap 71,91%). Tetapi dasar empiris untuk
kedua kelas teratas itu tetap lemah, dan sebaiknya tidak diklaim sebagai
bukti kuat bahwa ambang 8 persen dan 15 persen sudah terkalibrasi baik.

Penyebabnya struktural: volatilitas 30 hari kebanyakan aset kripto besar
berada di kisaran 1 sampai 6 persen, sedangkan ambang skor 2 dan 3 dirancang
menangkap peristiwa ekstrem yang jarang terjadi pada jendela 30 hari mana pun.

### 5. Sebagian aset berpatokan nilai masih lolos penyaringan

Penyaringan stablecoin tidak sepenuhnya bersih. Sebanyak 3 aset masih
berharga sekitar satu dolar dengan volatilitas mendekati nol:

- USX — USX: harga 0,999328 dolar, volatilitas 0,0121%
- CASH — CASH: harga 0,998783 dolar, volatilitas 0,0318%
- GHO — GHO: harga 0,998175 dolar, volatilitas 0,0275%

Ketiganya tidak tertangkap penyaring karena tidak terdaftar pada kategori
stablecoin CoinGecko. Jumlahnya kecil dan tidak mengubah status kalibrasi
mana pun, tetapi keberadaannya perlu disebutkan agar klaim bahwa dataset
bebas stablecoin tidak dinyatakan terlalu kuat di dalam skripsi.

Di luar ketiganya masih terdapat token beragun logam mulia seperti XAUT,
XAUT0, dan PAXG yang volatilitasnya sekitar satu persen. Aset semacam ini
sah sebagai aset kripto, namun ikut menekan sebaran volatilitas ke bawah.

### 6. Dua aset berbeda memakai simbol yang sama

Simbol HOLO muncul dua kali pada dataset dan merujuk dua aset yang berbeda:

- HOLO — Holoworld, ekosistem Solana, tier Small Cap, kapitalisasi 133.853.845 dolar
- HOLO — Holozone, ekosistem Solana, tier Micro Cap, kapitalisasi 63.672.661 dolar

Keduanya diklasifikasi terpisah dan benar, karena identifikasi pada proses
pengambilan memakai id CoinGecko, bukan simbol. Namun apabila tabel lampiran
dibaca berdasarkan kolom Simbol saja, kedua baris ini akan tampak seperti
duplikat. Perlu diberi catatan kaki pada lampiran skripsi agar penguji tidak
menyimpulkan ada penggandaan data.

### 7. Batas bawah volume yang ekstrem tetapi sah

Aset OZA memiliki volume 24 jam hanya 547 dolar dengan rasio
likuiditas 0,0013%, namun tetap dapat diklasifikasi karena volumenya
bukan nol dan riwayat harganya lengkap. Aset ini memperoleh skor 3 pada
variabel Volume maupun Rasio Likuiditas, yang memang tepat secara aturan.

Perbedaan perlakuan antara volume nol dan volume sangat kecil perlu
dijelaskan di skripsi: aset bervolume nol dikeluarkan karena rasio
likuiditasnya tidak terdefinisi secara bermakna, sedangkan aset bervolume
sangat kecil tetap masuk karena rasionya masih dapat dihitung.

### 8. Cohen's Kappa tetap 1,0000, dan maknanya tidak berubah

Sebagaimana pada dataset 156 aset, nilai Kappa sempurna di sini mengukur
KESETIAAN IMPLEMENTASI terhadap spesifikasi tertulis, bukan akurasi prediksi
risiko terhadap kenyataan pasar. Kedua jalur klasifikasi menerima masukan
yang sama persis; yang diuji adalah apakah kode berperilaku identik dengan
aturan pada Tabel 3.1 sampai 3.4 skripsi.

Satu perbaikan yang layak disebut: nilai p_e turun dari 0,490385 pada
dataset 156 aset menjadi 0,405631 pada dataset 101 aset. Semakin rendah p_e,
semakin kecil porsi kesepakatan yang dapat dijelaskan oleh kebetulan, dan
semakin bermakna nilai Kappa yang dihasilkan. Penyebabnya sebaran kelas
risiko yang lebih seimbang: 34 Low, 44 Medium, dan 11 High, dibandingkan
57 Low, 93 Medium, dan hanya 6 High pada dataset sebelumnya.

Kelas High kini berisi 11 aset atau 12,36% populasi, naik dari
6 aset atau 3,85%. Kelas High karena itu berdiri di atas dasar
empiris yang lebih kuat daripada sebelumnya.

### 9. Komposisi ekosistem tidak seimbang pada Bitcoin

Sebaran ekosistem adalah Solana 50 aset, Ethereum 50 aset, Bitcoin 1 aset.
Penarikan sampel memang menargetkan kategori solana-ecosystem dan
ethereum-ecosystem, sehingga Bitcoin hanya terwakili oleh satu aset yaitu BTC
itu sendiri. Ini konsekuensi rancangan penarikan sampel, bukan kegagalan
pengambilan data, tetapi perlu dinyatakan agar tidak dibaca sebagai klaim
keterwakilan lintas ekosistem yang setara.

### 10. Jumlah test dua modul inti adalah 250, bukan 87

Dokumen skripsi menyebut angka 87 di beberapa tempat. Angka itu berasal dari
dua suite saja:

- `portfolioAnalyzer.test.js` — 33 test
- `riskClassifier.test.js` — 54 test

Jumlahnya 87 test, yang cocok dengan angka 87 pada dokumen. Namun sejak
sesi validasi sebelumnya ditambahkan satu suite lagi yang khusus menguji
`riskClassifier.js`:

- `riskClassifier.validation.test.js` — 163 test

Total test yang khusus menguji `riskClassifier.js` dan `portfolioAnalyzer.js`
karena itu adalah 250 test, bukan 87. Angka inilah yang sebaiknya dipakai
dalam dokumen skripsi.

Adapun total seluruh test pada repo tetap 346 pada 12 suite, seluruhnya
lulus tanpa kegagalan. Angka ini diverifikasi ulang pada sesi ini, bukan
disalin dari sesi sebelumnya.

### 11. Angka yang tidak berhasil diperoleh

- **Commit hash repo** tidak tersedia karena folder proyek bukan git
  repository. Digantikan checksum SHA-256 sebagaimana pada laporan
  sebelumnya.

Seluruh angka lain yang diminta pada sesi ini berhasil diperoleh dari
eksekusi nyata. Tidak ada nilai yang diperkirakan atau dikarang.

Perlu dicatat bahwa BLOK-4.10-REKONSILIASI, BLOK-4.11-IDENTITAS, dan
BLOK-4.12-PROPERTI disalin apa adanya dari laporan dataset 156 aset karena
ketiganya tidak bergantung pada dataset: dua blok pertama merekonsiliasi
sepuluh aset acuan terhadap sumber eksternal, dan blok ketiga menguji
properti matematis fungsi skor memakai 100.000 masukan acak. Waktu
pengambilan untuk kedua blok pertama tetap sebagaimana tercantum pada
laporan lama, yaitu 12 Agustus 2026.
