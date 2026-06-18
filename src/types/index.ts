// ============================================================
// 数据接口定义 — 飞行轨迹可视化系统
// ============================================================

/** 单个轨迹点 */
export interface TrajectoryPoint {
  /** 相对时间 (小时, 浮点) */
  t: number;
  /** 经度 */
  lon: number;
  /** 纬度 */
  lat: number;
}

/** 轨迹元数据 */
export interface TrajectoryMeta {
  model: ModelType;
  id: number;
  numPoints: number;
}

/** 一条完整轨迹 (含元数据) */
export interface Trajectory {
  meta: TrajectoryMeta;
  points: TrajectoryPoint[];
}

/** RMSE 指标 */
export interface RmseMetrics {
  rmseTotal: number;
  rmseTemporal: number;
  rmseSpatial: number;
  mapeTotal: number;
  mapeTemporal: number;
  mapeSpatial: number;
}

/** 单条轨迹的完整数据集 */
export interface FlightData {
  model: ModelType;
  id: number;
  groundTruth: TrajectoryPoint[];
  prediction: TrajectoryPoint[];
  rmse: RmseMetrics | null;
}

/** 支持的模型类型 */
export type ModelType = 'LSTM' | 'GRU' | 'RNN' | 'DSTPP';

/** 所有模型配置 */
export const MODELS: ModelType[] = ['LSTM', 'GRU', 'RNN', 'DSTPP'];

// ============================================================
// 地图相关接口
// ============================================================

/** 地图点位标记 */
export interface MapMarker {
  id: string;
  lon: number;
  lat: number;
  label: string;
  color?: [number, number, number, number];
  radius?: number;
}

/** 地图配置 */
export interface MapConfig {
  center: [number, number]; // [lon, lat]
  zoom: number;
  style: string;
}

// ============================================================
// 数据加载器接口 — 用于扩展外部数据源
// ============================================================

/**
 * 数据源接口
 * 实现此接口可从不同来源加载飞行数据
 */
export interface FlightDataSource {
  /** 获取支持的模型列表 */
  getModels(): Promise<ModelType[]>;
  /** 获取指定模型和编号的轨迹数据 */
  getTrajectory(model: ModelType, id: number): Promise<FlightData | null>;
  /** 获取可用的轨迹编号列表 */
  getAvailableIds(model: ModelType): Promise<number[]>;
}

/**
 * 点位数据源接口
 * 实现此接口可加载自定义地图点位
 */
export interface PointDataSource {
  /** 获取所有点位 */
  getMarkers(): Promise<MapMarker[]>;
}

// ============================================================
// EDAS 事件检测与分析系统
// ============================================================

/** EDAS 事件等级 */
export type EdasEventLevel = '一般事件' | '较大事件' | '重大事件' | '特别重大事件';

/** EDAS 事件区域 */
export type EdasRegion = 'hongkong' | 'iran' | 'ukraine';

/** EDAS 单个事件 */
export interface EdasEvent {
  /** 唯一标识 */
  id: string;
  /** 区域 */
  region: EdasRegion;
  /** 日期 (YYYY-MM-DD) */
  date: string;
  /** 事件摘要 */
  summary: string;
  /** 关键词及其权重 */
  keywords: Record<string, number>;
  /** 是否突发 */
  bursty: boolean;
  /** 事件等级 (乌克兰数据) */
  level?: EdasEventLevel;
  /** 聚类 ID (乌克兰数据) */
  cluid?: number;
  /** 地理坐标（经 geocoding 后） */
  lon: number;
  lat: number;
  /** 位置名称（从摘要提取） */
  locationName?: string;
}

/** EDAS 数据源接口 */
export interface EdasDataSource {
  /** 加载所有 EDAS 事件 */
  loadEvents(): Promise<EdasEvent[]>;
  /** 按区域筛选 */
  loadEventsByRegion(region: EdasRegion): Promise<EdasEvent[]>;
}
