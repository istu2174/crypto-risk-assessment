/**
 * ethProvider — pilih provider MetaMask secara spesifik via EIP-6963.
 *
 * Masalah: kalau ada >1 wallet yang nyuntik `window.ethereum` (mis. Phantom +
 * MetaMask), `window.ethereum` bisa ke-hijack salah satu. Akibatnya klik
 * "MetaMask" malah buka Phantom.
 *
 * Solusi: EIP-6963 (Multi Injected Provider Discovery). Tiap wallet announce
 * dirinya lewat event `eip6963:announceProvider` dengan `rdns` unik. Kita
 * dispatch `eip6963:requestProvider` buat mancing announcement, lalu pilih
 * yang rdns-nya MetaMask.
 *
 * Ref: https://eips.ethereum.org/EIPS/eip-6963
 */

const MM_RDNS = 'io.metamask';

/**
 * Cari provider MetaMask. Return EIP-1193 provider atau null kalau gak ketemu.
 * @param {object} opts
 * @param {number} opts.timeout - ms nunggu announcement (default 400)
 */
export function getMetaMaskProvider({ timeout = 400 } = {}) {
  return new Promise((resolve) => {
    const found = [];

    const onAnnounce = (event) => {
      const detail = event.detail;
      if (detail?.info && detail?.provider) found.push(detail);
    };

    window.addEventListener('eip6963:announceProvider', onAnnounce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', onAnnounce);

      // 1. EIP-6963: cari by rdns (paling reliable)
      const mm = found.find((d) => d.info.rdns === MM_RDNS);
      if (mm) return resolve(mm.provider);

      // 2. Fallback gaya lama: window.ethereum.providers[] (array multi-wallet)
      const eth = window.ethereum;
      if (Array.isArray(eth?.providers)) {
        const legacy = eth.providers.find((p) => p.isMetaMask && !p.isPhantom);
        if (legacy) return resolve(legacy);
      }

      // 3. Fallback terakhir: window.ethereum kalau emang MetaMask & bukan Phantom
      if (eth?.isMetaMask && !eth.isPhantom) return resolve(eth);

      resolve(null);
    }, timeout);
  });
}
