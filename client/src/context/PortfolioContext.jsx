import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  listScans,
  getScanDetail,
  triggerScan,
  triggerDemoScan,
} from '../services/scanApi.js';

/**
 * PortfolioContext — state portofolio yang di-share antar halaman app
 * (Dashboard, Composition, History, Coin Detail). Dengan ini, pindah halaman
 * gak perlu fetch ulang scan yang sama.
 *
 * State:
 *   scans        : list ringkasan scan (history)
 *   selectedScan : detail scan aktif (punya assetSnapshots[])
 *   unclassified : token gak terklasifikasi (cuma ada dari scan baru)
 *   loading/error/scanning/demoScanning
 *   lastFetchedAt: timestamp fetch terakhir (buat RefreshControl)
 */
const PortfolioContext = createContext(null);

export function PortfolioProvider({ children }) {
  const [scans, setScans] = useState([]);
  const [selectedScan, setSelectedScan] = useState(null);
  const [unclassified, setUnclassified] = useState([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [demoScanning, setDemoScanning] = useState(false);
  const [error, setError] = useState(null);
  const [lastFetchedAt, setLastFetchedAt] = useState(null);

  const loadScans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listScans({ limit: 20, offset: 0 });
      setScans(res.data.scans);
      return res.data.scans;
    } catch (err) {
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const loadScanDetail = useCallback(async (scanId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await getScanDetail(scanId);
      setSelectedScan(res.data);
      setUnclassified([]); // scan lama dari DB gak bawa data unclassified
      setLastFetchedAt(new Date());
      return res.data;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const runScan = useCallback(
    async (chainType, address) => {
      if (!address) return null;
      setScanning(true);
      setError(null);
      try {
        const res = await triggerScan(chainType, address);
        await loadScans();
        await loadScanDetail(res.data.scanId);
        setUnclassified(res.data.unclassifiedAssets || []);
        return res.data;
      } catch (err) {
        setError(err);
        throw err;
      } finally {
        setScanning(false);
      }
    },
    [loadScans, loadScanDetail],
  );

  const runDemoScan = useCallback(async (scenario = 'concentrated') => {
    setDemoScanning(true);
    setError(null);
    try {
      const res = await triggerDemoScan(scenario);
      await loadScans();
      await loadScanDetail(res.data.scanId);
      setUnclassified(res.data.unclassifiedAssets || []);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setDemoScanning(false);
    }
  }, [loadScans, loadScanDetail]);

  // Initial load — fetch list & auto-pilih scan terbaru
  useEffect(() => {
    (async () => {
      const list = await loadScans();
      if (list.length > 0) loadScanDetail(list[0].id);
    })();
  }, [loadScans, loadScanDetail]);

  const value = {
    scans,
    selectedScan,
    unclassified,
    loading,
    scanning,
    demoScanning,
    error,
    lastFetchedAt,
    setError,
    loadScans,
    loadScanDetail,
    runScan,
    runDemoScan,
  };

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePortfolio() {
  const ctx = useContext(PortfolioContext);
  if (!ctx) throw new Error('usePortfolio harus dipakai di dalam <PortfolioProvider>');
  return ctx;
}
