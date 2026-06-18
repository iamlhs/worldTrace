// ============================================================
// EDAS 数据加载器 — 加载事件数据 + 地理编码
// 从 edas_exports/ 目录加载 events.json 和 ukraine_with_cluid.json
// ============================================================

import type { EdasEvent, EdasDataSource, EdasRegion } from '@/types';

const EDAS_BASE = '/edas_exports';

// ============================================================
// 地理编码表 — 从事件摘要中提取地名 → 坐标映射
// ============================================================

interface GeoEntry { lat: number; lon: number; region: EdasRegion; }

const GEO_DB: Record<string, GeoEntry> = {
  // ── 香港 ──
  'hong kong': { lat: 22.3193, lon: 114.1694, region: 'hongkong' },
  'kowloon': { lat: 22.3167, lon: 114.1833, region: 'hongkong' },
  'mong kok': { lat: 22.3193, lon: 114.1694, region: 'hongkong' },
  'yuen long': { lat: 22.4445, lon: 114.0222, region: 'hongkong' },
  'sheung wan': { lat: 22.2864, lon: 114.1514, region: 'hongkong' },
  'central': { lat: 22.2819, lon: 114.1581, region: 'hongkong' },
  'tsim sha tsui': { lat: 22.2971, lon: 114.1722, region: 'hongkong' },
  'causeway bay': { lat: 22.2807, lon: 114.1840, region: 'hongkong' },
  'admiralty': { lat: 22.2790, lon: 114.1650, region: 'hongkong' },
  'wan chai': { lat: 22.2769, lon: 114.1757, region: 'hongkong' },
  'prince edward': { lat: 22.3246, lon: 114.1689, region: 'hongkong' },
  'sham shui po': { lat: 22.3300, lon: 114.1619, region: 'hongkong' },
  'kwun tong': { lat: 22.3134, lon: 114.2239, region: 'hongkong' },
  'tai po': { lat: 22.4509, lon: 114.1656, region: 'hongkong' },
  'sha tin': { lat: 22.3826, lon: 114.1910, region: 'hongkong' },
  'tuen mun': { lat: 22.3916, lon: 113.9775, region: 'hongkong' },
  'tsuen wan': { lat: 22.3697, lon: 114.1154, region: 'hongkong' },
  'lai chi kok': { lat: 22.3368, lon: 114.1460, region: 'hongkong' },
  'kwai chung': { lat: 22.3630, lon: 114.1280, region: 'hongkong' },
  'cheung sha wan': { lat: 22.3352, lon: 114.1546, region: 'hongkong' },
  'tai kok tsui': { lat: 22.3217, lon: 114.1633, region: 'hongkong' },
  'hung hom': { lat: 22.3051, lon: 114.1845, region: 'hongkong' },
  'north point': { lat: 22.2911, lon: 114.2008, region: 'hongkong' },
  'fortress hill': { lat: 22.2877, lon: 114.1925, region: 'hongkong' },
  'chai wan': { lat: 22.2657, lon: 114.2483, region: 'hongkong' },
  'lam tin': { lat: 22.3079, lon: 114.2350, region: 'hongkong' },
  'airport': { lat: 22.3080, lon: 113.9185, region: 'hongkong' },
  'west kowloon': { lat: 22.3038, lon: 114.1616, region: 'hongkong' },
  'polytechnic university': { lat: 22.3049, lon: 114.1795, region: 'hongkong' },
  'polyu': { lat: 22.3049, lon: 114.1795, region: 'hongkong' },
  'chinese university': { lat: 22.4195, lon: 114.2068, region: 'hongkong' },
  'cuhk': { lat: 22.4195, lon: 114.2068, region: 'hongkong' },
  'city university': { lat: 22.3373, lon: 114.1726, region: 'hongkong' },
  'legislative council': { lat: 22.2810, lon: 114.1657, region: 'hongkong' },
  'legco': { lat: 22.2810, lon: 114.1657, region: 'hongkong' },

  // ── 伊朗 ──
  'tehran': { lat: 35.6892, lon: 51.3890, region: 'iran' },
  'mashhad': { lat: 36.2605, lon: 59.6168, region: 'iran' },
  'isfahan': { lat: 32.6546, lon: 51.6680, region: 'iran' },
  'shiraz': { lat: 29.5926, lon: 52.5836, region: 'iran' },
  'tabriz': { lat: 38.0800, lon: 46.2919, region: 'iran' },
  'karaj': { lat: 35.8327, lon: 50.9915, region: 'iran' },
  'qom': { lat: 34.6416, lon: 50.8746, region: 'iran' },
  'ahvaz': { lat: 31.3183, lon: 48.6706, region: 'iran' },
  'kermanshah': { lat: 34.3142, lon: 47.0650, region: 'iran' },
  'urmia': { lat: 37.5495, lon: 45.0788, region: 'iran' },
  'zahedan': { lat: 29.4965, lon: 60.8629, region: 'iran' },
  'rasht': { lat: 37.2808, lon: 49.5832, region: 'iran' },

  // ── 乌克兰 ──
  'kyiv': { lat: 50.4501, lon: 30.5234, region: 'ukraine' },
  'kiev': { lat: 50.4501, lon: 30.5234, region: 'ukraine' },
  'kharkiv': { lat: 49.9935, lon: 36.2304, region: 'ukraine' },
  'odesa': { lat: 46.4825, lon: 30.7233, region: 'ukraine' },
  'odessa': { lat: 46.4825, lon: 30.7233, region: 'ukraine' },
  'dnipro': { lat: 48.4647, lon: 35.0462, region: 'ukraine' },
  'lviv': { lat: 49.8397, lon: 24.0297, region: 'ukraine' },
  'donetsk': { lat: 48.0159, lon: 37.8028, region: 'ukraine' },
  'zaporizhzhia': { lat: 47.8388, lon: 35.1396, region: 'ukraine' },
  'kherson': { lat: 46.6354, lon: 32.6169, region: 'ukraine' },
  'mykolaiv': { lat: 46.9750, lon: 31.9946, region: 'ukraine' },
  'nikolaev': { lat: 46.9750, lon: 31.9946, region: 'ukraine' },
  'mariupol': { lat: 47.0971, lon: 37.5433, region: 'ukraine' },
  'luhansk': { lat: 48.5740, lon: 39.3078, region: 'ukraine' },
  'poltava': { lat: 49.5883, lon: 34.5514, region: 'ukraine' },
  'chernihiv': { lat: 51.4982, lon: 31.2893, region: 'ukraine' },
  'sumy': { lat: 50.9077, lon: 34.7981, region: 'ukraine' },
  'vinnytsia': { lat: 49.2331, lon: 28.4682, region: 'ukraine' },
  'khmelnytskyi': { lat: 49.4229, lon: 26.9871, region: 'ukraine' },
  'ternopil': { lat: 49.5535, lon: 25.5948, region: 'ukraine' },
  'ivano-frankivsk': { lat: 48.9226, lon: 24.7111, region: 'ukraine' },
  'uzhhorod': { lat: 48.6208, lon: 22.2879, region: 'ukraine' },
  'lutsk': { lat: 50.7593, lon: 25.3424, region: 'ukraine' },
  'rivne': { lat: 50.6199, lon: 26.2516, region: 'ukraine' },
  'zhytomyr': { lat: 50.2547, lon: 28.6587, region: 'ukraine' },
  'kropyvnytskyi': { lat: 48.5079, lon: 32.2623, region: 'ukraine' },
  'cherkasy': { lat: 49.4285, lon: 32.0621, region: 'ukraine' },
  'bakhmut': { lat: 48.5956, lon: 38.0004, region: 'ukraine' },
  'avdiivka': { lat: 48.1398, lon: 37.7425, region: 'ukraine' },
  'avdeyevka': { lat: 48.1398, lon: 37.7425, region: 'ukraine' },
  'avdeevka': { lat: 48.1398, lon: 37.7425, region: 'ukraine' },
  'kakhovka': { lat: 46.8069, lon: 33.4869, region: 'ukraine' },
  'kahkhovka': { lat: 46.8069, lon: 33.4869, region: 'ukraine' },
  'dnieper': { lat: 48.4647, lon: 35.0462, region: 'ukraine' },
  'dnipro river': { lat: 47.5000, lon: 34.0000, region: 'ukraine' },
  'crimea': { lat: 45.3000, lon: 34.3000, region: 'ukraine' },
  'izyum': { lat: 49.1930, lon: 37.2783, region: 'ukraine' },
  'oskol': { lat: 49.3820, lon: 37.8330, region: 'ukraine' },
  'karlovsky': { lat: 48.1100, lon: 37.4900, region: 'ukraine' },
  'karachunovsky': { lat: 47.8500, lon: 33.3000, region: 'ukraine' },
  'vyshgorod': { lat: 50.5833, lon: 30.5000, region: 'ukraine' },
  'nova kakhovka': { lat: 46.7550, lon: 33.3667, region: 'ukraine' },
  'black sea': { lat: 45.5000, lon: 32.5000, region: 'ukraine' },

  // ── 拉脱维亚 ──
  'jēkabpils': { lat: 56.4992, lon: 25.8560, region: 'ukraine' },
  'latvia': { lat: 56.8796, lon: 24.6032, region: 'ukraine' },

  // ── 叙利亚/中东 ──
  'euphrates': { lat: 34.5000, lon: 40.5000, region: 'iran' },
  'syria': { lat: 34.8021, lon: 38.9968, region: 'iran' },
  'israel': { lat: 31.0461, lon: 34.8516, region: 'iran' },
};

/** 区域默认中心坐标 */
const REGION_CENTERS: Record<EdasRegion, { lat: number; lon: number }> = {
  hongkong: { lat: 22.3193, lon: 114.1694 },
  iran: { lat: 32.4279, lon: 53.6880 },
  ukraine: { lat: 48.3794, lon: 31.1656 },
};

/**
 * 从文本中提取地名并返回坐标
 */
function geocodeText(text: string, fallbackRegion: EdasRegion): { lat: number; lon: number; locationName: string } {
  const lower = text.toLowerCase();
  let bestMatch: { lat: number; lon: number; name: string; priority: number } | null = null;

  for (const [name, entry] of Object.entries(GEO_DB)) {
    if (entry.region === fallbackRegion && lower.includes(name)) {
      // 优先选择最长匹配（更精确）
      if (!bestMatch || name.length > bestMatch.name.length) {
        bestMatch = { lat: entry.lat, lon: entry.lon, name, priority: name.length };
      }
    }
  }

  if (bestMatch) {
    return { lat: bestMatch.lat, lon: bestMatch.lon, locationName: bestMatch.name };
  }

  // Fallback to region center
  const center = REGION_CENTERS[fallbackRegion];
  return { lat: center.lat, lon: center.lon, locationName: fallbackRegion };
}

// ============================================================
// EDAS 数据源
// ============================================================

export class EdasDataLoader implements EdasDataSource {
  private eventCache: EdasEvent[] | null = null;

  async loadEvents(): Promise<EdasEvent[]> {
    if (this.eventCache) return this.eventCache;

    const [hkIranEvents, ukraineEvents] = await Promise.all([
      this.loadEventsJson(),
      this.loadUkraineJson(),
    ]);

    this.eventCache = [...hkIranEvents, ...ukraineEvents];
    return this.eventCache;
  }

  async loadEventsByRegion(region: EdasRegion): Promise<EdasEvent[]> {
    const all = await this.loadEvents();
    return all.filter(e => e.region === region);
  }

  private async loadEventsJson(): Promise<EdasEvent[]> {
    try {
      const resp = await fetch(`${EDAS_BASE}/events.json`);
      if (!resp.ok) return [];
      const raw = await resp.json();
      if (!Array.isArray(raw)) return [];

      return raw.map((item: any) => {
        const region: EdasRegion = item.region || 'hongkong';
        const summary: string = item.summary || '';
        const segments: Record<string, number> = item.segments || {};
        const geo = geocodeText(summary, region);

        return {
          id: item.id || `${region}_${item.date_dir || 'unknown'}`,
          region,
          date: item.date_dir || '',
          summary,
          keywords: segments,
          bursty: !!item.bursty,
          lon: geo.lon,
          lat: geo.lat,
          locationName: geo.locationName,
        };
      });
    } catch {
      return [];
    }
  }

  private async loadUkraineJson(): Promise<EdasEvent[]> {
    try {
      const resp = await fetch(`${EDAS_BASE}/ukraine_with_cluid.json`);
      if (!resp.ok) return [];
      const text = await resp.text();
      const lines = text.trim().split('\n').filter(l => l.trim());

      // 按 cluid 分组，每组取第一条代表性事件
      const clusterMap = new Map<number, any>();
      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          const cluid = item.cluid ?? -1;
          if (!clusterMap.has(cluid)) {
            clusterMap.set(cluid, item);
          }
        } catch { /* skip parse errors */ }
      }

      const events: EdasEvent[] = [];
      for (const item of clusterMap.values()) {
        const summary: string = item.origin_text || item.text || '';
        const keywords: string[] = item.keywords || [];
        const level = item.level || '一般事件';
        const geo = geocodeText(summary, 'ukraine');

        // 将 keywords 数组转为 Record
        const kwMap: Record<string, number> = {};
        for (const kw of keywords) {
          kwMap[kw] = (kwMap[kw] || 0) + 1;
        }

        events.push({
          id: `ukraine_${item.id || item.cluid || Math.random().toString(36).slice(2)}`,
          region: 'ukraine',
          date: (item.created_at || '').slice(0, 10),
          summary: summary.slice(0, 200),
          keywords: kwMap,
          bursty: level === '特别重大事件',
          level,
          cluid: item.cluid,
          lon: geo.lon,
          lat: geo.lat,
          locationName: geo.locationName,
        });
      }

      return events;
    } catch {
      return [];
    }
  }

  /** 清除缓存 */
  clearCache(): void { this.eventCache = null; }
}

/** 全局 EDAS 数据加载器实例 */
export const edasDataLoader = new EdasDataLoader();
