/**
 * QueryBuffer — Lớp đệm truy vấn (Query Buffer)
 *
 * Hoạt động như một bộ nhớ đệm (buffer) nằm giữa tầng Model và Database.
 * Mục tiêu: giảm số lần round-trip xuống DB bằng cách tái sử dụng kết quả
 * của các query READ trong một khoảng thời gian (TTL).
 *
 * Luồng hoạt động:
 *   Request → buffer.get(key) → HIT  → trả kết quả ngay (không query DB)
 *                             → MISS → query DB → buffer.set(key, data, ttl) → trả kết quả
 *
 * Khi có thao tác WRITE (INSERT/UPDATE/DELETE/CALL SP), gọi buffer.invalidate(prefix)
 * để xóa các entry liên quan, đảm bảo tính nhất quán dữ liệu.
 */

class QueryBuffer {
  constructor() {
    /** @type {Map<string, {value: any, expiresAt: number}>} */
    this._store = new Map();

    // Thống kê
    this._hits   = 0;
    this._misses = 0;
    this._sets   = 0;
    this._invalidations = 0;

    // Tự dọn dẹp các entry hết hạn mỗi 60 giây
    this._cleanupInterval = setInterval(() => this._cleanup(), 60_000);
  }

  // ─── Core API ──────────────────────────────────────────────────────────────

  /**
   * Lấy giá trị từ buffer.
   * @param {string} key
   * @returns {any|null} Dữ liệu nếu còn hạn, null nếu miss hoặc hết hạn
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      this._misses++;
      return null;
    }
    this._hits++;
    return entry.value;
  }

  /**
   * Lưu kết quả vào buffer với TTL (mili-giây).
   * @param {string} key
   * @param {any}    value
   * @param {number} ttlMs  - Thời gian sống (ms), mặc định 30s
   */
  set(key, value, ttlMs = 30_000) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
    this._sets++;
  }

  /**
   * Xóa tất cả các entry có key bắt đầu bằng prefix.
   * Gọi sau khi thực hiện các thao tác WRITE để đảm bảo tính nhất quán.
   * @param {string} prefix
   * @returns {number} Số entry đã xóa
   */
  invalidate(prefix) {
    let count = 0;
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) {
        this._store.delete(key);
        count++;
      }
    }
    if (count > 0) this._invalidations += count;
    return count;
  }

  /**
   * Xóa toàn bộ buffer.
   */
  flush() {
    const count = this._store.size;
    this._store.clear();
    this._invalidations += count;
    return count;
  }

  // ─── Stats & Demo ──────────────────────────────────────────────────────────

  /**
   * Trả về thống kê hiệu quả của buffer.
   */
  stats() {
    const total = this._hits + this._misses;
    return {
      hits          : this._hits,
      misses        : this._misses,
      sets          : this._sets,
      invalidations : this._invalidations,
      hitRate       : total === 0 ? '0.00%' : `${((this._hits / total) * 100).toFixed(2)}%`,
      activeEntries : this._store.size,
    };
  }

  /**
   * Chạy một hàm query 2 lần liên tiếp và đo thời gian để demo hiệu quả buffer.
   * Lần 1: xóa cache → MISS → thực sự query DB
   * Lần 2: lấy từ cache → HIT → không query DB
   *
   * @param {string}   key        - Cache key
   * @param {Function} queryFn    - Async function thực hiện query DB
   * @param {number}   ttlMs      - TTL cho cache
   * @returns {object} Kết quả so sánh thời gian
   */
  async runDemo(key, queryFn, ttlMs = 30_000) {
    // --- Lần 1: MISS (xóa cache trước để đảm bảo) ---
    this.invalidate(key);
    const t1Start = process.hrtime.bigint();
    const data = await queryFn();
    this.set(key, data, ttlMs);
    const t1Ms = Number(process.hrtime.bigint() - t1Start) / 1e6;

    // --- Lần 2: HIT (lấy từ buffer) ---
    const t2Start = process.hrtime.bigint();
    this.get(key);
    const t2Ms = Number(process.hrtime.bigint() - t2Start) / 1e6;

    return {
      label       : key,
      miss: {
        source    : 'Database (round-trip)',
        timeMs    : parseFloat(t1Ms.toFixed(3)),
      },
      hit: {
        source    : 'QueryBuffer (in-memory)',
        timeMs    : parseFloat(t2Ms.toFixed(3)),
      },
      speedup     : t2Ms > 0 ? `${(t1Ms / t2Ms).toFixed(1)}x faster` : '∞x faster',
      rowCount    : Array.isArray(data) ? data.length : 1,
    };
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this._store.entries()) {
      if (now > entry.expiresAt) this._store.delete(key);
    }
  }

  destroy() {
    clearInterval(this._cleanupInterval);
    this._store.clear();
  }
}

// Singleton — dùng chung 1 instance cho toàn app
const buffer = new QueryBuffer();
module.exports = buffer;
