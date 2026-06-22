// ============================================================
// EDAS 数据加载器 — 加载事件数据 + 地理编码
// 从 edas_exports/ 目录加载 events.json 和 ukraine_with_cluid.json
// ============================================================

import type { EdasEvent, EdasDataSource, EdasRegion } from '@/types';
import type { EdasEventType } from '@/types';

const EDAS_BASE = '/edas_exports';

// ============================================================
// 事件类型推断 — 以关键词为主，区域仅作微弱先验
// ============================================================

/** 从区域 + 关键词 + 摘要推断事件类型 */
function inferEventType(region: EdasRegion, keywords: Record<string, number>, summary: string = ''): EdasEventType {
  const text = (Object.keys(keywords).join(' ') + ' ' + summary).toLowerCase();

  // ── 抗议/示威类 ──
  const protestKw = [
    'protest', 'demonstration', 'march', 'rally', '示威', '抗议', '游行', '集会', '集會',
    'petition', 'boycott', '罢课', '罢市', '罢工', 'strike', 'riot', '骚乱', '暴乱',
    '民主', 'democracy', '人权', 'human right', '自由', 'freedom', '自治', 'autonomy',
    'activist', '活动人士', '维权', '申诉', ' dissent',
  ];
  // ── 冲突/战争类 ──
  const conflictKw = [
    'attack', 'strike', 'shelling', 'bombing', 'explosion', 'casualty', 'killed',
    '攻击', '袭击', '炮击', '爆炸', '轰炸', 'bomb', '伤亡', '死者', '受伤',
    'missile', '导弹', 'drone', '无人机', '空袭', 'air strike', 'airstrike', 'air raid',
    'battle', '战斗', '交火', 'clash', 'offensive', '攻势', 'counter', '反攻',
    'war', '战争', 'invasion', '入侵', '占领', 'occupy', 'gunfire', '枪击',
    'rocket', '火箭弹', 'mortar', '迫击炮', 'artillery', '炮火', 'sniper', '狙击',
  ];
  // ── 军事活动类 ──
  const militaryKw = [
    'military', '军事', 'troops', '军队', 'deployment', '部署', 'exercise', '演习',
    'drill', 'navy', '海军', 'air force', '空军', 'army', '陆军', 'forces',
    'regiment', 'brigade', 'division', '旅', '师', '团', '基地', 'base',
    'mobilization', '动员', 'defense', '国防', 'weapon', '武器', 'missile system',
    '雷达', 'radar', '舰队', 'fleet', '战机', 'jet', 'fighter', '轰炸机', 'bomber',
    '巡逻', 'patrol', '警戒', 'alert', '战备', '备战',
  ];
  // ── 政治/外交类 ──
  const politicalKw = [
    'sanction', '制裁', 'diplomat', '外交', 'summit', '峰会', 'meeting', '会谈',
    'negotiation', '谈判', 'treaty', '条约', 'agreement', '协议', 'ceasefire', '停火',
    'election', '选举', 'vote', '投票', 'president', '总统', 'minister', '部长',
    'parliament', '议会', 'congress', '国会', 'legislation', '立法', 'resolution', '决议',
    'statement', '声明', 'condemn', '谴责', 'ally', '盟友', 'coalition', '联盟',
  ];
  // ── 灾害/事故类 ──
  const disasterKw = [
    'earthquake', '地震', 'flood', '洪水', 'typhoon', '台风', 'hurricane', '飓风',
    'fire', '火灾', 'explosion accident', '事故', 'crash', '坠毁', '坠机',
    'casualty disaster', '救援', 'rescue', 'evacuation', '疏散', 'emergency', '紧急状态',
  ];

  let protestScore = 0, conflictScore = 0, militaryScore = 0, politicalScore = 0, disasterScore = 0;
  for (const kw of protestKw) { if (text.includes(kw)) protestScore++; }
  for (const kw of conflictKw) { if (text.includes(kw)) conflictScore++; }
  for (const kw of militaryKw) { if (text.includes(kw)) militaryScore++; }
  for (const kw of politicalKw) { if (text.includes(kw)) politicalScore++; }
  for (const kw of disasterKw) { if (text.includes(kw)) disasterScore++; }

  // 加权：冲突类关键词重叠多说明是核心主题
  conflictScore *= 1.5;
  // 抗议类在非冲突语境加权
  if (conflictScore === 0) protestScore *= 1.2;

  // 非常弱的区域先验（仅打破平局，不超过+1）
  if (region === 'hongkong' && protestScore > 0 && conflictScore === 0) protestScore += 0.5;
  if (region === 'ukraine' && conflictScore > 0) conflictScore += 0.5;
  if (region === 'iran' && militaryScore > 0 && conflictScore === 0) militaryScore += 0.5;

  // 如果冲突+军事都高 → 军事活动（演习/部署等非直接交火场景）
  // 如果冲突单独高 → 冲突
  // 如果军事单独高 → 军事活动
  // 如果抗议高且无冲突 → 抗议
  const allScores = [
    { type: '冲突' as EdasEventType, score: conflictScore },
    { type: '军事活动' as EdasEventType, score: militaryScore },
    { type: '抗议' as EdasEventType, score: protestScore },
  ];
  allScores.sort((a, b) => b.score - a.score);

  if (allScores[0].score > 0) return allScores[0].type;
  if (politicalScore > 0) return '其他';  // 政治事件暂归为"其他"
  if (disasterScore > 0) return '其他';   // 灾害事件暂归为"其他"
  return '其他';
}

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
          eventType: inferEventType(region, segments, summary),
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

      // 逐条 geocode + 按 (locationName, date) 聚合
      const groupMap = new Map<string, {
        tweets: string[];
        dates: string[];
        allKeywords: string[];
        levels: string[];
        lat: number;
        lon: number;
        locationName: string;
      }>();

      for (const line of lines) {
        try {
          const item = JSON.parse(line);
          const summary: string = item.origin_text || item.text || '';
          const geo = geocodeText(summary, 'ukraine');
          const date = (item.created_at || '').slice(0, 10);
          const key = `${geo.locationName}|${date}`;

          if (!groupMap.has(key)) {
            groupMap.set(key, {
              tweets: [], dates: [], allKeywords: [], levels: [],
              lat: geo.lat, lon: geo.lon, locationName: geo.locationName,
            });
          }
          const g = groupMap.get(key)!;
          g.tweets.push(summary);
          g.dates.push(date);
          g.allKeywords.push(...(item.keywords || []));
          g.levels.push(item.level || '一般事件');
        } catch { /* skip parse errors */ }
      }

      // 转换为 EdasEvent（每个聚合组一条）
      const events: EdasEvent[] = [];
      for (const [key, g] of groupMap) {
        // 关键词频率统计
        const kwMap: Record<string, number> = {};
        for (const kw of g.allKeywords) {
          kwMap[kw] = (kwMap[kw] || 0) + 1;
        }
        // 按频率排序取 top 20
        const sortedKw = Object.entries(kwMap).sort((a, b) => b[1] - a[1]).slice(0, 20);
        const topKw: Record<string, number> = {};
        for (const [k, v] of sortedKw) topKw[k] = v;

        // 事件等级：取最高频等级
        const levelCounts: Record<string, number> = {};
        for (const lv of g.levels) levelCounts[lv] = (levelCounts[lv] || 0) + 1;
        let dominantLevel = '一般事件';
        let maxLv = 0;
        for (const [lv, c] of Object.entries(levelCounts)) {
          if (c > maxLv) { maxLv = c; dominantLevel = lv; }
        }

        // 摘要：取第一条代表性推文 + 总数
        const tweetCount = g.tweets.length;
        const sampleSummary = (g.tweets[0] || '').slice(0, 150);
        const fullSummary = tweetCount > 1
          ? `[${tweetCount}条推文] ${sampleSummary} ...等`
          : sampleSummary;

        events.push({
          id: `ukraine_${key.replace(/[^a-z0-9]/g, '_')}`,
          region: 'ukraine',
          date: g.dates[0] || '',
          summary: fullSummary,
          keywords: topKw,
          eventType: inferEventType('ukraine', topKw, fullSummary),
          bursty: dominantLevel === '特别重大事件' || tweetCount >= 5,
          level: dominantLevel,
          cluid: tweetCount, // 借 cluid 存推文数量
          lon: g.lon,
          lat: g.lat,
          locationName: g.locationName,
        });
      }

      console.log(`[EDAS] Ukraine: ${lines.length} tweets → ${events.length} events (${groupMap.size} groups)`);
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
