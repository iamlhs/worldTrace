// ============================================================
// 船舶航迹数据加载器
// 从 saves/ 目录加载 DSTPP/GRU/LSTM/RNN 轨迹数据
// ============================================================

import type { FlightData, FlightDataSource, ModelType, RmseMetrics, TrajectoryPoint } from '@/types';

const DATA_BASE = '/saves';

/**
 * 本地文件数据源 — 从 saves/ 目录读取
 */
export class LocalFileDataSource implements FlightDataSource {
  async getModels(): Promise<ModelType[]> {
    return ['LSTM', 'GRU', 'RNN', 'DSTPP'];
  }

  async getAvailableIds(model: ModelType): Promise<number[]> {
    // 尝试前 100 条, 检查文件是否存在
    const ids: number[] = [];
    for (let i = 0; i < 100; i++) {
      try {
        const resp = await fetch(`${DATA_BASE}/${model}_${i}_gt.txt`, { method: 'HEAD' });
        if (resp.ok) ids.push(i);
      } catch {
        break;
      }
    }
    return ids;
  }

  async getTrajectory(model: ModelType, id: number): Promise<FlightData | null> {
    try {
      const [gtPoints, predPoints, rmse] = await Promise.all([
        this.loadPoints(model, id, 'gt'),
        this.loadPoints(model, id, 'pred'),
        this.loadRmse(model, id),
      ]);
      if (gtPoints.length === 0) return null;
      return { model, id, groundTruth: gtPoints, prediction: predPoints, rmse };
    } catch {
      return null;
    }
  }

  private async loadPoints(model: ModelType, id: number, suffix: 'gt' | 'pred'): Promise<TrajectoryPoint[]> {
    const resp = await fetch(`${DATA_BASE}/${model}_${id}_${suffix}.txt`);
    if (!resp.ok) return [];
    const text = await resp.text();
    return text
      .trim()
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [t, lon, lat] = line.trim().split(/\s+/).map(Number);
        return { t, lon, lat };
      })
      .filter(p => !isNaN(p.t) && !isNaN(p.lon) && !isNaN(p.lat));
  }

  private async loadRmse(model: ModelType, id: number): Promise<RmseMetrics | null> {
    try {
      const resp = await fetch(`${DATA_BASE}/${model}_${id}_rmse.txt`);
      if (!resp.ok) return null;
      const text = await resp.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) return null;
      const [rmse_total, rmse_temporal, rmse_spatial, mape_total, mape_temporal, mape_spatial] =
        lines[1].trim().split(/\s+/).map(Number);
      return {
        rmseTotal: rmse_total,
        rmseTemporal: rmse_temporal,
        rmseSpatial: rmse_spatial,
        mapeTotal: mape_total,
        mapeTemporal: mape_temporal,
        mapeSpatial: mape_spatial,
      };
    } catch {
      return null;
    }
  }

  /** 批量加载多条轨迹用于对比分析 */
  async loadBatch(model: ModelType, ids: number[]): Promise<FlightData[]> {
    const results = await Promise.all(ids.map(id => this.getTrajectory(model, id)));
    return results.filter((d): d is FlightData => d !== null);
  }
}

/** 全局数据加载器实例 */
export const flightDataLoader = new LocalFileDataSource();
