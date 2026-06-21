// ============================================================
// 船舶航迹渲染 — deck.gl 图层
// 包含: 轨迹线、方向箭头、时间标记、起点终点、动画光标
// ============================================================

import { ScatterplotLayer, PathLayer, LineLayer, TextLayer } from '@deck.gl/layers';
import type { Layer } from '@deck.gl/core';
import type { FlightData, TrajectoryPoint } from '@/types';

/** 轨迹可视化配置 */
export interface TrailConfig {
  gtColor: [number, number, number, number];
  predColor: [number, number, number, number];
  trailWidth: number;
  pointRadius: number;
  showPoints: boolean;
  showArrows: boolean;
  showLabels: boolean;
}

const DEFAULT_CONFIG: TrailConfig = {
  gtColor: [0, 255, 136, 200],
  predColor: [255, 170, 0, 200],
  trailWidth: 3,
  pointRadius: 5,
  showPoints: true,
  showArrows: true,
  showLabels: true,
};

// ── 辅助: 两点间方位角 (度数) ──
function bearing(p1: TrajectoryPoint, p2: TrajectoryPoint): number {
  const dLon = (p2.lon - p1.lon) * Math.PI / 180;
  const lat1 = p1.lat * Math.PI / 180;
  const lat2 = p2.lat * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}

// ── 辅助: 两点间距离 (km, Haversine) ──
function haversineKm(p1: TrajectoryPoint, p2: TrajectoryPoint): number {
  const R = 6371;
  const dLat = (p2.lat - p1.lat) * Math.PI / 180;
  const dLon = (p2.lon - p1.lon) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(p1.lat*Math.PI/180) * Math.cos(p2.lat*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

export class FlightTrailRenderer {
  private config: TrailConfig;
  private animationTime = 0;
  private animating = false;
  private rafId: number | null = null;

  onFrame?: (time: number) => void;

  constructor(config: Partial<TrailConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  setConfig(config: Partial<TrailConfig>): void { Object.assign(this.config, config); }
  get currentTime(): number { return this.animationTime; }

  startAnimation(speed = 3): void {
    if (this.animating) return;
    this.animating = true;
    const step = () => {
      if (!this.animating) return;
      this.animationTime += 0.016 * speed;
      this.onFrame?.(this.animationTime);
      this.rafId = requestAnimationFrame(step);
    };
    this.rafId = requestAnimationFrame(step);
  }

  stopAnimation(): void {
    this.animating = false;
    if (this.rafId !== null) { cancelAnimationFrame(this.rafId); this.rafId = null; }
  }

  resetTime(): void { this.animationTime = 0; }
  setTime(t: number): void { this.animationTime = t; }

  /** 构建完整图层集 */
  buildLayers(data: FlightData | null): Layer[] {
    const layers: Layer[] = [];
    if (!data) return layers;

    const { groundTruth, prediction } = data;
    const { gtColor, predColor, trailWidth, pointRadius, showPoints, showArrows, showLabels } = this.config;

    // ========== 1. GT 轨迹 ==========
    if (groundTruth.length >= 2) {
      const gtPath = groundTruth.map(p => [p.lon, p.lat]);
      layers.push(new PathLayer({
        id: 'gt-trail',
        data: [{ path: gtPath }],
        getPath: (d: any) => d.path,
        getColor: () => gtColor,
        widthMinPixels: trailWidth,
        widthMaxPixels: 6,
        getWidth: () => trailWidth,
        pickable: true,
      }));

      // GT 散点（带速度/航向）
      if (showPoints) {
        const gtWithMotion = groundTruth.map((p, i) => {
          const next = groundTruth[Math.min(i + 1, groundTruth.length - 1)];
          const prev = groundTruth[Math.max(i - 1, 0)];
          const spd = next ? haversineKm(p, next) / Math.max((next.t - p.t) * 3600 / 3600, 0.001) : 0;
          const hdg = next ? bearing(p, next) : bearing(prev, p);
          return { ...p, index: i, speed: spd, heading: hdg };
        });
        layers.push(new ScatterplotLayer({
          id: 'gt-points', data: gtWithMotion,
          getPosition: (d: any) => [d.lon, d.lat],
          getFillColor: (d: any) => [...gtColor.slice(0, 3), Math.round(200 - d.index * 10)] as [number, number, number, number],
          getRadius: () => pointRadius,
          radiusMinPixels: 3, radiusMaxPixels: 9,
          pickable: true,
        }));
      }

      // GT 方向箭头
      if (showArrows && groundTruth.length >= 3) {
        layers.push(...this.buildArrowLayer(groundTruth, gtColor, 'gt-arrow'));
      }

      // GT 时间标签
      if (showLabels) {
        layers.push(this.buildTimeLabels(groundTruth, gtColor, 'gt-label'));
      }

      // 起点/终点
      layers.push(...this.buildStartEndMarkers(groundTruth, 'gt'));
    }

    // ========== 2. 预测轨迹 ==========
    if (prediction.length >= 2) {
      const predPath = prediction.map(p => [p.lon, p.lat]);
      layers.push(new PathLayer({
        id: 'pred-trail', data: [{ path: predPath }],
        getPath: (d: any) => d.path,
        getColor: () => predColor,
        widthMinPixels: trailWidth, widthMaxPixels: 6, getWidth: () => trailWidth,
        pickable: true,
        parameters: { lineDash: true } as any,
      } as any));

      if (showPoints) {
        const predWithMotion = prediction.map((p, i) => {
          const next = prediction[Math.min(i + 1, prediction.length - 1)];
          const prev = prediction[Math.max(i - 1, 0)];
          const spd = next ? haversineKm(p, next) / Math.max((next.t - p.t) * 3600 / 3600, 0.001) : 0;
          const hdg = next ? bearing(p, next) : bearing(prev, p);
          return { ...p, index: i, speed: spd, heading: hdg };
        });
        layers.push(new ScatterplotLayer({
          id: 'pred-points', data: predWithMotion,
          getPosition: (d: any) => [d.lon, d.lat],
          getFillColor: () => predColor,
          getRadius: () => pointRadius,
          radiusMinPixels: 3, radiusMaxPixels: 9,
          pickable: true,
        }));
      }

      if (showArrows && prediction.length >= 3) {
        layers.push(...this.buildArrowLayer(prediction, predColor, 'pred-arrow'));
      }
      if (showLabels) {
        layers.push(this.buildTimeLabels(prediction, predColor, 'pred-label'));
      }
      layers.push(...this.buildStartEndMarkers(prediction, 'pred'));
    }

    // ========== 3. 偏移线 ==========
    if (groundTruth.length > 0 && prediction.length > 0) {
      const minLen = Math.min(groundTruth.length, prediction.length);
      const offsetLines: Array<{ source: [number, number]; target: [number, number]; dist: number }> = [];
      for (let i = 0; i < minLen; i++) {
        const dist = haversineKm(groundTruth[i], prediction[i]);
        offsetLines.push({
          source: [groundTruth[i].lon, groundTruth[i].lat],
          target: [prediction[i].lon, prediction[i].lat],
          dist,
        });
      }
      layers.push(new LineLayer({
        id: 'offset-lines',
        data: offsetLines,
        getSourcePosition: (d: any) => d.source,
        getTargetPosition: (d: any) => d.target,
        getColor: (d: any) => {
          const intensity = Math.min(d.dist * 50, 1);
          return [Math.round(255 * intensity), Math.round(80 * (1 - intensity)), Math.round(80 * (1 - intensity)), 100] as [number, number, number, number];
        },
        getWidth: () => 1,
        widthMinPixels: 1,
        pickable: true,
      }));
    }

    // ========== 4. 动画光标 ==========
    if (this.animating || this.animationTime > 0) {
      const cursorLayer = this.buildCursorLayer(groundTruth, prediction);
      if (cursorLayer) layers.push(cursorLayer);
    }

    return layers;
  }

  /** 方向箭头（每 N 个点一个箭头） */
  private buildArrowLayer(points: TrajectoryPoint[], color: [number, number, number, number], id: string): Layer[] {
    const layers: Layer[] = [];
    const step = Math.max(1, Math.floor(points.length / 5));
    const arrowData: Array<{ pos: [number, number]; angle: number }> = [];
    for (let i = 0; i < points.length - 1; i += step) {
      const angle = bearing(points[i], points[i + 1]);
      arrowData.push({ pos: [points[i].lon, points[i].lat], angle });
    }
    // Use ScatterplotLayer with rotated triangle symbol
    layers.push(new ScatterplotLayer({
      id,
      data: arrowData,
      getPosition: (d: any) => d.pos,
      getFillColor: () => [...color.slice(0, 3), 180] as [number, number, number, number],
      getRadius: () => 7,
      radiusMinPixels: 5,
      radiusMaxPixels: 12,
      pickable: false,
      // Use a custom symbol — we render small triangles via getPointShape
      getShape: () => 'diamond',
      getAngle: (d: any) => -d.angle + 90,
    } as any));
    return layers;
  }

  /** 时间标签（每 N 个点一个） */
  private buildTimeLabels(points: TrajectoryPoint[], color: [number, number, number, number], id: string): TextLayer {
    const step = Math.max(1, Math.floor(points.length / 4));
    const labelData = points
      .filter((_, i) => i % step === 0)
      .map(p => ({ ...p, label: `${p.t.toFixed(2)}h` }));

    return new TextLayer({
      id,
      data: labelData,
      getPosition: (d: any) => [d.lon, d.lat],
      getText: (d: any) => d.label,
      getSize: 10,
      getColor: () => [255, 255, 255, 180] as [number, number, number, number],
      getTextAnchor: 'start',
      getAlignmentBaseline: 'bottom',
      fontFamily: 'monospace',
      sizeMinPixels: 8,
      sizeMaxPixels: 14,
      pickable: true,
      billboard: true,
      background: true,
      backgroundColor: [0, 0, 0, 100],
    });
  }

  /** 起点/终点标记 */
  private buildStartEndMarkers(points: TrajectoryPoint[], prefix: string): Layer[] {
    const first = points[0];
    const last = points[points.length - 1];
    const startColor: [number, number, number, number] = prefix === 'gt' ? [0, 255, 136, 220] : [255, 170, 0, 220];
    const endColor: [number, number, number, number] = prefix === 'gt' ? [255, 50, 50, 200] : [255, 100, 50, 200];
    return [
      new ScatterplotLayer({
        id: `${prefix}-start`,
        data: [{ ...first, label: '起点' }],
        getPosition: (d: any) => [d.lon, d.lat],
        getFillColor: () => startColor,
        getRadius: () => 9,
        radiusMinPixels: 6,
        radiusMaxPixels: 14,
        pickable: true,
      }),
      new ScatterplotLayer({
        id: `${prefix}-end`,
        data: [{ ...last, label: '终点' }],
        getPosition: (d: any) => [d.lon, d.lat],
        getFillColor: () => endColor,
        getRadius: () => 9,
        radiusMinPixels: 6,
        radiusMaxPixels: 14,
        pickable: true,
      }),
    ];
  }

  /** 动画光标 — 显示当前播放位置 */
  private buildCursorLayer(gt: TrajectoryPoint[], pred: TrajectoryPoint[]): Layer | null {
    const t = this.animationTime;
    const getPos = (points: TrajectoryPoint[]): [number, number] | null => {
      if (points.length === 0) return null;
      const idx = Math.min(Math.floor(t), points.length - 1);
      const nextIdx = Math.min(idx + 1, points.length - 1);
      const frac = t - Math.floor(t);
      if (idx >= points.length) return [points[points.length - 1].lon, points[points.length - 1].lat];
      const p0 = points[idx];
      const p1 = points[nextIdx];
      if (nextIdx === idx || frac <= 0) return [p0.lon, p0.lat];
      return [p0.lon + (p1.lon - p0.lon) * frac, p0.lat + (p1.lat - p0.lat) * frac];
    };

    const gtPos = gt.length > 0 ? getPos(gt) : null;
    const predPos = pred.length > 0 ? getPos(pred) : null;
    const cursorData: Array<{ pos: [number, number]; type: string }> = [];
    if (gtPos) cursorData.push({ pos: gtPos, type: 'gt' });
    if (predPos) cursorData.push({ pos: predPos, type: 'pred' });

    if (cursorData.length === 0) return null;

    return new ScatterplotLayer({
      id: 'cursor-marker',
      data: cursorData,
      getPosition: (d: any) => d.pos,
      getFillColor: (d: any) => d.type === 'gt' ? [0, 255, 136, 255] as [number, number, number, number] : [255, 170, 0, 255] as [number, number, number, number],
      getRadius: () => 12,
      radiusMinPixels: 8,
      radiusMaxPixels: 20,
      getLineColor: () => [255, 255, 255, 200] as [number, number, number, number],
      getLineWidth: () => 2,
      lineWidthMinPixels: 1.5,
      stroked: true,
      pickable: true,
    });
  }

  /** 计算轨迹边界 */
  static getBounds(data: FlightData): [[number, number], [number, number]] {
    const all = [...data.groundTruth, ...data.prediction];
    let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
    for (const p of all) {
      if (p.lat < minLat) minLat = p.lat;
      if (p.lat > maxLat) maxLat = p.lat;
      if (p.lon < minLon) minLon = p.lon;
      if (p.lon > maxLon) maxLon = p.lon;
    }
    return [[minLon - 0.02, minLat - 0.02], [maxLon + 0.02, maxLat + 0.02]];
  }
}
