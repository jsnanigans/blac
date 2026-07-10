import { Cubit } from '@blac/core';

export interface Instrument {
  symbol: string;
  name: string;
  price: number;
  open: number;
  prev: number;
}

export interface MarketState {
  instruments: Instrument[];
  running: boolean;
  ratePerSec: number;
  applied: number;
}

interface Seed {
  symbol: string;
  name: string;
  price: number;
}

// Tech stocks + crypto — a mix of large/small prices to exercise formatting.
const SEED: Seed[] = [
  { symbol: 'AAPL', name: 'Apple Inc.', price: 189.24 },
  { symbol: 'MSFT', name: 'Microsoft Corp.', price: 415.32 },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', price: 172.44 },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', price: 178.92 },
  { symbol: 'NVDA', name: 'NVIDIA Corp.', price: 118.63 },
  { symbol: 'META', name: 'Meta Platforms', price: 505.21 },
  { symbol: 'TSLA', name: 'Tesla Inc.', price: 248.5 },
  { symbol: 'AVGO', name: 'Broadcom Inc.', price: 165.08 },
  { symbol: 'ORCL', name: 'Oracle Corp.', price: 178.3 },
  { symbol: 'CRM', name: 'Salesforce Inc.', price: 312.4 },
  { symbol: 'ADBE', name: 'Adobe Inc.', price: 512.6 },
  { symbol: 'AMD', name: 'Advanced Micro Devices', price: 168.9 },
  { symbol: 'INTC', name: 'Intel Corp.', price: 31.2 },
  { symbol: 'CSCO', name: 'Cisco Systems', price: 58.4 },
  { symbol: 'QCOM', name: 'Qualcomm Inc.', price: 172.1 },
  { symbol: 'IBM', name: 'IBM Corp.', price: 198.7 },
  { symbol: 'NFLX', name: 'Netflix Inc.', price: 675.3 },
  { symbol: 'UBER', name: 'Uber Technologies', price: 78.9 },
  { symbol: 'SHOP', name: 'Shopify Inc.', price: 82.4 },
  { symbol: 'SQ', name: 'Block Inc.', price: 88.2 },
  { symbol: 'PYPL', name: 'PayPal Holdings', price: 68.5 },
  { symbol: 'SNOW', name: 'Snowflake Inc.', price: 142.3 },
  { symbol: 'PLTR', name: 'Palantir Technologies', price: 28.6 },
  { symbol: 'COIN', name: 'Coinbase Global', price: 224.8 },
  { symbol: 'ABNB', name: 'Airbnb Inc.', price: 148.9 },
  { symbol: 'SPOT', name: 'Spotify Technology', price: 312.5 },
  { symbol: 'DDOG', name: 'Datadog Inc.', price: 118.4 },
  { symbol: 'ZM', name: 'Zoom Video Comm.', price: 68.3 },
  { symbol: 'CRWD', name: 'CrowdStrike Holdings', price: 328.7 },
  { symbol: 'NOW', name: 'ServiceNow Inc.', price: 785.6 },
  { symbol: 'BTC', name: 'Bitcoin', price: 67250.0 },
  { symbol: 'ETH', name: 'Ethereum', price: 3480.5 },
  { symbol: 'SOL', name: 'Solana', price: 152.3 },
  { symbol: 'BNB', name: 'Binance Coin', price: 585.4 },
  { symbol: 'XRP', name: 'Ripple', price: 0.523 },
  { symbol: 'ADA', name: 'Cardano', price: 0.458 },
  { symbol: 'DOGE', name: 'Dogecoin', price: 0.152 },
  { symbol: 'AVAX', name: 'Avalanche', price: 34.6 },
  { symbol: 'DOT', name: 'Polkadot', price: 6.85 },
  { symbol: 'LINK', name: 'Chainlink', price: 14.3 },
  { symbol: 'MATIC', name: 'Polygon', price: 0.682 },
  { symbol: 'LTC', name: 'Litecoin', price: 82.4 },
  { symbol: 'APT', name: 'Aptos', price: 8.4 },
  { symbol: 'UNI', name: 'Uniswap', price: 9.85 },
  { symbol: 'ATOM', name: 'Cosmos', price: 8.2 },
  { symbol: 'XLM', name: 'Stellar', price: 0.118 },
  { symbol: 'TRX', name: 'TRON', price: 0.124 },
  { symbol: 'NEAR', name: 'NEAR Protocol', price: 6.4 },
];

function roundPrice(price: number): number {
  return price >= 1
    ? Math.round(price * 100) / 100
    : Math.round(price * 10_000) / 10_000;
}

/**
 * A high-frequency ticker feed: batches many re-prices per animation frame
 * into ONE state write, so the render layer sees a single patch/frame no
 * matter how high the configured rate is.
 */
export class MarketBloc extends Cubit<MarketState> {
  private rafId: number | null = null;

  constructor() {
    super({
      instruments: SEED.map((s) => ({ ...s, open: s.price, prev: s.price })),
      running: false,
      ratePerSec: 240,
      applied: 0,
    });
    // On dispose only cancel the frame loop — never patch(): the container is
    // already torn down, so emitting state from here throws "Cannot emit state
    // from disposed container".
    this.onSystemEvent('dispose', () => this.cancelLoop());
  }

  start = () => {
    if (this.rafId !== null) return;
    this.patch({ running: true });
    this.rafId = requestAnimationFrame(this.tick);
  };

  private cancelLoop = (): void => {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  };

  stop = () => {
    this.cancelLoop();
    this.patch({ running: false });
  };

  toggle = () => (this.state.running ? this.stop() : this.start());

  setRate = (ratePerSec: number) => this.patch({ ratePerSec });

  private tick = () => {
    const perFrame = Math.max(1, Math.round(this.state.ratePerSec / 60));
    const list = this.state.instruments.slice();
    for (let n = 0; n < perFrame; n++) {
      const k = Math.floor(Math.random() * list.length);
      const cur = list[k];
      const drift = (Math.random() - 0.5) * 0.008 * cur.price;
      const nextPrice = Math.max(0.01, cur.price + drift);
      list[k] = { ...cur, prev: cur.price, price: roundPrice(nextPrice) };
    }
    this.patch({ instruments: list, applied: this.state.applied + perFrame });
    this.rafId = requestAnimationFrame(this.tick);
  };
}
