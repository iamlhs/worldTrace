// ============================================================
// 意图数据加载器 — 加载船舶航行意图分析结果
// 从 public/intentions/_bundle.json 加载预打包的数据
// 由于没有直接的 UUID→轨迹ID 映射，按字母排序后均分到100组
// ============================================================

/** 作战意图类型 */
export type IntentType = 1 | 2 | 3 | 4 | 5;

/** 意图标签映射 */
export const INTENT_LABELS: Record<number, string> = {
  1: '🔍 侦察监视',
  2: '🚢 运输转场',
  3: '🛡️ 巡逻预警',
  4: '⚔️ 其他(4)',
  5: '🎯 其他(5)',
};

/** 意图颜色 */
export const INTENT_COLORS: Record<number, string> = {
  1: '#ffaa00',
  2: '#44ccff',
  3: '#ff6644',
  4: '#aaaacc',
  5: '#8888aa',
};

/** 单条意图（压缩格式，来自 bundle JSON） */
interface IntentRaw {
  /** 文件名 */
  f: string;
  /** 意图类型 */
  i: number;
  /** 理由 */
  r: string;
  /** 总结 */
  s: string;
}

/** 单条意图分析结果 */
export interface IntentionEntry {
  file: string;
  intent: IntentType;
  reason: string;
  summary: string;
}

/** 某个轨迹 ID 对应的意图汇总 */
export interface TrajectoryIntentions {
  trajectoryId: number;
  entries: IntentionEntry[];
  distribution: Record<number, number>;
  dominantIntent: IntentType;
}

// ============================================================
// 加载器
// ============================================================

class IntentionsLoader {
  private cache: IntentionEntry[] | null = null;
  private _loading = false;
  private _promise: Promise<IntentionEntry[]> | null = null;

  get loading(): boolean { return this._loading; }

  /** 加载所有意图数据（从预打包的 bundle JSON，单次请求） */
  async loadAll(): Promise<IntentionEntry[]> {
    if (this.cache) return this.cache;
    if (this._promise) return this._promise;

    this._loading = true;
    this._promise = this._doLoad();

    try {
      const result = await this._promise;
      return result;
    } finally {
      this._loading = false;
    }
  }

  private async _doLoad(): Promise<IntentionEntry[]> {
    const resp = await fetch('/intentions/_bundle.json');
    if (!resp.ok) {
      console.warn('⚠️ IntentionsLoader: _bundle.json 不存在');
      this.cache = [];
      return [];
    }

    const rawList: IntentRaw[] = await resp.json();
    const entries: IntentionEntry[] = rawList.map((raw) => ({
      file: raw.f,
      intent: raw.i as IntentType,
      reason: raw.r,
      summary: raw.s,
    }));

    // 按文件名排序缓存
    entries.sort((a, b) => a.file.localeCompare(b.file));
    this.cache = entries;
    console.log(`✅ IntentionsLoader: ${entries.length} 条意图分析`);
    return entries;
  }

  /**
   * 获取某个轨迹的意图汇总
   * 将文件按字母排序后均分到100组，每组对应一个轨迹ID
   */
  getForTrajectory(trajectoryId: number): TrajectoryIntentions | null {
    if (!this.cache || this.cache.length === 0) return null;

    const sorted = this.cache; // 已在加载时排序
    const totalTrajectories = 100;
    const totalFiles = sorted.length;
    const perGroup = Math.floor(totalFiles / totalTrajectories);
    const remainder = totalFiles % totalTrajectories;

    // 计算该轨迹对应的文件范围
    let start = 0;
    for (let i = 0; i < trajectoryId; i++) {
      start += perGroup + (i < remainder ? 1 : 0);
    }
    const count = perGroup + (trajectoryId < remainder ? 1 : 0);
    const entries = sorted.slice(start, start + count);

    // 统计分布
    const distribution: Record<number, number> = {};
    for (const e of entries) {
      distribution[e.intent] = (distribution[e.intent] || 0) + 1;
    }

    // 主导意图
    let dominantIntent: IntentType = 1;
    let maxCount = 0;
    for (const [intent, cnt] of Object.entries(distribution)) {
      if (cnt > maxCount) {
        maxCount = cnt;
        dominantIntent = parseInt(intent) as IntentType;
      }
    }

    return {
      trajectoryId,
      entries,
      distribution,
      dominantIntent,
    };
  }
}

export const intentionsLoader = new IntentionsLoader();
