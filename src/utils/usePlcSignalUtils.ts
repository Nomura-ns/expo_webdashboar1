// usePlcSignalUtils.ts
//
// usePlcJobFlowSignals / usePlcOperationMetricsSignals / usePlcRobotStatusSignals
// で共通して使っていた「最新DataPointの取得」「アドレスから数値を読む」処理を
// ここに統一する。各フックが個別に readAddress を実装していた重複を解消する。

import type { DataPoint } from '../types'
import { addressToDataKey } from '../plc'

/** DataPoint[] の末尾（最新の1点）を取得する */
export function getLatestDataPoint(data: DataPoint[]): DataPoint | undefined {
  return data[data.length - 1]
}

/**
 * DataPoint（1時刻分のスナップショット）から、アドレスのキーで数値を取り出す。
 * 値が存在しない/数値でない場合は 0 を返す。
 * （usePlcOperationMetricsSignals / usePlcRobotStatusSignals はこちらを使用）
 * string型のアドレスが渡された場合は number に変換してから解決する。
 */
export function readAddress(point: DataPoint | undefined, address: string | number): number {
  const numAddress = typeof address === 'string' ? Number(address) : address
  const value = point?.[addressToDataKey(numAddress)]
  return typeof value === 'number' ? value : 0
}

/**
 * readAddress の undefined 許容版。
 * 「値がまだ来ていない」ことを 0 と明示的に区別したい場合に使う。
 * （usePlcJobFlowSignals はこちらを使用）
 */
export function readAddressOrUndefined(
  point: DataPoint | undefined,
  address: string | number,
): number | undefined {
  const numAddress = typeof address === 'string' ? Number(address) : address
  const value = point?.[addressToDataKey(numAddress)]
  return typeof value === 'number' ? value : undefined
}
