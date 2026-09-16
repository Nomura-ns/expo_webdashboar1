// usePlcSignalUtils.ts
//
// usePlcJobFlowSignals / usePlcOperationMetricsSignals /
// usePlcRobotStatusSignals で共通して使う
// PLCデータ読み取り用のユーティリティ。
//
// 1ワードの読み取りと、
// 2ワード（32bit signed integer）の読み取りをここで共通化する。

import type { DataPoint } from '../types'

import { addressToDataKey } from '../plc'

/**
 * DataPoint[] の末尾（最新の1点）を取得する。
 */
export function getLatestDataPoint(
  data: DataPoint[],
): DataPoint | undefined {
  return data[data.length - 1]
}

/**
 * DataPoint（1時刻分のスナップショット）から、
 * 1ワードのアドレス値を数値として取り出す。
 *
 * 値が存在しない / 数値でない場合は 0 を返す。
 */
export function readAddress(
  point: DataPoint | undefined,
  address: string | number,
): number {
  const numAddress =
    typeof address === 'string'
      ? Number(address)
      : address

  const value = point?.[addressToDataKey(numAddress)]

  return typeof value === 'number' ? value : 0
}

/**
 * 2ワード（32bit signed integer）の値を読む。
 *
 * 例：
 *
 * D15100 = 下位16bit
 * D15101 = 上位16bit
 *
 * → D15100～D15101 を
 *   1つの32bit符号付き整数として扱う。
 *
 * ※ 2ワードの先頭アドレスを渡す。
 */
export function read2WordSignedAddress(
  point: DataPoint | undefined,
  address: string | number,
): number {
  const numAddress =
    typeof address === 'string'
      ? Number(address)
      : address

  const low = point?.[addressToDataKey(numAddress)]
  const high = point?.[addressToDataKey(numAddress + 1)]

  if (
    typeof low !== 'number' ||
    typeof high !== 'number'
  ) {
    return 0
  }

  // 各ワードを16bitとして扱う
  const low16 = low & 0xffff
  const high16 = high & 0xffff

  // 下位16bit + 上位16bit → 32bit
  const unsigned =
    high16 * 0x10000 +
    low16

  // 32bit signed integer に変換
  if (unsigned >= 0x80000000) {
    return unsigned - 0x100000000
  }

  return unsigned
}

/**
 * readAddress の undefined 許容版。
 *
 * 「値がまだ来ていない」ことを
 * 0 と明示的に区別したい場合に使用する。
 */
export function readAddressOrUndefined(
  point: DataPoint | undefined,
  address: string | number,
): number | undefined {
  const numAddress =
    typeof address === 'string'
      ? Number(address)
      : address

  const value = point?.[addressToDataKey(numAddress)]

  return typeof value === 'number'
    ? value
    : undefined
}