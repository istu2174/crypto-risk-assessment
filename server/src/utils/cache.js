import NodeCache from 'node-cache';

// Single shared cache instance. stdTTL=0 = no default expiry; set TTL per-key.
const cache = new NodeCache({
  stdTTL: 0,
  checkperiod: 120, // background cleanup tiap 2 menit
  useClones: false, // hemat memory; jangan mutate data hasil .get()
});

export default cache;
