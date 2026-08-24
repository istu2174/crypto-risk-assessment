# HASIL VALIDASI SISTEM PENILAIAN RISIKO

Tanggal eksekusi: 12 Agustus 2026, pukul 11.10.58 UTC

Commit repo: TIDAK TERSEDIA — folder proyek ini bukan git repository. Sebagai gantinya dipakai checksum SHA-256 berkas inti:
  - `server/src/services/riskClassifier.js` → `53b957d7f74cff0de21ba6f8e68c6ced50911ca93b5d3928a4395d93dd377123`
  - `server/src/services/portfolioAnalyzer.js` → `4b16b01293c228c9eef60ee42d2f18c6f8288f2fec9a4618044de901dd8814ea`
  - `server/src/services/__tests__/riskClassifier.validation.test.js` → `1d149542af5f833b996ea8696e6b50e6e9d7e31ee7683ab6018960b94b4061dc`

## RINGKASAN EKSEKUSI

| Tahap | Status | Catatan |
|---|---|---|
| Tahap 0 Verifikasi ambang batas | BERHASIL | 12 dari 12 ambang batas dan arah operator cocok dengan dokumen skripsi |
| Tahap 2 Test validasi | BERHASIL | 163 lulus / 0 gagal |
| Tahap 3 Mutation test | BERHASIL | 3 dari 3 mutasi tertangkap (mutation score 100,0%) |
| Tahap 4 Bangun dataset | BERHASIL | 156 aset terkumpul, 1 gagal |
| Tahap 5 Validasi data masukan | BERHASIL | 10 dari 10 aset berstatus Sesuai |
| Tahap 6 Matriks konfusi | BERHASIL | Akurasi 100,00%, Cohen's Kappa 1,0000 |

## ANGKA PENTING UNTUK NARASI SKRIPSI

- JUMLAH_ASET_DATASET: 156
- WAKTU_PENGAMBILAN_REKONSILIASI: 12 Agustus 2026, pukul 09.18.21 UTC
- WAKTU_PENGAMBILAN_DATASET: 12 Agustus 2026, pukul 09.30.55 UTC
- WAKTU_PENGAMBILAN_LINTAS_SUMBER: 12 Agustus 2026, pukul 11.05.37 UTC
- JUMLAH_TEST_VALIDASI_LULUS: 163
- JUMLAH_TEST_TOTAL_REPO: 346 pada 12 suite (terdiri atas 183 test lama dan 163 test validasi baru, 0 gagal)

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
Aktual Low;57;0;0;57
Aktual Medium;0;93;0;93
Aktual High;0;0;6;6
Total Prediksi;57;93;6;156

## BLOK-4.14-METRIK
Metrik;Nilai;Interpretasi
Akurasi keseluruhan;100,00%;156 dari 156 aset diklasifikasikan tepat
Precision Low;100,00%;TP=57, FP=0
Recall Low;100,00%;TP=57, FN=0
Precision Medium;100,00%;TP=93, FP=0
Recall Medium;100,00%;TP=93, FN=0
Precision High;100,00%;TP=6, FP=0
Recall High;100,00%;TP=6, FN=0
Cohen's Kappa;1,0000;Almost perfect menurut Landis dan Koch (1977)

## BLOK-4.15-KALIBRASI
Variabel;Ambang 1 (persentil);Ambang 2 (persentil);Ambang 3 (persentil);Jumlah Aset per Kelas (skor 0/1/2/3);Status Kalibrasi
Market Cap;0,00%;72,44%;96,15%;6/37/113/0;kelas skor 3 kosong (0 aset)
Volume 24 Jam;21,15%;50,64%;87,18%;20/57/46/33;Semua kelas terisi
Volatilitas;83,97%;95,51%;98,08%;131/18/4/3;Semua kelas terisi
Rasio Likuiditas;33,33%;65,38%;89,74%;16/38/50/52;Semua kelas terisi

## BLOK-LAMPIRAN-DATASET
Simbol;Ekosistem;Market Cap (USD);Volume 24h (USD);Volatilitas (%);Rasio Likuiditas (%);Skor Variabel;Total;Level
BTC;Bitcoin;1.279.214.448.959;21.205.645.768;1,3926%;1,6577%;0/0/0/2;2;Low
ETH;Ethereum;228.146.564.161;6.690.094.821;2,0357%;2,9324%;0/0/0/2;2;Low
USDT;Ethereum;183.011.034.469;34.369.064.433;0,0148%;18,7798%;0/0/0/0;0;Low
BNB;Ethereum;81.276.767.538;841.495.913;1,2767%;1,0353%;0/0/0/2;2;Low
USDC;Ethereum;72.098.273.871;8.437.032.494;0,0098%;11,7021%;0/0/0/0;0;Low
SOL;Solana;44.363.246.352;1.317.904.721;1,7237%;2,9707%;0/0/0/2;2;Low
USDS;Ethereum;9.798.350.305;165.425.833;0,0117%;1,6883%;1/0/0/2;3;Low
LEO;Ethereum;8.393.227.886;757.919;0,8465%;0,0090%;1/3/0/3;7;Medium
LINK;Ethereum;6.542.472.282;343.741.559;2,5078%;5,2540%;1/0/0/1;2;Low
WBT;Ethereum;6.518.811.948;53.592.110;1,3455%;0,8221%;1/1/0/3;5;Medium
DAI;Ethereum;4.567.222.683;152.863.037;0,0178%;3,3470%;1/0/0/2;3;Low
USD1;Ethereum;4.020.260.596;747.401.370;0,0219%;18,5909%;1/0/0/0;1;Low
USDE;Ethereum;3.949.613.368;24.877.700;0,0239%;0,6299%;1/1/0/3;5;Medium
GRAM;Ethereum;3.701.572.541;25.267.332;2,3552%;0,6826%;1/1/0/3;5;Medium
USDG;Ethereum;3.488.796.001;281.605.258;0,0364%;8,0717%;1/0/0/1;2;Low
USYC;Ethereum;3.005.759.470;5.667;0,1046%;0,0002%;1/3/0/3;7;Medium
PYUSD;Ethereum;2.797.306.732;134.768.354;0,0180%;4,8178%;1/0/0/2;3;Low
BUIDL;Ethereum;2.741.921.547;0;0,0000%;0,0000%;1/3/0/3;7;Medium
XAUT;Ethereum;2.687.011.781;156.686.896;1,2478%;5,8313%;1/0/0/1;2;Low
SHIB;Ethereum;2.621.731.136;60.009.568;4,2260%;2,2889%;1/1/1/2;5;Medium
CRO;Ethereum;2.214.092.287;5.200.604;2,5093%;0,2349%;1/2/0/3;6;Medium
UNI;Ethereum;2.203.260.335;278.798.801;3,8661%;12,6539%;1/0/0/0;1;Low
USDY;Ethereum;2.137.715.847;1.478.715;0,1587%;0,0692%;1/2/0/3;6;Medium
OKB;Ethereum;2.005.073.189;17.511.816;1,4544%;0,8734%;1/1/0/3;5;Medium
PAXG;Ethereum;1.921.808.547;114.885.003;1,2799%;5,9780%;1/0/0/1;2;Low
WLFI;Ethereum;1.744.380.506;28.427.560;1,4194%;1,6297%;1/1/0/2;4;Low
HTX;Ethereum;1.637.625.898;29.919.190;0,7267%;1,8270%;1/1/0/2;4;Low
ONDO;Ethereum;1.618.110.616;68.788.037;4,7178%;4,2511%;1/1/1/2;5;Medium
RLUSD;Ethereum;1.573.606.289;130.368.525;0,0138%;8,2847%;1/0/0/1;2;Low
USDD;Ethereum;1.543.386.943;97.958.324;0,0409%;6,3470%;1/1/0/1;3;Low
MNT;Ethereum;1.424.310.902;22.762.002;1,9844%;1,5981%;1/1/0/2;4;Low
AAVE;Ethereum;1.373.706.481;134.530.814;3,4210%;9,7933%;1/0/0/1;2;Low
USDF;Ethereum;1.336.941.819;820.160;0,0423%;0,0613%;1/3/0/3;7;Medium
MORPHO;Ethereum;1.287.987.542;14.712.832;2,7939%;1,1423%;1/1/0/2;4;Low
SKY;Ethereum;1.240.814.840;9.918.155;2,1696%;0,7993%;1/2/0/3;6;Medium
ICP;Ethereum;1.236.352.247;42.762.024;2,2039%;3,4587%;1/1/0/2;4;Low
U;Ethereum;1.221.734.236;99.968.409;0,0154%;8,1825%;1/1/0/1;3;Low
WLD;Ethereum;1.207.218.664;119.125.715;3,8099%;9,8678%;1/0/0/1;2;Low
PEPE;Ethereum;1.186.444.468;102.141.393;2,5811%;8,6090%;1/0/0/1;2;Low
BGB;Ethereum;1.176.384.498;5.377.879;1,4706%;0,4572%;1/2/0/3;6;Medium
USDGO;Solana;1.160.112.886;14.886.649;0,0102%;1,2832%;1/1/0/2;4;Low
EURSAFO;Ethereum;1.078.764.594;0;0,2529%;0,0000%;1/3/0/3;7;Medium
PUMP;Solana;1.036.164.883;94.368.965;6,3986%;9,1075%;1/1/1/1;4;Low
BCAP;Ethereum;967.341.704;0;0,0095%;0,0000%;2/3/0/3;8;Medium
USTB;Ethereum;958.208.195;0;0,0094%;0,0000%;2/3/0/3;8;Medium
EUTBL;Ethereum;928.178.286;0;0,2525%;0,0000%;2/3/0/3;8;Medium
ENA;Ethereum;875.608.852;96.169.343;4,0038%;10,9831%;2/1/1/0;4;Low
JTRSY;Ethereum;871.962.222;0;0,0093%;0,0000%;2/3/0/3;8;Medium
QNT;Ethereum;835.906.333;21.205.118;1,3224%;2,5368%;2/1/0/2;5;Medium
POL;Ethereum;804.515.676;27.589.108;1,7729%;3,4293%;2/1/0/2;5;Medium
NEXO;Ethereum;718.890.213;3.531.143;1,3991%;0,4912%;2/2/0/3;7;Medium
GT;Ethereum;715.367.183;805.131;0,9307%;0,1125%;2/3/0/3;8;Medium
GHO;Ethereum;697.807.999;10.724.659;0,0324%;1,5369%;2/1/0/2;5;Medium
JAAA;Ethereum;693.809.028;0;0,0131%;0,0000%;2/3/0/3;8;Medium
RENDER;Ethereum;652.176.595;25.168.542;1,8433%;3,8592%;2/1/0/2;5;Medium
BTW;Ethereum;579.039.256;15.796.906;11,4279%;2,7281%;2/1/2/2;7;Medium
LIT;Ethereum;572.216.582;35.448.974;5,2569%;6,1950%;2/1/1/1;5;Medium
JUP;Solana;570.768.665;23.791.990;2,4627%;4,1684%;2/1/0/2;5;Medium
USD0;Ethereum;550.744.254;1.777.168;0,0309%;0,3227%;2/2/0/3;7;Medium
ARB;Ethereum;516.786.484;36.701.169;2,3622%;7,1018%;2/1/0/1;4;Low
TUSD;Ethereum;492.475.053;14.396.493;0,0356%;2,9233%;2/1/0/2;5;Medium
A7A5;Ethereum;472.984.132;3.561;0,7827%;0,0008%;2/3/0/3;8;Medium
CAKE;Ethereum;464.305.043;21.437.495;1,6985%;4,6171%;2/1/0/2;5;Medium
INJ;Ethereum;461.482.277;71.714.002;3,6574%;15,5399%;2/1/0/0;3;Low
EURC;Ethereum;457.056.339;18.601.342;0,2354%;4,0698%;2/1/0/2;5;Medium
CRV;Ethereum;431.058.519;100.408.383;3,1479%;23,2934%;2/0/0/0;2;Low
PENGU;Ethereum;398.447.760;37.810.513;2,9798%;9,4895%;2/1/0/1;4;Low
OUSG;Ethereum;380.843.707;0;0,0083%;0,0000%;2/3/0/3;8;Medium
TRUMP;Solana;364.671.075;49.049.205;1,8551%;13,4503%;2/1/0/0;3;Low
ETHFI;Ethereum;361.722.828;21.544.491;4,3350%;5,9561%;2/1/1/1;5;Medium
USDTB;Ethereum;352.668.245;1.604.789;0,0250%;0,4550%;2/2/0/3;7;Medium
VIRTUAL;Ethereum;351.856.357;50.584.850;2,8626%;14,3766%;2/1/0/0;3;Low
FDUSD;Ethereum;350.725.669;73.425.636;0,0306%;20,9353%;2/1/0/0;3;Low
UB;Ethereum;341.107.649;8.120.852;11,5998%;2,3807%;2/2/2/2;8;Medium
KAU;Ethereum;337.257.428;5.823.589;21,7812%;1,7267%;2/2/3/2;9;High
PYTH;Solana;318.373.388;13.776.161;2,9981%;4,3270%;2/1/0/2;5;Medium
ANTFUN;Solana;318.062.933;18.831.396;1,2753%;5,9207%;2/1/0/1;4;Low
APXUSD;Ethereum;306.917.208;1.226.054;1,2419%;0,3995%;2/2/0/3;7;Medium
FET;Ethereum;301.865.509;35.250.401;2,7382%;11,6775%;2/1/0/0;3;Low
ZRO;Ethereum;297.255.793;18.781.022;3,4589%;6,3181%;2/1/0/1;4;Low
SPX;Ethereum;293.029.258;3.466.304;3,6559%;1,1829%;2/2/0/2;6;Medium
BC;Solana;283.465.781;72.289;3,7134%;0,0255%;2/3/0/3;8;Medium
JTO;Solana;283.426.760;22.417.282;3,8792%;7,9094%;2/1/0/1;4;Low
OHM;Ethereum;280.510.905;65.559;0,9316%;0,0234%;2/3/0/3;8;Medium
CARDS;Solana;279.037.321;1.369.950;8,4042%;0,4910%;2/2/2/3;9;High
NFT;Ethereum;277.200.292;5.022.760;0,8422%;1,8120%;2/2/0/2;6;Medium
GNO;Ethereum;275.806.535;2.271.810;1,7103%;0,8237%;2/2/0/3;7;Medium
BTT;Ethereum;257.520.535;6.340.696;1,0662%;2,4622%;2/2/0/2;6;Medium
ONYC;Solana;255.909.403;1.454.173;0,0454%;0,5682%;2/2/0/3;7;Medium
KITE;Ethereum;248.326.210;12.850.243;3,8534%;5,1747%;2/1/0/1;4;Low
LDO;Ethereum;241.607.222;20.213.975;4,5868%;8,3665%;2/1/1/1;5;Medium
PENDLE;Ethereum;230.097.894;18.810.497;2,8158%;8,1750%;2/1/0/1;4;Low
KAG;Ethereum;229.385.886;430.523;20,3637%;0,1877%;2/3/3/3;11;High
Q;Ethereum;226.558.567;2.049.034;6,0760%;0,9044%;2/2/1/3;8;Medium
FRAX;Ethereum;217.217.182;214.576;0,1179%;0,0988%;2/3/0/3;8;Medium
CRVUSD;Ethereum;215.385.682;7.873.316;0,1164%;3,6555%;2/2/0/2;6;Medium
AUSD;Ethereum;214.125.623;6.638.543;0,0182%;3,1003%;2/2/0/2;6;Medium
GRASS;Solana;204.054.399;12.442.167;3,8924%;6,0975%;2/1/0/1;4;Low
BONK;Ethereum;201.738.243;29.433.361;4,9873%;14,5899%;2/1/1/0;4;Low
PIEVERSE;Ethereum;201.524.644;2.841.074;4,5377%;1,4098%;2/2/1/2;7;Medium
JASMY;Ethereum;198.437.056;4.784.980;2,3405%;2,4113%;2/2/0/2;6;Medium
FLOKI;Ethereum;197.020.552;10.344.032;2,2619%;5,2502%;2/1/0/1;4;Low
FF;Ethereum;193.639.125;14.737.144;3,0490%;7,6106%;2/1/0/1;4;Low
VBILL;Ethereum;193.200.620;0;0,0000%;0,0000%;2/3/0/3;8;Medium
H;Ethereum;190.388.174;4.642.084;4,6561%;2,4382%;2/2/1/2;7;Medium
DEXE;Ethereum;186.880.786;16.222.418;32,3588%;8,6806%;2/1/3/1;7;Medium
USAT;Ethereum;185.170.380;1.640.625;0,0248%;0,8860%;2/2/0/3;7;Medium
REUSD;Ethereum;181.480.891;1.700.425;0,0217%;0,9370%;2/2/0/3;7;Medium
2Z;Solana;180.259.051;1.848.190;1,9299%;1,0253%;2/2/0/2;6;Medium
APYUSD;Ethereum;177.105.006;442.899;1,2478%;0,2501%;2/3/0/3;8;Medium
ENS;Ethereum;174.208.464;7.366.436;2,5643%;4,2285%;2/2/0/2;6;Medium
USDAI;Ethereum;174.156.212;2.593.469;0,0210%;1,4892%;2/2/0/2;6;Medium
SYRUP;Ethereum;173.007.155;5.179.929;2,1056%;2,9941%;2/2/0/2;6;Medium
RAY;Solana;170.092.005;5.249.759;2,3341%;3,0864%;2/2/0/2;6;Medium
USTBL;Ethereum;169.637.910;0;0,0098%;0,0000%;2/3/0/3;8;Medium
VCNT;Ethereum;167.812.757;298.692;1,1331%;0,1780%;2/3/0/3;8;Medium
CVX;Ethereum;163.537.653;9.811.300;3,8331%;5,9994%;2/2/0/1;5;Medium
ZBCN;Solana;162.316.936;10.367.257;2,9160%;6,3870%;2/1/0/1;4;Low
COMP;Ethereum;162.073.719;7.169.246;1,6787%;4,4234%;2/2/0/2;6;Medium
EURCV;Ethereum;161.109.686;7.067.072;0,2318%;4,3865%;2/2/0/2;6;Medium
TEL;Ethereum;157.841.837;1.231.053;4,5439%;0,7799%;2/2/1/3;8;Medium
STRK;Ethereum;155.114.136;13.906.998;3,6792%;8,9657%;2/1/0/1;4;Low
AXS;Ethereum;154.904.944;21.830.451;2,1837%;14,0928%;2/1/0/0;3;Low
HOLO;Solana;152.876.110;85.632.606;5,9105%;56,0144%;2/1/1/0;4;Low
STRCX;Ethereum;152.205.128;52.083;2,2865%;0,0342%;2/3/0/3;8;Medium
MX;Ethereum;151.126.808;2.439.183;0,6920%;1,6140%;2/2/0/2;6;Medium
GRT;Ethereum;148.183.702;12.558.857;2,0170%;8,4752%;2/1/0/1;4;Low
SAFO;Ethereum;145.431.746;0;0,0112%;0,0000%;2/3/0/3;8;Medium
BORG;Ethereum;143.756.284;170.153;2,6002%;0,1184%;2/3/0/3;8;Medium
BTSE;Ethereum;143.506.908;5.458.661;3,4237%;3,8038%;2/2/0/2;6;Medium
WIF;Solana;139.015.336;17.137.771;2,4634%;12,3280%;2/1/0/0;3;Low
VSN;Ethereum;136.523.444;777.114;2,2408%;0,5692%;2/3/0/3;8;Medium
FARTCOIN;Solana;134.938.914;13.342.835;3,5262%;9,8881%;2/1/0/1;4;Low
SHFL;Ethereum;134.178.299;519.492;4,3559%;0,3872%;2/3/1/3;9;High
CHZ;Ethereum;132.991.401;15.816.869;2,6254%;11,8932%;2/1/0/0;3;Low
MANA;Ethereum;128.907.639;8.361.654;1,9669%;6,4865%;2/2/0/1;5;Medium
EIGEN;Ethereum;128.676.761;12.653.465;3,2703%;9,8335%;2/1/0/1;4;Low
APE;Ethereum;128.311.852;11.743.606;2,8833%;9,1524%;2/1/0/1;4;Low
EDGE;Ethereum;127.555.689;2.362.701;4,2652%;1,8523%;2/2/1/2;7;Medium
JPYSC;Ethereum;126.113.847;0;0,7087%;0,0000%;2/3/0/3;8;Medium
LION;Solana;124.036.879;12.959;1,7334%;0,0104%;2/3/0/3;8;Medium
CASH;Solana;122.497.598;8.203.004;0,0365%;6,6965%;2/2/0/1;5;Medium
AIAT;Ethereum;119.600.847;16.644;0,7501%;0,0139%;2/3/0/3;8;Medium
SAND;Ethereum;119.260.906;9.914.322;2,2940%;8,3131%;2/2/0/1;5;Medium
TRAC;Ethereum;119.083.927;773.289;4,7322%;0,6494%;2/3/1/3;9;High
SFP;Ethereum;118.790.506;1.909.995;2,3075%;1,6079%;2/2/0/2;6;Medium
1INCH;Ethereum;117.585.947;10.424.754;2,8809%;8,8656%;2/1/0/1;4;Low
THBILL;Ethereum;117.522.399;33.787;0,1551%;0,0287%;2/3/0/3;8;Medium
SNX;Ethereum;116.349.258;7.505.748;2,2537%;6,4510%;2/2/0/1;5;Medium
XCN;Ethereum;116.099.930;2.093.869;3,4818%;1,8035%;2/2/0/2;6;Medium
SOSO;Ethereum;115.540.302;2.974.214;4,3489%;2,5742%;2/2/1/2;7;Medium
GOMINING;Ethereum;115.514.448;7.765.157;3,0516%;6,7222%;2/2/0/1;5;Medium
RLB;Ethereum;112.764.054;496.371;1,9624%;0,4402%;2/3/0/3;8;Medium
BSPX;Ethereum;112.028.348;20.501;5,3907%;0,0183%;2/3/1/3;9;High
FRXUSD;Ethereum;111.532.422;2.360.047;0,4188%;2,1160%;2/2/0/2;6;Medium
META;Solana;108.199.227;4.381.214;12,3349%;4,0492%;2/2/2/2;8;Medium

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
