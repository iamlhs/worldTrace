// ============================================================
// 核心地图引擎 — maplibre-gl + deck.gl
// 包含: 悬浮tooltip、点击弹出层、坐标显示、方向箭头
// ============================================================

import maplibregl from 'maplibre-gl';
import { MapboxOverlay } from '@deck.gl/mapbox';
import type { Layer, LayersList, PickingInfo } from '@deck.gl/core';
import 'maplibre-gl/dist/maplibre-gl.css';

export interface PopupInfo {
  title: string;
  lines: { label: string; value: string }[];
  color?: string;
  lng?: number;
  lat?: number;
}

export class MapEngine {
  private map!: maplibregl.Map;
  private deckOverlay!: MapboxOverlay;
  private layers: Layer[] = [];
  private _ready = false;
  private tooltipEl: HTMLElement;
  private popupEl: HTMLElement;
  private coordEl: HTMLElement;

  get ready(): boolean { return this._ready; }
  get maplibreMap(): maplibregl.Map { return this.map; }
  /** 获取 deck.gl 实例（用于 pickObject 等操作） */
  get deckInstance(): any {
    const overlay = this.deckOverlay as any;
    return overlay?._deck || overlay?.deck || overlay;
  }

  /** 外部点击/悬浮回调 */
  onPointClick?: (info: PopupInfo) => void;
  /** EDAS 事件点击回调 */
  onEdasClick?: (data: any, layerId: string, lng: number, lat: number) => void;

  constructor() {
    this.tooltipEl = this.createEl('map-tooltip');
    this.popupEl = this.createEl('map-popup');
    this.coordEl = this.createEl('map-coords');
    // Popup close
    this.popupEl.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.map-popup-close')) this.hidePopup();
    });
  }

  private createEl(cls: string): HTMLElement {
    const el = document.createElement('div');
    el.className = cls;
    el.style.display = 'none';
    document.body.appendChild(el);
    return el;
  }

  init(container: HTMLElement): void {
    this.map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        sources: {
          'esri': {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://www.esri.com/">Esri</a>',
          },
          'dark': {
            type: 'raster',
            tiles: [
              'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
          },
        },
        layers: [
          { id: 'esri-layer', type: 'raster', source: 'esri', minzoom: 0, maxzoom: 18 },
        ],
      },
      center: [-98.0, 39.0],
      zoom: 4,
      attributionControl: {},
    });

    this.map.addControl(new maplibregl.NavigationControl(), 'top-right');
    this.map.addControl(new maplibregl.ScaleControl(), 'bottom-left');

    this.deckOverlay = new MapboxOverlay({ interleaved: true, layers: [] });
    this.map.addControl(this.deckOverlay as any);

    // ── Mouse move → tooltip + coords ──
    this.map.on('mousemove', (e) => {
      this.coordEl.textContent = `📍 ${e.lngLat.lat.toFixed(4)}°${e.lngLat.lat >= 0 ? 'N' : 'S'}, ${Math.abs(e.lngLat.lng).toFixed(4)}°${e.lngLat.lng >= 0 ? 'E' : 'W'} · Z${this.map.getZoom().toFixed(1)}`;
      this.coordEl.style.display = 'block';
    });

    // ── Custom deck tooltip handler ──
    this.deckOverlay.setProps({
      getTooltip: (info: PickingInfo) => {
        if (info.object) {
          const d = info.object as any;
          const rect = this.map.getContainer().getBoundingClientRect();
          this.tooltipEl.style.display = 'block';
          this.tooltipEl.style.left = Math.min(info.x + 14, rect.width - 220) + 'px';
          this.tooltipEl.style.top = Math.max(info.y - 30, 8) + 'px';
          this.tooltipEl.innerHTML = this.buildTooltipHtml(d, info.layer?.id || '');
          return { html: '' };
        }
        this.tooltipEl.style.display = 'none';
        return null;
      },
    });

    // ── Click → popup ──
    this.map.on('click', (e) => {
      // deck.gl v9 MapboxOverlay: 优先 pickObject，回退 pickObjects
      const deckInfo = (this.deckOverlay as any)?.pickObject?.(e.point)
        || (this.deckOverlay as any)?.pickObjects?.({ x: e.point.x, y: e.point.y, width: 1, height: 1 })?.[0];
      if (!deckInfo?.object) return;
      const d = deckInfo.object;
      const layerId: string = deckInfo.layer?.id || '';

      // EDAS 图层 → 委托外部 handler
      if (layerId.startsWith('edas-')) {
        if (this.onEdasClick) {
          this.onEdasClick(d, layerId, e.lngLat.lng, e.lngLat.lat);
        }
        return;
      }

      this.showPopup(d, layerId, e.lngLat);
    });

    this.map.on('load', () => { this._ready = true; });
  }

  private buildTooltipHtml(d: any, layerId: string): string {
    // ── EDAS 图层特殊处理 ──
    if (layerId === 'edas-clusters') {
      const regionCounts: Record<string, number> = {};
      if (d.count) {
        return `<div class="tt-header" style="color:#cc66ff">🟣 EDAS 聚类</div>
          <div class="tt-row">📊 ${d.count} 个事件</div>
          <div class="tt-row">🖱️ 点击展开</div>`;
      }
    }
    if (layerId === 'edas-events' && d.event) {
      const e = d.event;
      const emoji: Record<string, string> = { hongkong: '🇭🇰', iran: '🇮🇷', ukraine: '🇺🇦' };
      const regionEmoji = emoji[String(e.region)] || '';
      return `<div class="tt-header" style="color:#cc66ff">🟣 EDAS 事件</div>
        <div class="tt-row">${regionEmoji} ${e.locationName || e.region}</div>
        <div class="tt-row">📅 ${e.date}</div>
        ${e.level ? `<div class="tt-row">📶 ${e.level}</div>` : ''}
        <div class="tt-row" style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${e.summary?.slice(0, 60) || ''}</div>`;
    }

    let header = '📍 点';
    let color = '#8888ff';
    if (layerId.includes('gt-')) { header = '🟢 地面实况'; color = '#00ff88'; }
    else if (layerId.includes('pred-')) { header = '🟠 预测'; color = '#ffaa00'; }
    else if (layerId.includes('cursor')) { header = '✈️ 当前位置'; color = '#ff66ff'; }
    else if (layerId.includes('arrow')) { header = '➡️ 方向'; color = '#66ccff'; }
    else if (layerId.includes('offset')) { header = '📏 偏移'; color = '#ff5050'; }
    else if (layerId.includes('label')) { header = '🏷️ 时间标记'; color = '#aaddff'; }
    else if (layerId.includes('start')) { header = '🟢 起点'; color = '#44ff88'; }
    else if (layerId.includes('end')) { header = '🔴 终点'; color = '#ff4466'; }

    let lines = `<div class="tt-header" style="color:${color}">${header}</div>`;
    if (d.t !== undefined) lines += `<div class="tt-row">⏱ t = ${d.t.toFixed(4)}h</div>`;
    if (d.lat !== undefined) lines += `<div class="tt-row">🌐 ${d.lat.toFixed(5)}, ${d.lon.toFixed(5)}</div>`;
    if (d.index !== undefined) lines += `<div class="tt-row">索引 #${d.index}</div>`;
    if (d.speed !== undefined) lines += `<div class="tt-row">🚀 ${d.speed.toFixed(1)} km/h</div>`;
    if (d.heading !== undefined) lines += `<div class="tt-row">🧭 ${d.heading.toFixed(1)}°</div>`;
    if (d.dist !== undefined) lines += `<div class="tt-row">📐 偏差 ${(d.dist * 1000).toFixed(0)}m</div>`;
    return lines;
  }

  private showPopup(d: any, layerId: string, lngLat: maplibregl.LngLat): void {
    const isGT = layerId.includes('gt-');
    const isPred = layerId.includes('pred-');
    const color = isGT ? '#00ff88' : isPred ? '#ffaa00' : '#ff66ff';
    const title = isGT ? '🟢 地面实况点' : isPred ? '🟠 预测点' : '📍 轨迹点';

    let html = `<div class="map-popup-close">✕</div>`;
    html += `<div class="popup-title" style="border-left:3px solid ${color};padding:6px 10px">${title}</div><div class="popup-body">`;
    const rows: [string, string][] = [];
    if (d.t !== undefined) rows.push(['时间', `${d.t.toFixed(4)} h`]);
    if (d.lat !== undefined) rows.push(['纬度', `${d.lat.toFixed(6)}°`]);
    if (d.lon !== undefined) rows.push(['经度', `${d.lon.toFixed(6)}°`]);
    if (d.index !== undefined) rows.push(['序号', `#${d.index}`]);
    if (d.speed !== undefined) rows.push(['速度', `${d.speed.toFixed(2)} km/h`]);
    if (d.heading !== undefined) rows.push(['航向', `${d.heading.toFixed(1)}°`]);
    if (d.dist !== undefined) rows.push(['偏差', `${(d.dist * 1000).toFixed(0)} m`]);
    rows.push(['地图坐标', `${lngLat.lat.toFixed(4)}, ${lngLat.lng.toFixed(4)}`]);
    rows.push(['缩放级别', `Z${this.map.getZoom().toFixed(1)}`]);

    for (const [label, val] of rows) {
      html += `<div class="popup-row"><span class="popup-label">${label}</span><span>${val}</span></div>`;
    }
    html += `</div>`;

    this.popupEl.innerHTML = html;
    this.popupEl.style.display = 'block';

    // Position
    const rect = this.map.getContainer().getBoundingClientRect();
    const pt = this.map.project(lngLat);
    const pw = 300;
    const l = Math.max(8, Math.min(pt.x + 12, rect.width - pw - 8));
    const t = Math.max(8, Math.min(pt.y - 10, rect.height - 220));
    this.popupEl.style.left = (rect.left + l) + 'px';
    this.popupEl.style.top = (rect.top + t) + 'px';

    this.onPointClick?.({ title, lines: rows.map(([l, v]) => ({ label: l, value: v })), color, lng: d.lon, lat: d.lat });
  }

  hidePopup(): void { this.popupEl.style.display = 'none'; }

  /** 在指定坐标显示自定义 HTML 弹出层 */
  showCustomPopup(html: string, lng: number, lat: number): void {
    this.popupEl.innerHTML = html;
    this.popupEl.style.display = 'block';

    const rect = this.map.getContainer().getBoundingClientRect();
    const pt = this.map.project([lng, lat]);
    const pw = 300;
    const l = Math.max(8, Math.min(pt.x + 12, rect.width - pw - 8));
    const t = Math.max(8, Math.min(pt.y - 10, rect.height - 300));
    this.popupEl.style.left = (rect.left + l) + 'px';
    this.popupEl.style.top = (rect.top + t) + 'px';

    // 关闭按钮绑定
    this.popupEl.querySelector('.map-popup-close')?.addEventListener('click', () => {
      this.popupEl.style.display = 'none';
    });
  }

  setView(center: [number, number], zoom: number): void {
    this.map.flyTo({ center, zoom, duration: 800 });
  }

  fitBounds(bounds: [[number, number], [number, number]]): void {
    this.map.fitBounds(bounds, { padding: 80, duration: 800 });
  }

  updateLayers(newLayers: Layer[]): void {
    this.layers = newLayers;
    this.deckOverlay.setProps({ layers: this.layers as LayersList });
  }

  /** 添加额外图层（不影响已有图层），返回移除函数 */
  addOverlayLayers(extraLayers: Layer[]): () => void {
    const combined = [...this.layers, ...extraLayers];
    this.deckOverlay.setProps({ layers: combined as LayersList });
    return () => {
      this.deckOverlay.setProps({ layers: this.layers as LayersList });
    };
  }

  destroy(): void {
    this.tooltipEl.remove();
    this.popupEl.remove();
    this.coordEl.remove();
    this.map.remove();
    this._ready = false;
  }
}
