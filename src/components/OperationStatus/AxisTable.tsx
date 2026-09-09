// AxisTable.tsx
//
// 軸モニタのモバイル表示用。モバイルではグラフ／ゲージが見にくいという指摘のため、
// 軸ごとの数値を表（テーブル）形式で並べる。モバイルは横幅が短いため、
// 表自体は横スクロールできるようにしてあり、縦方向は親側でスクロールを許可する想定。
//
// 表示・非表示の切替はOperationStatus.css側のメディアクエリで行う
// （モニタ幅ではこの表を非表示、モバイル幅ではAxisRowのグリッド表示を非表示にする）。

import type { AxisRowData } from './AxisRow'
import type { Theme } from '../../types'
import { WARN_COLOR } from './robotColors'

interface Props {
  rows: AxisRowData[]
  threshold: number
  rb1Color: string
  rb2Color: string
  theme: Theme
}

export default function AxisTable({ rows, threshold, rb1Color, rb2Color, theme }: Props) {
  return (
    <div className="axis-table-scroll">
      <table className="axis-table">
        <thead>
          <tr>
            <th style={{ color: theme.subtext, borderColor: theme.border }}>軸</th>
            <th style={{ color: rb1Color, borderColor: theme.border }}>RB1 速度</th>
            <th style={{ color: rb1Color, borderColor: theme.border }}>RB1 トルク（ピーク）</th>
            <th style={{ color: rb2Color, borderColor: theme.border }}>RB2 速度</th>
            <th style={{ color: rb2Color, borderColor: theme.border }}>RB2 トルク（ピーク）</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rb1Warn = row.rb1.torquePeak >= threshold || row.rb1.speed >= threshold
            const rb2Warn = row.rb2.torquePeak >= threshold || row.rb2.speed >= threshold
            return (
              <tr key={row.axis}>
                <td
                  className="axis-table__label"
                  style={{ color: theme.text, borderColor: theme.border }}
                >
                  {row.axisLabel ?? `軸${row.axis}`}
                </td>
                <td style={{ color: rb1Warn ? WARN_COLOR : theme.text, borderColor: theme.border }}>
                  {row.rb1.speed}%
                </td>
                <td style={{ color: rb1Warn ? WARN_COLOR : theme.text, borderColor: theme.border }}>
                  {row.rb1.torqueValue}%（ピーク{row.rb1.torquePeak}%）
                </td>
                <td style={{ color: rb2Warn ? WARN_COLOR : theme.text, borderColor: theme.border }}>
                  {row.rb2.speed}%
                </td>
                <td style={{ color: rb2Warn ? WARN_COLOR : theme.text, borderColor: theme.border }}>
                  {row.rb2.torqueValue}%（ピーク{row.rb2.torquePeak}%）
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
