// ============================================================
// 飞行轨迹可视化系统 — 主入口
// 包含: 轨迹加载、动画控制、搜索定位、信息面板
// ============================================================

import { MapEngine } from '@/map/MapEngine';
import { FlightTrailRenderer } from '@/map/FlightTrails';
import { flightDataLoader } from '@/services/FlightDataLoader';
import { edasDataLoader } from '@/services/EdasDataLoader';
import type { FlightData, ModelType, EdasEvent } from '@/types';

// ---- 状态 ----

let currentModel: ModelType = 'LSTM';
let currentId = 0;
let currentData: FlightData | null = null;
let animSpeed = 3;
let animationFrameId: number | null = null;
let overviewMode = true;
let allStartPoints: Array<{ lat: number; lon: number; id: number; model: ModelType }> = [];

// EDAS 事件状态
let edasVisible = false;
let edasEvents: EdasEvent[] = [];
let edasLoading = false;

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

// ---- 加载轨迹 ----

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
  document.getElementById('info-points')!.textContent = `GT: ${data.groundTruth.length} · Pred: ${data.prediction.length}`;
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
  document.getElementById('panel-detail')!.innerHTML = '<div class="detail-hint">点击轨迹点查看详情</div>';
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
  document.getElementById('panel-detail')!.innerHTML = '<div class="detail-hint">正在加载 100 条轨迹数据...</div>';

  // 并行加载全部 100 条轨迹
  const ids = Array.from({ length: 100 }, (_, i) => i);
  const results = await Promise.all(ids.map(id => flightDataLoader.getTrajectory(currentModel, id)));
  overviewCache = results.filter((d): d is FlightData => d !== null && d.groundTruth.length > 0);

  // 构建所有 GT 轨迹线（每条独立 PathLayer，支持悬浮+点击）
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
  document.getElementById('info-rmse')!.textContent = '点击轨迹或圆点查看详情';
  document.getElementById('panel-detail')!.innerHTML = '<div class="detail-hint">点击绿色轨迹线或紫色圆点加载对应轨迹</div>';
}

// ---- EDAS 事件图层 ----

async function loadEdasEvents(): Promise<void> {
  if (edasLoading) return;
  edasLoading = true;
  const btn = document.getElementById('btn-edas') as HTMLButtonElement;

  try {
    btn.textContent = '⏳ 加载中...';

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
          // 取聚类内主导区域作为颜色
          const regionCounts: Record<string, number> = {};
          for (const leaf of leaves) {
            const r = (leaf.properties as any).region || 'ukraine';
            regionCounts[r] = (regionCounts[r] || 0) + 1;
          }
          let dominantRegion = 'ukraine';
          let maxCount = 0;
          for (const [r, c] of Object.entries(regionCounts)) {
            if (c > maxCount) { maxCount = c; dominantRegion = r; }
          }
          clusterPoints.push({
            position: (c.geometry as any).coordinates,
            count,
            clusterId: props.cluster_id,
            color: regionColors[dominantRegion] || [136, 68, 221, 200],
            radius: Math.min(14 + Math.sqrt(count) * 3, 40),
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
    let removeOverlay = mapEngine.addOverlayLayers([clusterLayer, clusterLabelLayer, edasScatter, edasLabels]);
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
      if (!edasVisible) return;
      const z = mapEngine.maplibreMap?.getZoom() || 4;
      const { clusterPoints: cp, singlePoints: sp } = getClusters(z);

      const newClusterLayer = new ScatterplotLayer({
        id: 'edas-clusters', data: cp,
        getPosition: (d: any) => d.position,
        getFillColor: (d: any) => d.color,
        getRadius: (d: any) => d.radius,
        radiusMinPixels: 14, radiusMaxPixels: 45,
        pickable: true, autoHighlight: true,
        onClick: (info: any) => {
          if (info.object?.clusterId != null) {
            const leaves = clusterIndex.getLeaves(info.object.clusterId, Infinity, 0);
            showEdasEventListPanel(leaves, info.object.count || leaves.length);
          }
        },
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
      const newRemove = mapEngine.addOverlayLayers([newClusterLayer, newClusterLabels, newScatter, newLabels]);
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

    edasVisible = true;
    btn.textContent = '🟣 EDAS 事件 ✓';
    btn.style.borderColor = '#cc66ff';
    btn.style.background = '#2a1050';

    document.getElementById('info-model')!.textContent = 'EDAS';
    document.getElementById('info-id')!.textContent = `🌍 ${edasEvents.length} 事件`;
    document.getElementById('info-points')!.textContent = `🇭🇰🇮🇷🇺🇦 三区联合`;
    document.getElementById('info-duration')!.textContent = '—';
    document.getElementById('info-distance')!.textContent = '—';
    document.getElementById('info-rmse')!.textContent = '点击聚类圆展开 · 点击单点查看详情';
    document.getElementById('panel-detail')!.innerHTML = '<div class="detail-hint">🟣 品红=HK · 🟠 橙红=伊朗 · 🔵 蓝=乌克兰<br>密集区域自动聚类 · 放大即可展开</div>';
  } catch (err) {
    console.error('EDAS load error:', err);
    btn.textContent = '🟣 EDAS (失败)';
  } finally {
    edasLoading = false;
  }
}

function hideEdasEvents(): void {
  edasVisible = false;
  mapEngine.onEdasClick = undefined;
  // 移除 EDAS 叠加层
  if ((mapEngine as any).__removeEdasOverlay) {
    (mapEngine as any).__removeEdasOverlay();
    (mapEngine as any).__removeEdasOverlay = null;
  }
  const btn = document.getElementById('btn-edas') as HTMLButtonElement;
  btn.textContent = '🟣 EDAS 事件';
  btn.style.borderColor = '#8844dd';
  btn.style.background = '#2a1a44';

  // 清理缩放监听
  if ((mapEngine as any).__edasCleanup) {
    (mapEngine as any).__edasCleanup();
    (mapEngine as any).__edasCleanup = null;
  }
  // EDAS 叠加层已移除，轨迹层保持原样，无需重新加载
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
    `🟣 EDAS 事件列表 · <span style="color:#cc66ff">${events.length} / ${totalCount} 条</span>`;

  let rows = '';
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

  const analysisHtml = `
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
    </div>
    <div style="padding:8px;background:#08030f;border-radius:6px;border:1px solid #2a1a44;font-size:11px;color:#8870a8">
      📍 ${event.locationName || event.region} · ⚡ ${event.bursty ? '突发' : '非突发'} · ${event.level ? '📶 ' + event.level : ''}
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
    else if (tab === 'kg') { body.innerHTML = '<div style="text-align:center;padding:40px;color:#8870a8">⏳ 加载知识图谱...</div>'; renderKnowledgeGraph(color); }
    else if (tab === 'causal') { body.innerHTML = '<div style="text-align:center;padding:40px;color:#8870a8">⏳ 计算因果链...</div>'; renderCausalChain(event, color); }
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

    simulation.on('tick', () => {
      link.attr('x1', (d: any) => d.source.x).attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x).attr('y2', (d: any) => d.target.y);
      linkLabel.attr('x', (d: any) => (d.source.x + d.target.x) / 2).attr('y', (d: any) => (d.source.y + d.target.y) / 2);
      node.attr('cx', (d: any) => d.x).attr('cy', (d: any) => d.y);
      label.attr('x', (d: any) => d.x).attr('y', (d: any) => d.y);
    });
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
// 时间因果链渲染
// ============================================================

async function renderCausalChain(currentEvent: EdasEvent, accentColor: string): Promise<void> {
  const body = document.querySelector('#edas-overlay-body') as HTMLElement;
  if (!body) return;

  // 收集当前事件所在区域的全部事件，按日期排序
  const allEvents = edasEvents.filter(e => e.region === currentEvent.region && e.id !== currentEvent.id);
  const currentKw = new Set(Object.keys(currentEvent.keywords));

  // 策略1+2: 关键词重叠 + 时间邻近 → 计算因果关联分数
  const causalLinks: Array<{ target: EdasEvent; score: number; sharedKw: string[] }> = [];
  for (const e of allEvents) {
    const shared: string[] = [];
    for (const kw of Object.keys(e.keywords)) {
      if (currentKw.has(kw)) shared.push(kw);
    }
    if (shared.length >= 2) {
      // 时间邻近加权 (30天内越近权重越高)
      const dayDiff = Math.abs(new Date(currentEvent.date).getTime() - new Date(e.date).getTime()) / 86400000;
      const timeScore = Math.max(0, 1 - dayDiff / 30);
      const score = (shared.length / Math.max(currentKw.size, 1)) * 0.6 + timeScore * 0.4;
      if (score > 0.15) causalLinks.push({ target: e, score, sharedKw: shared.slice(0, 5) });
    }
  }
  causalLinks.sort((a, b) => b.score - a.score);
  const topLinks = causalLinks.slice(0, 20);

  // 策略3: 因果语言检测
  const causalPhrases = ['led to', 'triggered', 'caused', 'resulted in', 'because', 'due to', '导致', '引发', '造成'];
  const langMatches = allEvents.filter(e => {
    const summary = (e.summary || '').toLowerCase();
    return causalPhrases.some(p => summary.includes(p));
  }).slice(0, 10);

  let html = '<div style="font-weight:600;color:#d8aaff;margin-bottom:8px">⛓️ 时间因果链 · ' + currentEvent.region + '</div>';

  if (topLinks.length === 0 && langMatches.length === 0) {
    html += '<div style="color:#8870a8;padding:20px;text-align:center">该事件暂无检测到的因果关联</div>';
  } else {
    // 当前事件节点
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;padding:10px;background:${accentColor}15;border:1px solid ${accentColor}33;border-radius:6px">
      <div style="width:10px;height:10px;border-radius:50%;background:${accentColor};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:11px;color:#d8aaff;font-weight:600">🎯 当前事件</div>
        <div style="font-size:10px;color:#b8a8d0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${currentEvent.summary.slice(0, 80)}</div>
      </div>
    </div>`;

    // 因果弧线（关键词重叠）
    if (topLinks.length > 0) {
      html += '<div style="font-weight:600;color:#cc66ff;font-size:11px;margin-bottom:6px">🔗 关键词重叠关联 (Top ' + topLinks.length + ')</div>';
      for (const link of topLinks) {
        const scoreColor = link.score > 0.6 ? '#ff5555' : link.score > 0.35 ? '#ffaa44' : '#66aaff';
        html += `<div style="display:flex;align-items:flex-start;gap:6px;padding:8px 10px;margin-bottom:4px;background:#08030f;border-radius:4px;border-left:3px solid ${scoreColor};cursor:pointer"
          onmouseover="this.style.background='#1a0e2e'" onmouseout="this.style.background='#08030f'">
          <span style="font-size:10px;color:${scoreColor};flex-shrink:0;font-weight:600">${(link.score * 100).toFixed(0)}%</span>
          <div style="flex:1;min-width:0">
            <div style="font-size:10px;color:#8870a8">${link.target.date}</div>
            <div style="font-size:11px;color:#c0b0d8;line-height:1.3">${link.target.summary.slice(0, 70)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:2px">${link.sharedKw.map(k => `<span style="font-size:9px;background:#1a0e2e;color:#aab;padding:1px 5px;border-radius:2px">${k}</span>`).join('')}</div>
          </div>
        </div>`;
      }
    }

    // 因果语言匹配
    if (langMatches.length > 0) {
      html += '<div style="font-weight:600;color:#ffaa44;font-size:11px;margin-bottom:6px;margin-top:10px">💬 因果语言匹配</div>';
      for (const e of langMatches) {
        html += `<div style="display:flex;align-items:flex-start;gap:6px;padding:8px 10px;margin-bottom:4px;background:#08030f;border-radius:4px;border-left:3px solid #ffaa44">
          <span style="font-size:10px;color:#ffaa44;flex-shrink:0">📅 ${e.date}</span>
          <div style="font-size:10px;color:#b8a8d0;line-height:1.3">${e.summary.slice(0, 80)}</div>
        </div>`;
      }
    }
  }

  body.innerHTML = html;
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
  currentId = 0;
  (document.getElementById('trajectory-slider') as HTMLInputElement).value = '0';
  document.getElementById('trajectory-label')!.textContent = '#0';
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

// EDAS 事件切换
document.getElementById('btn-edas')?.addEventListener('click', () => {
  if (edasVisible) {
    hideEdasEvents();
  } else {
    void loadEdasEvents();
  }
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
// 初始化概览按钮样式
const initBtn = document.getElementById('btn-overview') as HTMLButtonElement;
if (initBtn) {
  initBtn.textContent = '🔍 单条模式';
  initBtn.style.borderColor = '#8844dd';
}
void loadOverview();
