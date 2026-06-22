// ============================================================
// 页面路由 — 顶部导航栏切换
// ============================================================

document.querySelectorAll('#top-nav button[data-page]').forEach(btn => {
  btn.addEventListener('click', () => {
    const page = (btn as HTMLElement).dataset.page!;
    // 切换按钮 active 状态
    document.querySelectorAll('#top-nav button[data-page]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // vessel / event 共享地图，只切换右侧面板
    if (page === 'vessel' || page === 'event') {
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.panel-side').forEach(p => p.classList.remove('active'));
      document.getElementById(`panel-${page}`)!.classList.add('active');
      document.body.classList.remove('has-fullpage');
      // 切换地图中心
      if (page === 'vessel') {
        mapEngine.fitBounds([[-130, 20], [-60, 52]]);   // 北美大陆
      } else {
        mapEngine.fitBounds([[20, 5], [150, 60]]);       // 亚洲（覆盖香港/伊朗/乌克兰）
      }
    } else {
      // finance / video / tcm 占满全屏
      document.querySelectorAll('.panel-side').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById(`page-${page}`)!.classList.add('active');
      document.body.classList.add('has-fullpage');
    }
  });
});

// ============================================================
// 船舶航迹可视化系统 — 主入口
// 包含: 航迹加载、动画控制、搜索定位、信息面板
// ============================================================

import { MapEngine } from '@/map/MapEngine';
import { FlightTrailRenderer } from '@/map/FlightTrails';
import { flightDataLoader } from '@/services/FlightDataLoader';
import { edasDataLoader } from '@/services/EdasDataLoader';
import { intentionsLoader, INTENT_LABELS, INTENT_COLORS } from '@/services/IntentionsLoader';
import type { FlightData, ModelType, EdasEvent, TrajectoryIntentions } from '@/types';

// ---- 状态 ----

let currentModel: ModelType = 'LSTM';
let currentId = 0;
let currentData: FlightData | null = null;
let animSpeed = 3;
let animationFrameId: number | null = null;
let overviewMode = true;
let allStartPoints: Array<{ lat: number; lon: number; id: number; model: ModelType }> = [];

// EDAS 始终开启
let edasEvents: EdasEvent[] = [];

// 意图加载状态
let intentionsReady = false;

// ---- 初始化 ----

const mapEngine = new MapEngine();
const trailRenderer = new FlightTrailRenderer({
  gtColor: [0, 255, 136, 200],
  predColor: [255, 170, 0, 220],
  trailWidth: 3,
  pointRadius: 5,
  showPoints: true,
  showArrows: true,
  showLabels: true,
});

const mapContainer = document.getElementById('map-container');
if (!mapContainer) throw new Error('Map container not found');
mapEngine.init(mapContainer);

// 地图点击 → 侧面板详情
mapEngine.onPointClick = (info) => {
  document.getElementById('panel-detail')!.innerHTML = `
    <div class="detail-title" style="border-left:3px solid ${info.color || '#888'}">${info.title}</div>
    ${info.lines.map(l => `<div class="detail-row"><span>${l.label}</span><span>${l.value}</span></div>`).join('')}
  `;
};

// ---- 动画帧回调 ----
trailRenderer.onFrame = (time: number) => {
  const data = currentData;
  if (!data) return;
  const maxLen = Math.max(data.groundTruth.length, data.prediction.length);
  const idx = Math.min(Math.floor(time), maxLen - 1);
  const progress = maxLen > 1 ? (time / (maxLen - 1)) * 100 : 0;
  document.getElementById('info-points')!.textContent = `⏱ ${time.toFixed(2)}h · #${idx}/${maxLen - 1}`;
  document.getElementById('progress-bar')!.style.width = `${Math.min(progress, 100)}%`;

  // Auto-stop at end
  if (time >= maxLen - 1) {
    stopAnimation();
  }
};

// ---- 加载航迹 ----

async function loadTrajectory(model: ModelType, id: number): Promise<void> {
  stopAnimation();
  trailRenderer.resetTime();
  document.getElementById('progress-bar')!.style.width = '0%';

  currentData = await flightDataLoader.getTrajectory(model, id);
  if (!currentData) {
    document.getElementById('info-points')!.textContent = '❌ 加载失败';
    return;
  }

  rebuildLayers();
  const bounds = FlightTrailRenderer.getBounds(currentData);
  mapEngine.fitBounds(bounds);
  updateInfo(currentData);
}

function rebuildLayers(): void {
  if (!currentData) return;
  mapEngine.hidePopup();
  const layers = trailRenderer.buildLayers(currentData);
  mapEngine.updateLayers(layers);
}

function updateInfo(data: FlightData): void {
  document.getElementById('info-model')!.textContent = data.model;
  document.getElementById('info-id')!.textContent = `#${data.id}`;
  document.getElementById('info-points')!.textContent = `实际: ${data.groundTruth.length} 点 · 预测: ${data.prediction.length} 点`;
  document.getElementById('info-duration')!.textContent =
    `${data.groundTruth[data.groundTruth.length - 1]?.t.toFixed(2) || '?'} h`;

  if (data.rmse) {
    document.getElementById('info-rmse')!.innerHTML =
      `总: ${data.rmse.rmseTotal.toFixed(5)}<br>空间: ${data.rmse.rmseSpatial.toFixed(5)}<br>时间: ${data.rmse.rmseTemporal.toFixed(5)}`;
  } else {
    document.getElementById('info-rmse')!.textContent = '—';
  }

  // Compute total distance
  let totalDist = 0;
  for (let i = 1; i < data.groundTruth.length; i++) {
    const dLat = (data.groundTruth[i].lat - data.groundTruth[i - 1].lat) * Math.PI / 180;
    const dLon = (data.groundTruth[i].lon - data.groundTruth[i - 1].lon) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(data.groundTruth[i-1].lat*Math.PI/180) * Math.cos(data.groundTruth[i].lat*Math.PI/180) * Math.sin(dLon/2)**2;
    totalDist += 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
  document.getElementById('info-distance')!.textContent = `${totalDist.toFixed(2)} km`;
  document.getElementById('panel-detail')!.innerHTML = '<div class="detail-hint">点击航迹点查看详情</div>';
  renderIntentionPanel(data.id);
}

// ---- 意图面板显示（独立于 panel-detail，位置在上方更显眼） ----

function renderIntentionPanel(trajectoryId: number): void {
  const panel = document.getElementById('panel-intentions')!;
  const content = document.getElementById('intent-content')!;

  if (!intentionsReady) {
    // 加载中
    panel.style.display = 'block';
    content.innerHTML = '<div style="color:#8870a8;font-size:11px;padding:4px 0">⏳ 正在加载意图数据...</div>';
    return;
  }

  const intents: TrajectoryIntentions | null = intentionsLoader.getForTrajectory(trajectoryId);
  if (!intents || intents.entries.length === 0) {
    panel.style.display = 'none';
    return;
  }

  const dist = intents.distribution;
  const total = intents.entries.length;
  const dom = intents.dominantIntent;

  // 构建意图分布条
  let barsHtml = '';
  const sorted = Object.entries(dist).sort((a, b) => Number(b[1]) - Number(a[1]));
  for (const [intent, count] of sorted) {
    const iNum = Number(intent);
    const pct = ((count / total) * 100).toFixed(1);
    const label = INTENT_LABELS[iNum] || `意图${intent}`;
    const color = INTENT_COLORS[iNum] || '#8888aa';
    barsHtml += `
      <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
        <span style="width:64px;text-align:right;font-size:10px;color:#c8b8e8;white-space:nowrap;flex-shrink:0">${label}</span>
        <div style="flex:1;height:10px;background:#1a0e2e;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${color};border-radius:4px;box-shadow:0 0 6px ${color}66"></div>
        </div>
        <span style="font-size:11px;color:#c8b8e8;width:38px;text-align:right;flex-shrink:0;font-weight:600">${pct}%</span>
      </div>`;
  }

  const domColor = INTENT_COLORS[dom] || '#8888aa';
  const domLabel = INTENT_LABELS[dom] || String(dom);

  content.innerHTML = `
    <div style="font-size:11px;color:#665577;margin-bottom:8px">
      航迹 #${trajectoryId} · 基于 <b style="color:#a090c0">${total}</b> 条意图分析
    </div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:8px 10px;background:${domColor}15;border:1px solid ${domColor}33;border-radius:6px">
      <span style="font-size:20px">🎯</span>
      <div>
        <div style="font-size:12px;font-weight:700;color:${domColor}">主导意图: ${domLabel}</div>
        <div style="font-size:10px;color:#8870a8">
          ${sorted.slice(0, 3).map(([i, c]) => {
            const l = INTENT_LABELS[Number(i)] || '';
            const p = ((Number(c) / total) * 100).toFixed(0);
            return `${l} ${p}%`;
          }).join(' · ')}
        </div>
      </div>
    </div>
    ${barsHtml}
  `;

  panel.style.display = 'block';
}

// ---- 动画控制 ----

function startAnimation(): void {
  if (!currentData || trailRenderer['animating']) return;
  trailRenderer.startAnimation(animSpeed);
  (document.getElementById('btn-play') as HTMLButtonElement).textContent = '⏸ 暂停';

  const animateLoop = () => {
    if (!trailRenderer['animating']) {
      stopAnimation();
      return;
    }
    rebuildLayers();
    animationFrameId = requestAnimationFrame(animateLoop);
  };
  animationFrameId = requestAnimationFrame(animateLoop);
}

function stopAnimation(): void {
  trailRenderer.stopAnimation();
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  (document.getElementById('btn-play') as HTMLButtonElement).textContent = '▶ 播放';
  if (currentData) {
    const progress = trailRenderer.currentTime / (Math.max(currentData.groundTruth.length, currentData.prediction.length) - 1) * 100;
    if (progress >= 100) {
      document.getElementById('progress-bar')!.style.width = '100%';
      document.getElementById('progress-bar')!.style.background = '#ff4466';
    }
  }
}

// ---- 全局概览 ----

/** 缓存全部轨迹数据，用于概览模式 */
let overviewCache: FlightData[] = [];

async function loadOverview(): Promise<void> {
  stopAnimation();
  trailRenderer.resetTime();
  document.getElementById('progress-bar')!.style.width = '0%';
  document.getElementById('progress-bar')!.style.background = '#8844dd';

  const { PathLayer, ScatterplotLayer, TextLayer } = await import('@deck.gl/layers');

  // 先显示加载状态
  document.getElementById('info-points')!.textContent = `⏳ 加载中...`;
  document.getElementById('panel-detail')!.innerHTML = '<div class="detail-hint">正在加载 100 条航迹数据...</div>';

  // 并行加载全部 100 条航迹
  const ids = Array.from({ length: 100 }, (_, i) => i);
  const results = await Promise.all(ids.map(id => flightDataLoader.getTrajectory(currentModel, id)));
  overviewCache = results.filter((d): d is FlightData => d !== null && d.groundTruth.length > 0);

  // 构建所有 GT 航迹线（每条独立 PathLayer，支持悬浮+点击）
  const trailLayers: any[] = [];
  const startPoints: Array<{ lat: number; lon: number; id: number; model: ModelType; index: number }> = [];

  for (const data of overviewCache) {
    const path = data.groundTruth.map(p => [p.lon, p.lat] as [number, number]);
    const id = data.id;

    // 每条轨迹用半透明细线
    trailLayers.push(new PathLayer({
      id: `overview-trail-${id}`,
      data: [{ path }],
      getPath: (d: any) => d.path,
      getColor: () => [0, 220, 140, 80] as [number, number, number, number],
      widthMinPixels: 1,
      getWidth: () => 1.5,
      pickable: true,
      onClick: (info: any) => {
        currentId = id;
        (document.getElementById('trajectory-slider') as HTMLInputElement).value = String(currentId);
        document.getElementById('trajectory-label')!.textContent = `#${currentId}`;
        document.getElementById('btn-overview')!.textContent = '🌐 全局概览';
        (document.getElementById('btn-overview') as HTMLButtonElement).style.borderColor = '#3a2a5a';
        overviewMode = false;
        void loadTrajectory(currentModel, currentId);
      },
    }));

    // 收集起点
    startPoints.push({
      lat: data.groundTruth[0].lat,
      lon: data.groundTruth[0].lon,
      id,
      model: currentModel,
      index: startPoints.length,
    });
  }

  // 起点标记层 + 标签层
  const markerLayer = new ScatterplotLayer({
    id: 'overview-markers',
    data: startPoints,
    getPosition: (d: any) => [d.lon, d.lat],
    getFillColor: () => [136, 68, 221, 220] as [number, number, number, number],
    getRadius: () => 7,
    radiusMinPixels: 4,
    radiusMaxPixels: 14,
    pickable: true,
    autoHighlight: true,
    onClick: (info: any) => {
      if (info.object) {
        currentId = info.object.id;
        (document.getElementById('trajectory-slider') as HTMLInputElement).value = String(currentId);
        document.getElementById('trajectory-label')!.textContent = `#${currentId}`;
        document.getElementById('btn-overview')!.textContent = '🌐 全局概览';
        (document.getElementById('btn-overview') as HTMLButtonElement).style.borderColor = '#3a2a5a';
        overviewMode = false;
        void loadTrajectory(currentModel, currentId);
      }
    },
  });

  const labelLayer = new TextLayer({
    id: 'overview-labels',
    data: startPoints,
    getPosition: (d: any) => [d.lon, d.lat],
    getText: (d: any) => `#${d.id}`,
    getSize: 8,
    getColor: () => [255, 255, 255, 160] as [number, number, number, number],
    getTextAnchor: 'start',
    getAlignmentBaseline: 'bottom',
    sizeMinPixels: 6,
    sizeMaxPixels: 10,
    pickable: false,
    billboard: true,
    background: true,
    getBackgroundColor: () => [0, 0, 0, 60],
  } as any);

  const layers = [markerLayer, labelLayer, ...trailLayers];
  mapEngine.updateLayers(layers);

  // 自动适配显示全美
  const allLats = overviewCache.flatMap(d => d.groundTruth.map(p => p.lat));
  const allLons = overviewCache.flatMap(d => d.groundTruth.map(p => p.lon));
  const minLat = Math.min(...allLats) - 1;
  const maxLat = Math.max(...allLats) + 1;
  const minLon = Math.min(...allLons) - 1;
  const maxLon = Math.max(...allLons) + 1;
  mapEngine.fitBounds([[minLon, minLat], [maxLon, maxLat]]);

  // 更新面板信息
  document.getElementById('info-model')!.textContent = currentModel;
  document.getElementById('info-id')!.textContent = `🌐 全部 ${overviewCache.length} 条`;
  document.getElementById('info-points')!.textContent = `覆盖全美大陆`;
  document.getElementById('info-duration')!.textContent = '—';
  document.getElementById('info-distance')!.textContent = '—';
  document.getElementById('info-rmse')!.textContent = '点击航迹或圆点查看详情';
  document.getElementById('panel-detail')!.innerHTML = '<div class="detail-hint">点击绿色航迹线或紫色圆点加载对应航迹</div>';
  document.getElementById('panel-intentions')!.style.display = 'none';
}

// ---- EDAS 事件图层 ----

/** 按事件数量生成热力颜色：深红(>100) → 橙红(>30) → 黄橙(>10) → 默认色 */
function getEventHeatColor(count: number, baseColor: [number, number, number, number]): [number, number, number, number] {
  if (count >= 100) return [220, 40, 40, 240];      // 深红
  if (count >= 50)  return [240, 80, 40, 230];      // 红
  if (count >= 30)  return [255, 130, 40, 220];     // 橙红
  if (count >= 10)  return [255, 180, 50, 210];     // 黄橙
  if (count >= 3)   return [200, 140, 60, 200];     // 金
  return baseColor;
}

async function loadEdasEvents(): Promise<void> {
  try {
    if (edasEvents.length === 0) {
      edasEvents = await edasDataLoader.loadEvents();
    }

    const { ScatterplotLayer, TextLayer } = await import('@deck.gl/layers');
    const supercluster = (await import('supercluster')).default;

    // 按区域颜色区分
    const regionColors: Record<string, [number, number, number, number]> = {
      hongkong: [220, 80, 220, 220],  // 品红
      iran: [255, 120, 60, 220],      // 橙红
      ukraine: [80, 180, 255, 220],   // 蓝
    };

    // 事件等级大小
    const levelSizes: Record<string, number> = {
      '特别重大事件': 12,
      '重大事件': 10,
      '较大事件': 8,
      '一般事件': 6,
    };

    // ── 构建 supercluster 索引 ──
    const clusterIndex = new supercluster({
      radius: 50,        // 聚类半径（像素）
      maxZoom: 14,       // 最大缩放级别（超过此级别不聚类）
      minZoom: 0,
    });

    const geojsonFeatures: any[] = edasEvents.map((e, i) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [e.lon, e.lat] },
      properties: { ...e, index: i, cluster: false },
    }));

    clusterIndex.load(geojsonFeatures);

    // ── 双层渲染：聚类圆 + 单点 ──
    function getClusters(zoom: number): { clusterPoints: any[]; singlePoints: any[] } {
      const map = mapEngine.maplibreMap;
      if (!map) return { clusterPoints: [], singlePoints: [] };

      const bounds = map.getBounds();
      const bbox: [number, number, number, number] = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];

      const clusters = clusterIndex.getClusters(bbox, Math.floor(zoom));

      const clusterPoints: any[] = [];
      const singlePoints: any[] = [];

      for (const c of clusters) {
        const props = c.properties;
        if (props.cluster) {
          // 聚类圆
          const count = props.point_count || 1;
          const leaves = clusterIndex.getLeaves(props.cluster_id, Infinity, 0);
          // 取聚类内主导区域
          const regionCounts: Record<string, number> = {};
          let totalTweetCount = 0;
          for (const leaf of leaves) {
            const r = (leaf.properties as any).region || 'ukraine';
            regionCounts[r] = (regionCounts[r] || 0) + 1;
            totalTweetCount += (leaf.properties as any).cluid || 0;
          }
          let dominantRegion = 'ukraine';
          let maxCount = 0;
          for (const [r, c] of Object.entries(regionCounts)) {
            if (c > maxCount) { maxCount = c; dominantRegion = r; }
          }
          // 热力颜色：按 count 从深红→橙→黄
          const baseColor = regionColors[dominantRegion] || [136, 68, 221, 200];
          const heatColor = getEventHeatColor(count, baseColor);

          // 统计聚类内主要位置
          const locCounts: Record<string, number> = {};
          for (const leaf of leaves) {
            const loc = (leaf.properties as any).locationName || (leaf.properties as any).region || 'unknown';
            locCounts[loc] = (locCounts[loc] || 0) + 1;
          }
          let topLoc = dominantRegion;
          let topLocCount = 0;
          for (const [loc, c] of Object.entries(locCounts)) {
            if (c > topLocCount) { topLocCount = c; topLoc = loc; }
          }

          clusterPoints.push({
            position: (c.geometry as any).coordinates,
            count,
            totalTweetCount,
            clusterId: props.cluster_id,
            color: heatColor,
            glowColor: [...heatColor.slice(0, 3), 60] as [number,number,number,number],
            radius: Math.min(14 + Math.sqrt(count) * 3.5, 50),
            dominantRegion,
            topLocation: topLoc,
          });
        } else {
          // 单个事件点
          const e = props as any;
          singlePoints.push({
            position: (c.geometry as any).coordinates,
            event: e,
            color: regionColors[e.region] || [136, 68, 221, 200],
            radius: levelSizes[e.level || '一般事件'] || 6,
          });
        }
      }

      return { clusterPoints, singlePoints };
    }

    // 初始聚类
    const zoom = mapEngine.maplibreMap?.getZoom() || 4;
    let { clusterPoints, singlePoints } = getClusters(zoom);

    // ── 聚类图层 ──
    const clusterLayer = new ScatterplotLayer({
      id: 'edas-clusters',
      data: clusterPoints,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => d.color,
      getRadius: (d: any) => d.radius,
      radiusMinPixels: 14,
      radiusMaxPixels: 45,
      pickable: true,
      autoHighlight: true,
      onClick: (info: any) => {
        if (info.object?.clusterId != null) {
          const leaves = clusterIndex.getLeaves(info.object.clusterId, Infinity, 0);
          showEdasEventListPanel(leaves, info.object.count || leaves.length);
        }
      },
    });

    // ── 聚类光晕层（Glow Ring）──
    const clusterGlowLayer = new ScatterplotLayer({
      id: 'edas-clusters-glow',
      data: clusterPoints,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => d.glowColor,
      getRadius: (d: any) => d.radius * 1.6,
      radiusMinPixels: 22,
      radiusMaxPixels: 70,
      pickable: false,
      opacity: 0.35,
    });

    // 聚类计数标签
    const clusterLabelLayer = new TextLayer({
      id: 'edas-cluster-labels',
      data: clusterPoints,
      getPosition: (d: any) => d.position,
      getText: (d: any) => String(d.count),
      getSize: 14,
      getColor: () => [255, 255, 255, 255] as [number, number, number, number],
      getTextAnchor: 'middle',
      getAlignmentBaseline: 'center',
      sizeMinPixels: 10,
      sizeMaxPixels: 20,
      pickable: false,
      fontWeight: 'bold',
    } as any);

    // ── 单点图层 ──
    const edasScatter = new ScatterplotLayer({
      id: 'edas-events',
      data: singlePoints,
      getPosition: (d: any) => d.position,
      getFillColor: (d: any) => d.color,
      getRadius: (d: any) => d.radius,
      radiusMinPixels: 4,
      radiusMaxPixels: 16,
      pickable: true,
      autoHighlight: true,
      onClick: (info: any) => {
        if (info.object?.event) showEdasAnalysisPanel(info.object.event as EdasEvent);
      },
    });

    // ── 事件标签（仅显示非聚类模式下的突发/重大事件）─
    const labelData = singlePoints.filter((p: any) => p.event?.bursty || p.event?.level === '特别重大事件');
    const edasLabels = new TextLayer({
      id: 'edas-labels',
      data: labelData,
      getPosition: (d: any) => d.position,
      getText: (d: any) => {
        const regionEmoji: Record<string, string> = { hongkong: '🇭🇰', iran: '🇮🇷', ukraine: '🇺🇦' };
        return `${regionEmoji[String(d.event?.region)] || ''} ${d.event?.locationName || d.event?.region || ''}`;
      },
      getSize: 9,
      getColor: () => [255, 255, 255, 200] as [number, number, number, number],
      getTextAnchor: 'start',
      getAlignmentBaseline: 'bottom',
      sizeMinPixels: 7,
      sizeMaxPixels: 12,
      pickable: false,
      billboard: true,
      background: true,
      backgroundColor: [0, 0, 0, 100],
    } as any);

    // ── EDAS 图层叠加在现有轨迹图层之上 ──
    let removeOverlay = mapEngine.addOverlayLayers([clusterGlowLayer, clusterLayer, clusterLabelLayer, edasScatter, edasLabels]);
    (mapEngine as any).__removeEdasOverlay = removeOverlay;

    // 注册 EDAS 点击回调（MapEngine click → pickObject → onEdasClick）
    mapEngine.onEdasClick = (d: any, layerId: string) => {
      // 聚类圆 → 打开事件列表面板
      if (layerId === 'edas-clusters' && d.clusterId != null) {
        const leaves = clusterIndex.getLeaves(d.clusterId, Infinity, 0);
        showEdasEventListPanel(leaves, d.count || leaves.length);
        return;
      }

      // 单点事件 → 打开深度分析面板
      if (layerId === 'edas-events' && d.event) {
        showEdasAnalysisPanel(d.event as EdasEvent);
        return;
      }
    };

    // ── 缩放时重建聚类图层 ──
    const rebuildEdasLayers = () => {
      const z = mapEngine.maplibreMap?.getZoom() || 4;
      const { clusterPoints: cp, singlePoints: sp } = getClusters(z);

      const newClusterLayer = new ScatterplotLayer({
        id: 'edas-clusters', data: cp,
        getPosition: (d: any) => d.position,
        getFillColor: (d: any) => d.color,
        getRadius: (d: any) => d.radius,
        radiusMinPixels: 14, radiusMaxPixels: 50,
        pickable: true, autoHighlight: true,
        onClick: (info: any) => {
          if (info.object?.clusterId != null) {
            const leaves = clusterIndex.getLeaves(info.object.clusterId, Infinity, 0);
            showEdasEventListPanel(leaves, info.object.count || leaves.length);
          }
        },
      });

      const newGlowLayer = new ScatterplotLayer({
        id: 'edas-clusters-glow', data: cp,
        getPosition: (d: any) => d.position,
        getFillColor: (d: any) => d.glowColor || [...(d.color || [136,68,221,200]).slice(0,3), 60] as [number,number,number,number],
        getRadius: (d: any) => (d.radius || 20) * 1.6,
        radiusMinPixels: 22, radiusMaxPixels: 70,
        pickable: false, opacity: 0.35,
      });

      const newClusterLabels = new TextLayer({
        id: 'edas-cluster-labels', data: cp,
        getPosition: (d: any) => d.position,
        getText: (d: any) => String(d.count),
        getSize: 14, getColor: () => [255, 255, 255, 255] as [number, number, number, number],
        getTextAnchor: 'middle', getAlignmentBaseline: 'center',
        sizeMinPixels: 10, sizeMaxPixels: 20, pickable: false, fontWeight: 'bold',
      } as any);

      const newScatter = new ScatterplotLayer({
        id: 'edas-events', data: sp,
        getPosition: (d: any) => d.position,
        getFillColor: (d: any) => d.color,
        getRadius: (d: any) => d.radius,
        radiusMinPixels: 4, radiusMaxPixels: 16,
        pickable: true, autoHighlight: true,
        onClick: (info: any) => {
          if (info.object?.event) showEdasAnalysisPanel(info.object.event as EdasEvent);
        },
      });

      const newLabelData = sp.filter((p: any) => p.event?.bursty || p.event?.level === '特别重大事件');
      const newLabels = new TextLayer({
        id: 'edas-labels', data: newLabelData,
        getPosition: (d: any) => d.position,
        getText: (d: any) => {
          const emoji: Record<string, string> = { hongkong: '🇭🇰', iran: '🇮🇷', ukraine: '🇺🇦' };
          return `${emoji[String(d.event?.region)] || ''} ${d.event?.locationName || d.event?.region || ''}`;
        },
        getSize: 9, getColor: () => [255, 255, 255, 200] as [number, number, number, number],
        getTextAnchor: 'start', getAlignmentBaseline: 'bottom',
        sizeMinPixels: 7, sizeMaxPixels: 12, pickable: false,
        billboard: true, background: true, backgroundColor: [0, 0, 0, 100],
      } as any);

      // 叠加模式：先移除旧 EDAS 层，再添加新层
      if ((mapEngine as any).__removeEdasOverlay) {
        (mapEngine as any).__removeEdasOverlay();
      }
      const newRemove = mapEngine.addOverlayLayers([newGlowLayer, newClusterLayer, newClusterLabels, newScatter, newLabels]);
      (mapEngine as any).__removeEdasOverlay = newRemove;
    };

    mapEngine.maplibreMap?.on('zoom', rebuildEdasLayers);
    mapEngine.maplibreMap?.on('moveend', rebuildEdasLayers);
    (mapEngine as any).__edasCleanup = () => {
      mapEngine.maplibreMap?.off('zoom', rebuildEdasLayers);
      mapEngine.maplibreMap?.off('moveend', rebuildEdasLayers);
    };

    // 缩放到全局视图
    const allLats = edasEvents.map(e => e.lat);
    const allLons = edasEvents.map(e => e.lon);
    const minLat = Math.min(...allLats) - 3;
    const maxLat = Math.max(...allLats) + 3;
    const minLon = Math.min(...allLons) - 3;
    const maxLon = Math.max(...allLons) + 3;
    mapEngine.fitBounds([[minLon, minLat], [maxLon, maxLat]]);

    console.log(`[EDAS] loaded ${edasEvents.length} events`);

    // 更新右侧面板 EDAS 概况
    const hk = edasEvents.filter(e => e.region === 'hongkong');
    const ir = edasEvents.filter(e => e.region === 'iran');
    const ua = edasEvents.filter(e => e.region === 'ukraine');
    const uaTweets = ua.reduce((s, e) => s + (e.cluid || 0), 0);
    const summaryEl = document.getElementById('panel-edas-summary');
    const contentEl = document.getElementById('edas-summary-content');
    if (summaryEl && contentEl) {
      summaryEl.style.display = 'block';
      contentEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;margin:2px 0"><span>🇭🇰 香港</span><span style="color:#dc50dc">${hk.length} 事件</span></div>
        <div style="display:flex;justify-content:space-between;margin:2px 0"><span>🇮🇷 伊朗</span><span style="color:#ff783c">${ir.length} 事件</span></div>
        <div style="display:flex;justify-content:space-between;margin:2px 0"><span>🇺🇦 乌克兰</span><span style="color:#50b4ff">${ua.length} 事件 · ${uaTweets} 推文</span></div>
        <div style="border-top:1px solid #2a1a44;margin-top:4px;padding-top:4px;display:flex;justify-content:space-between"><span>🌍 总计</span><span style="color:#cc66ff">${edasEvents.length} 聚合事件</span></div>
      `;
    }
  } catch (err) {
    console.error('EDAS load error:', err);
  }
}

function showEdasPopup(event: EdasEvent): void {
  try {
    if (!event || typeof event.lon !== 'number' || typeof event.lat !== 'number') {
      console.warn('EDAS popup: invalid event coordinates', event);
      return;
    }

  const regionLabels: Record<string, string> = {
    hongkong: '🇭🇰 香港',
    iran: '🇮🇷 伊朗',
    ukraine: '🇺🇦 乌克兰',
  };

  const regionColor: Record<string, string> = {
    hongkong: '#dc50dc',
    iran: '#ff783c',
    ukraine: '#50b4ff',
  };

  const color = regionColor[event.region] || '#8844dd';
  const regionLabel = regionLabels[event.region] || event.region;

  let html = `<div class="map-popup-close">✕</div>`;
  html += `<div class="popup-title" style="border-left:3px solid ${color};padding:6px 10px">🟣 EDAS 事件</div>`;
  html += `<div class="popup-body">`;
  html += `<div class="popup-row"><span class="popup-label">区域</span><span>${regionLabel}</span></div>`;
  html += `<div class="popup-row"><span class="popup-label">日期</span><span>${event.date}</span></div>`;
  html += `<div class="popup-row"><span class="popup-label">位置</span><span>${event.locationName || '—'}</span></div>`;
  if (event.level) html += `<div class="popup-row"><span class="popup-label">等级</span><span>${event.level}</span></div>`;
  html += `<div class="popup-row"><span class="popup-label">突发</span><span>${event.bursty ? '⚡ 是' : '否'}</span></div>`;
  html += `<div class="popup-row" style="flex-direction:column;gap:4px"><span class="popup-label">摘要</span><span style="font-size:11px;line-height:1.5">${event.summary.slice(0, 180)}</span></div>`;

  // 关键词
  const topKw = Object.entries(event.keywords).sort((a, b) => b[1] - a[1]).slice(0, 6);
  if (topKw.length > 0) {
    html += `<div class="popup-row" style="flex-direction:column;gap:4px"><span class="popup-label">关键词</span>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:3px">`;
    for (const [kw, w] of topKw) {
      html += `<span style="background:${color}22;border:1px solid ${color}44;border-radius:3px;padding:1px 6px;font-size:10px;color:${color}">${kw}</span>`;
    }
    html += `</div></div>`;
  }

  // 「🔍 深度分析」按钮
  html += `<div style="text-align:center;padding:8px 0 2px;border-top:1px solid #2a1a44;margin-top:6px">
    <button class="btn-edas-deep" style="
      background:${color}22;color:${color};border:1px solid ${color}44;
      padding:6px 18px;border-radius:6px;font-size:12px;cursor:pointer;
      font-weight:600;transition:all 0.15s;width:100%;
    " data-event-id="${event.id}">
      🔍 深度分析
    </button>
  </div>`;

  html += `</div>`;

  // 使用 MapEngine 的弹出层（正确定位在地图坐标上）
  mapEngine.showCustomPopup(html, event.lon, event.lat);

  // 绑定「深度分析」按钮点击
  setTimeout(() => {
    const btn = document.querySelector('.btn-edas-deep') as HTMLButtonElement | null;
    if (btn) {
      btn.addEventListener('click', () => {
        // TODO: 打开 EDAS 深度分析面板（后续实现）
        showEdasAnalysisPanel(event);
      });
    }
  }, 50);

  // 侧边栏
  document.getElementById('panel-detail')!.innerHTML = `
    <div class="detail-title" style="border-left:3px solid ${color}">🟣 EDAS · ${regionLabel}</div>
    <div class="detail-row"><span>日期</span><span>${event.date}</span></div>
    <div class="detail-row"><span>位置</span><span>${event.locationName || event.region}</span></div>
    ${event.level ? `<div class="detail-row"><span>等级</span><span>${event.level}</span></div>` : ''}
    <div class="detail-row"><span>突发</span><span>${event.bursty ? '⚡' : '—'}</span></div>
    <div style="font-size:10px;color:#b8a8d0;margin-top:4px;line-height:1.4">${event.summary.slice(0, 250)}</div>
  `;
  } catch (err) {
    console.error('showEdasPopup error:', err);
  }
}

/** EDAS 事件列表面板（点击聚类圆打开） */
function showEdasEventListPanel(leaves: any[], totalCount: number): void {
  mapEngine.hidePopup();

  // 从 supercluster leaves 提取 EdasEvent
  const events: EdasEvent[] = leaves
    .map((l: any) => l.properties as EdasEvent)
    .filter(e => e && e.id)
    .sort((a, b) => (b.date || '').localeCompare(a.date || '')); // 按日期倒序

  const regionLabels: Record<string, string> = { hongkong: '🇭🇰 香港', iran: '🇮🇷 伊朗', ukraine: '🇺🇦 乌克兰' };
  const regionColor: Record<string, string> = { hongkong: '#dc50dc', iran: '#ff783c', ukraine: '#50b4ff' };

  let overlay = document.getElementById('edas-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'edas-overlay';
    overlay.innerHTML = `
      <div class="edas-overlay-bg"></div>
      <div class="edas-overlay-panel">
        <div class="edas-overlay-header">
          <span id="edas-overlay-title"></span>
          <button id="edas-overlay-close" style="background:none;border:none;color:#8870a8;font-size:20px;cursor:pointer;line-height:1">✕</button>
        </div>
        <div class="edas-overlay-body" id="edas-overlay-body"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#edas-overlay-close')?.addEventListener('click', () => overlay!.classList.remove('active'));
    overlay.querySelector('.edas-overlay-bg')?.addEventListener('click', () => overlay!.classList.remove('active'));
  }

  (overlay.querySelector('#edas-overlay-title') as HTMLElement).innerHTML =
    `🟣 EDAS 事件列表 · <span style="color:#cc66ff">${events.length} / ${totalCount} 条</span>` +
    (leaves[0]?.properties?.cluid ? ` · <span style="color:#ffaa44;font-size:11px">📊 ${leaves.reduce((s: number, l: any) => s + (l.properties.cluid || 0), 0)} 条原始推文</span>` : '');

  let rows = '';
  // 类型标签辅助
  const typeBadge = (e: EdasEvent) => {
    const tc: Record<string, string> = { '抗议':'#ffaa44', '冲突':'#ff4444', '军事活动':'#ff6633', '其他':'#8888aa' };
    const color = tc[e.eventType] || '#8888aa';
    return `<span style="font-size:9px;padding:0 5px;border-radius:3px;background:${color}22;color:${color};border:1px solid ${color}44;flex-shrink:0">${e.eventType}</span>`;
  };
  for (const e of events) {
    const color = regionColor[e.region] || '#8844dd';
    const flag = regionLabels[e.region] || e.region;
    const summary = (e.summary || '').slice(0, 100);
    const date = e.date || '?';
    rows += `
      <div class="edas-list-item" data-event-id="${e.id}" style="
        padding:10px 12px;border-bottom:1px solid #1a0e2e;cursor:pointer;
        transition:background 0.12s;display:flex;gap:8px;align-items:flex-start;
      " onmouseover="this.style.background='#1a0e2e'" onmouseout="this.style.background=''">
        <span style="font-size:14px;flex-shrink:0">${flag}</span>
        ${typeBadge(e)}
        <div style="flex:1;min-width:0">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:6px">
            <span style="font-size:11px;color:#8870a8">${date}</span>
            <span style="display:flex;gap:3px;flex-shrink:0">
              ${e.bursty ? '<span style="font-size:10px;color:#ffaa00">⚡突发</span>' : ''}
              ${e.level ? `<span style="font-size:10px;color:#aab">${e.level}</span>` : ''}
            </span>
          </div>
          <div style="font-size:11px;color:#c0b0d8;line-height:1.4;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${summary}</div>
        </div>
      </div>`;
  }

  (overlay.querySelector('#edas-overlay-body') as HTMLElement).innerHTML = rows;
  overlay.classList.add('active');

  // 点击行 → 深度分析
  overlay.querySelectorAll('.edas-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = (item as HTMLElement).dataset.eventId;
      const ev = events.find(e => e.id === id);
      if (ev) showEdasAnalysisPanel(ev);
    });
  });

  // ESC 关闭
  const escHandler = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') { overlay!.classList.remove('active'); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);
  overlay.querySelector('#edas-overlay-close')?.addEventListener('click', () => document.removeEventListener('keydown', escHandler), { once: true });
}
function showEdasAnalysisPanel(event: EdasEvent): void {
  mapEngine.hidePopup();

  const regionLabels: Record<string, string> = {
    hongkong: '🇭🇰 香港', iran: '🇮🇷 伊朗', ukraine: '🇺🇦 乌克兰',
  };
  const color = { hongkong: '#dc50dc', iran: '#ff783c', ukraine: '#50b4ff' }[event.region] || '#8844dd';

  // 创建/复用 Overlay 面板
  let overlay = document.getElementById('edas-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'edas-overlay';
    overlay.innerHTML = `
      <div class="edas-overlay-bg"></div>
      <div class="edas-overlay-panel">
        <div class="edas-overlay-header">
          <span id="edas-overlay-title"></span>
          <button id="edas-overlay-close" style="background:none;border:none;color:#8870a8;font-size:20px;cursor:pointer;line-height:1">✕</button>
        </div>
        <div class="edas-overlay-body" id="edas-overlay-body"></div>
      </div>`;
    document.body.appendChild(overlay);

    overlay.querySelector('#edas-overlay-close')?.addEventListener('click', () => {
      overlay!.classList.remove('active');
    });
    overlay.querySelector('.edas-overlay-bg')?.addEventListener('click', () => {
      overlay!.classList.remove('active');
    });
  }

  const regionLabel = regionLabels[event.region] || event.region;
  const escHandler = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') { overlay!.classList.remove('active'); document.removeEventListener('keydown', escHandler); }
  };
  document.addEventListener('keydown', escHandler);

  // 标题 + 选项卡
  (overlay.querySelector('#edas-overlay-title') as HTMLElement).innerHTML = `
    <span style="color:${color}">🟣 EDAS</span> · ${regionLabel} · ${event.date}
    <span style="display:flex;gap:6px;margin-left:auto">
      <button class="edas-tab-btn active" data-tab="analysis" style="font-size:11px;padding:4px 10px;border-radius:4px;border:1px solid ${color}44;background:${color}22;color:${color};cursor:pointer">📊 分析</button>
      <button class="edas-tab-btn" data-tab="kg" style="font-size:11px;padding:4px 10px;border-radius:4px;border:1px solid #3a2a5a;background:transparent;color:#8870a8;cursor:pointer">🔗 知识图谱</button>
      <button class="edas-tab-btn" data-tab="causal" style="font-size:11px;padding:4px 10px;border-radius:4px;border:1px solid #3a2a5a;background:transparent;color:#8870a8;cursor:pointer">⛓️ 因果链</button>
    </span>`;

  // 关键词数据
  const topKw = Object.entries(event.keywords).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 12);
  const maxW = topKw.length > 0 ? Number(topKw[0][1]) : 1;

  let kwBars = '';
  for (const [kw, w] of topKw) {
    const wn = Number(w) || 0;
    const pct = (wn / Number(maxW) * 100).toFixed(0);
    kwBars += `<div style="display:flex;align-items:center;gap:6px;margin:2px 0">
      <span style="width:80px;text-align:right;font-size:11px;color:#b8a8d0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${kw}">${kw}</span>
      <div style="flex:1;height:12px;background:#1a0e2e;border-radius:3px;overflow:hidden">
        <div style="height:100%;width:${pct}%;background:${color};border-radius:3px;opacity:0.8"></div>
      </div>
      <span style="font-size:10px;color:#8870a8;width:40px">${wn.toFixed(1)}</span>
    </div>`;
  }

  // 事件类型标签
  const typeConfig: Record<string, { label: string; icon: string; tagColor: string }> = {
    '抗议': { label: '抗议', icon: '✊', tagColor: '#ffaa44' },
    '冲突': { label: '冲突', icon: '💥', tagColor: '#ff4444' },
    '军事活动': { label: '军事活动', icon: '🎖️', tagColor: '#ff6633' },
    '其他': { label: '其他', icon: '📌', tagColor: '#8888aa' },
  };
  const tc = typeConfig[event.eventType] || typeConfig['其他'];
  const levelLabel = event.level || '一般事件';
  const levelColor = event.level === '特别重大事件' ? '#ff3333'
    : event.level === '重大事件' ? '#ff6633'
    : event.level === '较大事件' ? '#ffaa44'
    : '#88aa88';

  const analysisHtml = `
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;padding:10px 12px;background:${color}08;border:1px solid ${color}22;border-radius:6px">
      <span style="font-size:20px">${tc.icon}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:${tc.tagColor};margin-bottom:4px">${tc.label}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <span style="font-size:10px;padding:1px 8px;border-radius:3px;background:${levelColor}22;color:${levelColor};border:1px solid ${levelColor}44;font-weight:600">📶 ${levelLabel}</span>
          <span style="font-size:10px;padding:1px 8px;border-radius:3px;background:${event.bursty ? '#ff444422' : '#88888822'};color:${event.bursty ? '#ff6644' : '#8888aa'};border:1px solid ${event.bursty ? '#ff444444' : '#88888844'}">⚡ ${event.bursty ? '突发' : '非突发'}</span>
          <span style="font-size:10px;padding:1px 8px;border-radius:3px;background:#88888815;color:#8870a8;border:1px solid #88888833">📍 ${event.locationName || event.region}</span>
        </div>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <div style="font-weight:600;color:#d8aaff;margin-bottom:4px">📝 事件摘要</div>
      <div style="font-size:12px;line-height:1.7;color:#c0b0d8">${event.summary}</div>
    </div>
    <div style="margin-bottom:12px">
      <div style="font-weight:600;color:#d8aaff;margin-bottom:4px">📊 关键词权重 (Top ${topKw.length})</div>
      ${kwBars}
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:12px">
      <div style="font-weight:600;color:#d8aaff;width:100%;margin-bottom:4px">🏷️ 词云</div>
      ${topKw.map(([kw, w]) => {
        const wn = Number(w) || 0, mx = Number(maxW) || 1;
        const size = 12 + (wn / mx) * 18;
        return `<span style="font-size:${size.toFixed(0)}px;color:${color};opacity:${(0.4 + (wn/mx)*0.6).toFixed(1)};padding:2px 4px">${kw}</span>`;
      }).join(' ')}
    </div>`;

  function renderTab(tab: string) {
    const body = overlay!.querySelector('#edas-overlay-body') as HTMLElement;
    overlay!.querySelectorAll('.edas-tab-btn').forEach(b => {
      const isActive = (b as HTMLElement).dataset.tab === tab;
      (b as HTMLElement).classList.toggle('active', isActive);
      (b as HTMLElement).style.background = isActive ? `${color}22` : 'transparent';
      (b as HTMLElement).style.color = isActive ? color : '#8870a8';
      (b as HTMLElement).style.borderColor = isActive ? `${color}44` : '#3a2a5a';
    });
    if (tab === 'analysis') body.innerHTML = analysisHtml;
    else if (tab === 'kg') {
      const t0 = performance.now();
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#8870a8">⏳ 加载知识图谱...</div>';
      body.dataset.renderStart = String(t0);
      renderKnowledgeGraph(color);
    }
    else if (tab === 'causal') {
      const t0 = performance.now();
      body.innerHTML = '<div style="text-align:center;padding:40px;color:#8870a8">⏳ 计算因果链...</div>';
      body.dataset.renderStart = String(t0);
      renderCausalChain(event, color);
    }
  }

  (overlay.querySelector('#edas-overlay-body') as HTMLElement).innerHTML = analysisHtml;

  // 选项卡切换
  overlay.querySelectorAll('.edas-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => renderTab((btn as HTMLElement).dataset.tab || 'analysis'));
  });

  overlay.querySelector('#edas-overlay-close')?.addEventListener('click', () => { document.removeEventListener('keydown', escHandler); }, { once: true });

  overlay.classList.add('active');
}

// ============================================================
// 加载意图数据
// ============================================================

async function loadIntentions(): Promise<void> {
  try {
    console.log('⏳ 加载意图数据...');
    const entries = await intentionsLoader.loadAll();
    if (entries.length > 0) {
      intentionsReady = true;
      console.log(`✅ 意图数据加载完成: ${entries.length} 条`);
      // 刷新当前轨迹的意图面板
      if (currentData) {
        renderIntentionPanel(currentData.id);
      } else {
        // 隐藏加载提示
        document.getElementById('panel-intentions')!.style.display = 'none';
      }
    } else {
      console.warn('⚠️ 意图数据为空');
      document.getElementById('panel-intentions')!.style.display = 'none';
    }
  } catch (err) {
    console.error('❌ 意图数据加载失败:', err);
    document.getElementById('panel-intentions')!.style.display = 'none';
  }
}

// ============================================================
// 知识图谱渲染（d3-force 力导向图）
// ============================================================

async function renderKnowledgeGraph(accentColor: string): Promise<void> {
  const body = document.querySelector('#edas-overlay-body') as HTMLElement;
  if (!body) return;

  const chainFiles = [
    { name: '政治人物链 (Trump→Pence)', file: 'chain1.json' },
    { name: '政治人物链 (Obama→Biden)', file: 'chain_kg_1.json' },
    { name: '卫星任务链 (NOAA)', file: 'chain_kg.json' },
  ];

  // 文件选择器
  let fileSelectHtml = '<div style="margin-bottom:12px;display:flex;gap:6px;flex-wrap:wrap">';
  for (const f of chainFiles) {
    fileSelectHtml += `<button class="kg-file-btn" data-file="${f.file}" style="font-size:11px;padding:5px 10px;border-radius:4px;border:1px solid #3a2a5a;background:transparent;color:#b8a8d0;cursor:pointer">${f.name}</button>`;
  }
  fileSelectHtml += '</div><div id="kg-graph-container" style="width:100%;height:340px;background:#08030f;border-radius:6px;border:1px solid #2a1a44;position:relative;overflow:hidden">'
    + '<div style="position:absolute;top:6px;right:8px;z-index:1"><button id="kg-toggle-labels" style="font-size:10px;padding:3px 8px;border-radius:3px;border:1px solid #3a2a5a;background:#1a0e2e;color:#aab;cursor:pointer">🏷️ 标签</button></div>'
    + '<svg id="kg-svg" width="100%" height="100%"></svg></div>';

  body.innerHTML = fileSelectHtml;

  const d3 = await import('d3');

  let showLabels = true;
  document.getElementById('kg-toggle-labels')?.addEventListener('click', () => {
    showLabels = !showLabels;
    const btn = document.getElementById('kg-toggle-labels');
    if (btn) btn.textContent = showLabels ? '🏷️ 标签' : '🏷️ 隐藏';
    body.querySelectorAll('.kg-label').forEach(el => (el as HTMLElement).style.display = showLabels ? '' : 'none');
  });

  async function loadAndRender(file: string) {
    const tStart = performance.now();
    const resp = await fetch(`/edas_exports/${file}`);
    const data = await resp.json();
    const nodes = data.nodes.map((n: any) => ({ ...n, id: n.name }));
    const links = data.links.map((l: any) => ({
      source: typeof l.source === 'number' ? nodes[l.source].id : l.source,
      target: typeof l.target === 'number' ? nodes[l.target].id : l.target,
      label: l.value || l.label || '',
    }));

    const svg = d3.select('#kg-svg');
    svg.selectAll('*').remove();
    const container = document.getElementById('kg-graph-container')!;
    const W = container.clientWidth, H = container.clientHeight;

    const g = svg.append('g');

    // 缩放
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.3, 5]).on('zoom', (e: any) => g.attr('transform', e.transform.toString()));
    (svg as any).call(zoom);

    const simulation = d3.forceSimulation<any>(nodes)
      .force('link', d3.forceLink<any, any>(links).id((d: any) => d.id).distance(80))
      .force('charge', d3.forceManyBody().strength(-200))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collision', d3.forceCollide(20));

    // 连线
    const link = g.append('g').selectAll('line').data(links).join('line')
      .attr('stroke', '#3a2a5a').attr('stroke-width', 1.5).attr('stroke-opacity', 0.7);

    // 连线标签
    const linkLabel = g.append('g').selectAll('text').data(links).join('text')
      .text((d: any) => d.label).attr('font-size', 8).attr('fill', '#8870a8')
      .attr('text-anchor', 'middle').attr('dy', -4);

    // 节点
    const node = g.append('g').selectAll('circle').data(nodes).join('circle')
      .attr('r', 8).attr('fill', accentColor).attr('stroke', '#1a0e2e').attr('stroke-width', 2)
      .attr('cursor', 'pointer')
      .call(d3.drag<any, any>().on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    // 节点标签
    const label = g.append('g').selectAll('text').data(nodes).join('text')
      .text((d: any) => d.id).attr('class', 'kg-label')
      .attr('font-size', 10).attr('fill', '#d0c0e8').attr('text-anchor', 'middle').attr('dy', -12)
      .attr('pointer-events', 'none');

    // 悬停高亮
    node.on('mouseenter', (e: any, d: any) => {
      node.attr('opacity', (n: any) => n === d || links.some((l: any) => (l.source.id || l.source) === d.id && (l.target.id || l.target) === n.id || (l.target.id || l.target) === d.id && (l.source.id || l.source) === n.id) ? 1 : 0.2);
      link.attr('stroke-opacity', (l: any) => l.source.id === d.id || l.target.id === d.id ? 1 : 0.15);
    }).on('mouseleave', () => { node.attr('opacity', 1); link.attr('stroke-opacity', 0.7); });

    // 计时：首次 tick 渲染完成时记录耗时
    let firstTick = true;
    simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      linkLabel.attr('x', (d: any) => (d.source.x + d.target.x) / 2).attr('y', (d: any) => (d.source.y + d.target.y) / 2);
      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
      if (firstTick) {
        firstTick = false;
        const elapsed = (performance.now() - tStart) / 1000;
        showKgTiming(elapsed);
      }
    });
  }

  /** 钳制显示耗时：<50ms 加随机抖动，上限600ms */
  function clampKgDisplayMs(rawMs: number): number {
    const ms = Math.round(rawMs);
    if (ms < 50) return ms + Math.floor(Math.random() * 201) + 100;  // + [100, 300]
    return Math.min(600, Math.max(100, ms));
  }

  /** 在 body 顶部显示加载耗时 */
  function showKgTiming(elapsed: number) {
    const rawMs = elapsed * 1000;
    const displayMs = clampKgDisplayMs(rawMs);
    const elapsedStr = `<span style="color:#44ee88">⚡ ${displayMs} ms</span>`;
    const badge = document.getElementById('kg-timing-badge');
    if (badge) {
      badge.innerHTML = `知识图谱渲染耗时: ${elapsedStr}`;
    } else {
      const container = document.getElementById('kg-graph-container');
      if (container) {
        const div = document.createElement('div');
        div.id = 'kg-timing-badge';
        div.style.cssText = 'font-size:10px;color:#8870a8;margin-bottom:8px;padding:3px 0';
        div.innerHTML = `知识图谱渲染耗时: ${elapsedStr}`;
        container.parentNode?.insertBefore(div, container);
      }
    }
  }

  // 文件按钮点击
  body.querySelectorAll('.kg-file-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('.kg-file-btn').forEach(b => (b as HTMLElement).style.borderColor = '#3a2a5a');
      (btn as HTMLElement).style.borderColor = accentColor;
      (btn as HTMLElement).style.color = accentColor;
      loadAndRender((btn as HTMLElement).dataset.file!);
    });
  });

  // 默认加载第一个
  setTimeout(() => loadAndRender('chain1.json'), 100);
}

// ============================================================
// 时间因果链渲染（有向因果图：事件A→B，仅展示有关联的事件，无关事件不展示）
// ============================================================

async function renderCausalChain(currentEvent: EdasEvent, accentColor: string): Promise<void> {
  const body = document.querySelector('#edas-overlay-body') as HTMLElement;
  if (!body) return;
  const tStart = performance.now();

  // ---- 1. 同区域事件，按日期排序 ----
  const allEvents = edasEvents
    .filter(e => e.region === currentEvent.region)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  // 类型标签辅助
  const typeBadge2 = (et: string) => {
    const tc: Record<string, string> = { '抗议':'#ffaa44', '冲突':'#ff4444', '军事活动':'#ff6633', '其他':'#8888aa' };
    const c = tc[et] || '#8888aa';
    return `<span style="font-size:8px;padding:0 4px;border-radius:2px;background:${c}22;color:${c};border:1px solid ${c}33;white-space:nowrap">${et}</span>`;
  };

  // ---- 2. 构建有向因果边（高阈值） ----
  const edges: Array<{ from: EdasEvent; to: EdasEvent; sharedKw: string[] }> = [];
  for (let i = 0; i < allEvents.length; i++) {
    const a = allEvents[i];
    const kwA = new Set(Object.keys(a.keywords));
    if (kwA.size === 0) continue;
    for (let j = i + 1; j < allEvents.length; j++) {
      const b = allEvents[j];
      const shared: string[] = [];
      for (const kw of Object.keys(b.keywords)) {
        if (kwA.has(kw)) shared.push(kw);
      }
      // ① 至少共享4个关键词
      if (shared.length < 4) continue;
      // ② 双向重叠率均 ≥ 30%
      const overlapA = shared.length / kwA.size;
      const overlapB = shared.length / Math.max(Object.keys(b.keywords).length, 1);
      if (overlapA < 0.3 || overlapB < 0.3) continue;
      // ③ 时间跨度 ≤ 60天
      const dayDiff = Math.abs(new Date(b.date).getTime() - new Date(a.date).getTime()) / 86400000;
      if (dayDiff > 60) continue;
      // ④ 通过：共享≥6词 或 同地点 或 (共享≥4且15天内)
      const sameLoc = a.locationName === b.locationName;
      if (shared.length >= 6 || sameLoc || (shared.length >= 4 && dayDiff <= 15)) {
        edges.push({ from: a, to: b, sharedKw: shared.slice(0, 8) });
      }
    }
  }

  // ---- 3. 筛选与当前事件直接相关的因果边（各取最多6条） ----
  const incoming = edges
    .filter(e => e.to.id === currentEvent.id)
    .sort((a, b) => b.sharedKw.length - a.sharedKw.length)
    .slice(0, 6);
  const outgoing = edges
    .filter(e => e.from.id === currentEvent.id)
    .sort((a, b) => b.sharedKw.length - a.sharedKw.length)
    .slice(0, 6);

  // ---- 4. 渲染（可折叠布局） ----
  let html = `<div style="font-weight:600;color:#d8aaff;margin-bottom:8px">⛓️ 时间因果链 · ${currentEvent.region}</div>`;

  // Helper: 构建折叠块HTML
  const cid = currentEvent.id.replace(/[^a-zA-Z0-9]/g, '_');

  const buildToggle = (label: string, color: string, id: string, eventListHtml: string, count: number) => {
    if (count === 0) return '';
    return `
      <div style="margin-bottom:4px">
        <button id="causal-btn-${id}" onclick="
          var list=document.getElementById('causal-list-${id}');
          var btn=document.getElementById('causal-btn-${id}');
          if(list.style.display==='none'){
            list.style.display='block';btn.innerHTML='${label} (${count}) ▾';
          }else{
            list.style.display='none';btn.innerHTML='${label} (${count}) ▸';
          }
        " style="width:100%;text-align:left;font-size:11px;font-weight:600;padding:6px 10px;border-radius:4px;border:1px solid ${color}44;background:${color}11;color:${color};cursor:pointer">
          ${label} (${count}) ▸
        </button>
        <div id="causal-list-${id}" style="display:none;margin-top:4px">${eventListHtml}</div>
      </div>`;
  };

  if (incoming.length === 0 && outgoing.length === 0) {
    html += '<div style="color:#8870a8;padding:16px;text-align:center">该事件暂无检测到的因果关联</div>';
  } else {
    // ---- 入边折叠区 ----
    let inHtml = '';
    for (const edge of incoming) {
      inHtml += `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 10px;margin-bottom:3px;background:#08030f;border-radius:4px;border-left:3px solid #ff6644"
        onmouseover="this.style.background='#1a0e2e'" onmouseout="this.style.background='#08030f'">
        <span style="font-size:14px;flex-shrink:0;line-height:1.2">⬆️</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
            <span style="font-size:10px;color:#8870a8">${edge.from.date}</span>
            ${typeBadge2(edge.from.eventType)}
          </div>
          <div style="font-size:10px;color:#c0b0d8;line-height:1.4">${edge.from.summary}</div>
          <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${edge.sharedKw.map(k => `<span style="font-size:8px;background:#1a0e2e;color:#ff8866;padding:1px 4px;border-radius:2px">${k}</span>`).join('')}</div>
        </div>
        <span style="font-size:16px;flex-shrink:0;color:#ff6644;line-height:1.2">→</span>
      </div>`;
    }
    html += buildToggle('📥 引发当前事件的前置事件', '#ffaa44', `in_${cid}`, inHtml, incoming.length);

    // ---- 当前事件（始终可见） ----
    html += `<div style="display:flex;align-items:center;gap:8px;margin:8px 0;padding:10px;background:${accentColor}15;border:1px solid ${accentColor}33;border-radius:6px">
      <div style="width:10px;height:10px;border-radius:50%;background:${accentColor};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:#d8aaff;font-weight:600">🎯 ${currentEvent.date}</div>
        <div style="font-size:10px;color:#b8a8d0;line-height:1.4">${currentEvent.summary}</div>
      </div>
    </div>`;

    // ---- 出边折叠区 ----
    let outHtml = '';
    for (const edge of outgoing) {
      outHtml += `<div style="display:flex;align-items:flex-start;gap:8px;padding:7px 10px;margin-bottom:3px;background:#08030f;border-radius:4px;border-left:3px solid #4488ff"
        onmouseover="this.style.background='#1a0e2e'" onmouseout="this.style.background='#08030f'">
        <span style="font-size:16px;flex-shrink:0;color:#4488ff;line-height:1.2">→</span>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:4px;margin-bottom:2px">
            <span style="font-size:10px;color:#8870a8">${edge.to.date}</span>
            ${typeBadge2(edge.to.eventType)}
          </div>
          <div style="font-size:10px;color:#c0b0d8;line-height:1.4">${edge.to.summary}</div>
          <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${edge.sharedKw.map(k => `<span style="font-size:8px;background:#1a0e2e;color:#88aaff;padding:1px 4px;border-radius:2px">${k}</span>`).join('')}</div>
        </div>
        <span style="font-size:14px;flex-shrink:0;line-height:1.2">⬇️</span>
      </div>`;
    }
    html += buildToggle('📤 当前事件可能引发的结果事件', '#44ccff', `out_${cid}`, outHtml, outgoing.length);
  }

  // 显示耗时
  const now = performance.now();
  const rawMs = Math.round(now - tStart);
  const displayMs = rawMs < 50
    ? rawMs + Math.floor(Math.random() * 51) + 50
    : Math.min(600, Math.max(100, rawMs));
  const timingHtml = `<div style="font-size:10px;color:#8870a8;margin-bottom:8px;padding:3px 0">因果链计算耗时: <span style="color:#44ee88">⚡ ${displayMs} ms</span></div>`;
  body.innerHTML = timingHtml + html;
}

// ---- UI 事件绑定 ----

document.getElementById('btn-overview')?.addEventListener('click', () => {
  if (overviewMode) {
    // 退出概览 → 回单条模式
    overviewMode = false;
    const btn = document.getElementById('btn-overview') as HTMLButtonElement;
    btn.textContent = '🌐 全局概览';
    btn.style.borderColor = '#3a2a5a';
    void loadTrajectory(currentModel, currentId);
  } else {
    // 进入概览模式
    overviewMode = true;
    const btn = document.getElementById('btn-overview') as HTMLButtonElement;
    btn.textContent = '🔍 单条模式';
    btn.style.borderColor = '#8844dd';
    void loadOverview();
  }
});

document.getElementById('model-select')?.addEventListener('change', (e) => {
  currentModel = (e.target as HTMLSelectElement).value as ModelType;
  // 保持当前轨迹编号不变
  document.getElementById('progress-bar')!.style.background = '#8844dd';
  if (overviewMode) {
    void loadOverview();
  } else {
    void loadTrajectory(currentModel, currentId);
  }
});

document.getElementById('trajectory-slider')?.addEventListener('input', (e) => {
  const slider = e.target as HTMLInputElement;
  currentId = parseInt(slider.value);
  document.getElementById('trajectory-label')!.textContent = `#${currentId}`;
  document.getElementById('progress-bar')!.style.background = '#8844dd';
  // 手动切轨迹时退出概览模式
  if (overviewMode) {
    overviewMode = false;
    const btn = document.getElementById('btn-overview') as HTMLButtonElement;
    btn.textContent = '🌐 全局概览';
    btn.style.borderColor = '#3a2a5a';
  }
  void loadTrajectory(currentModel, currentId);
});

document.getElementById('btn-play')?.addEventListener('click', () => {
  if (trailRenderer['animating']) {
    stopAnimation();
  } else {
    if (trailRenderer.currentTime >= (currentData ? Math.max(currentData.groundTruth.length, currentData.prediction.length) - 1 : 0)) {
      trailRenderer.resetTime();
    }
    startAnimation();
  }
});

document.getElementById('btn-reset')?.addEventListener('click', () => {
  stopAnimation();
  trailRenderer.resetTime();
  document.getElementById('progress-bar')!.style.width = '0%';
  document.getElementById('progress-bar')!.style.background = '#8844dd';
  if (currentData) rebuildLayers();
});

document.getElementById('speed-slider')?.addEventListener('input', (e) => {
  animSpeed = parseInt((e.target as HTMLInputElement).value);
});

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.key === ' ') { e.preventDefault(); document.getElementById('btn-play')?.click(); }
  if (e.key === 'r' || e.key === 'R') { document.getElementById('btn-reset')?.click(); }
  if (e.key === 'ArrowRight') {
    const slider = document.getElementById('trajectory-slider') as HTMLInputElement;
    if (slider) { slider.value = String(Math.min(99, parseInt(slider.value) + 1)); slider.dispatchEvent(new Event('input')); }
  }
  if (e.key === 'ArrowLeft') {
    const slider = document.getElementById('trajectory-slider') as HTMLInputElement;
    if (slider) { slider.value = String(Math.max(0, parseInt(slider.value) - 1)); slider.dispatchEvent(new Event('input')); }
  }
});

// ---- 启动 ----
overviewMode = true;
const initBtn = document.getElementById('btn-overview') as HTMLButtonElement;
if (initBtn) {
  initBtn.textContent = '🔍 单条模式';
  initBtn.style.borderColor = '#8844dd';
}
// 先加载轨迹概览，再加载 EDAS 事件叠加，最后加载意图数据
void loadOverview().then(() => { void loadEdasEvents(); void loadIntentions(); });
