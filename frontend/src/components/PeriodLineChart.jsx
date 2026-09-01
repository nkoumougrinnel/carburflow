import React, { useMemo } from 'react'
import {
  Area,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts'
import { useChartPalette } from '@/hooks/useChartPalette.js'
import { seriesPointRadius } from '@/utils/chartAxis.js'

function KindDot({ cx, cy, payload, color, radius }) {
  if (cx == null || cy == null) return null
  const kind = payload?.kind
  if (kind === 'missing') return null
  if (kind === 'infinite') {
    return (
      <g>
        <polygon
          points={`${cx},${cy - 7} ${cx - 6},${cy + 5} ${cx + 6},${cy + 5}`}
          fill="#b91c1c"
          stroke="#7f1d1d"
        />
        <text
          x={cx}
          y={cy - 12}
          textAnchor="middle"
          fill="#b91c1c"
          fontSize={11}
          fontWeight="bold"
        >
          ∞
        </text>
      </g>
    )
  }
  return <circle cx={cx} cy={cy} r={radius} fill={color} stroke={color} />
}

function PeriodLineChart({
  data = [],
  labels = [],
  fullLabels,
  color = '#0b3d7a',
  fill = true,
  unit = '',
  yBeginZero = false,
  suggestedMax,
  pointKinds,
  strokeWidth = 2,
}) {
  const palette = useChartPalette()
  const rows = useMemo(
    () => labels.map((label, index) => ({
      label,
      fullLabel: (fullLabels || labels)[index] ?? label,
      value: data[index] ?? null,
      kind: pointKinds?.[index] || 'normal',
    })),
    [data, labels, fullLabels, pointKinds],
  )
  const radius = seriesPointRadius(labels.length)
  const yDomain = suggestedMax != null
    ? [yBeginZero ? 0 : 'auto', suggestedMax]
    : (yBeginZero ? [0, 'auto'] : ['auto', 'auto'])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={palette.grid} vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fill: palette.text, fontSize: 11 }}
          axisLine={{ stroke: palette.grid }}
          tickLine={false}
          interval={0}
        />
        <YAxis
          tick={{ fill: palette.text, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={56}
          domain={yDomain}
          tickFormatter={(value) => Number(value).toLocaleString('fr-FR')}
        />
        <Tooltip
          contentStyle={{
            background: 'var(--panel)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            color: 'var(--text)',
          }}
          labelFormatter={(_, payload) => payload?.[0]?.payload?.fullLabel || ''}
          formatter={(value, _name, item) => {
            const kind = item?.payload?.kind
            if (kind === 'infinite') return ['∞ L/h (conso sans heures)', '']
            if (value == null || !Number.isFinite(Number(value))) return ['—', '']
            const formatted = Number(value).toLocaleString('fr-FR')
            return [unit ? `${formatted} ${unit}` : formatted, '']
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={strokeWidth}
          fill={fill ? `${color}22` : 'transparent'}
          connectNulls={false}
          isAnimationActive={false}
          dot={(props) => (
            <KindDot
              {...props}
              color={color}
              radius={radius}
            />
          )}
          activeDot={{ r: Math.max(radius, 4) + 2, stroke: color, fill: color }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export default PeriodLineChart
