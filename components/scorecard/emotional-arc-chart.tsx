"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceArea,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartDataPoint } from "@/lib/scorecard-utils";

interface EmotionalArcChartProps {
  data: ChartDataPoint[];
}

function CustomTooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; name: string; color: string }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-base border-2 border-border bg-secondary-background p-2 shadow-shadow">
      <p className="text-xs font-heading">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-xs" style={{ color: entry.color }}>
          {entry.name}: {entry.value}
        </p>
      ))}
    </div>
  );
}

export function EmotionalArcChart({ data }: EmotionalArcChartProps) {
  return (
    <Card className="gap-0 py-0 overflow-hidden">
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Emotional Arc</CardTitle>
      </CardHeader>
      <CardContent className="px-2 pb-3">
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={data} margin={{ top: 10, right: 40, bottom: 5, left: 0 }}>
            {/* Zone backgrounds */}
            <ReferenceArea y1={0} y2={3} fill="var(--danger)" fillOpacity={0.06} />
            <ReferenceArea y1={3} y2={7} fill="var(--warning)" fillOpacity={0.06} />
            <ReferenceArea y1={7} y2={10} fill="var(--success)" fillOpacity={0.06} />

            {/* Zone boundary lines */}
            <ReferenceLine y={3} stroke="var(--danger)" strokeDasharray="3 3" strokeOpacity={0.3} />
            <ReferenceLine y={7} stroke="var(--success)" strokeDasharray="3 3" strokeOpacity={0.3} />

            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
              axisLine={{ stroke: "var(--border)", strokeWidth: 1 }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 10]}
              ticks={[0, 3, 7, 10]}
              tick={{ fontSize: 10, fill: "var(--text-secondary)" }}
              axisLine={{ stroke: "var(--border)", strokeWidth: 1 }}
              tickLine={false}
              width={30}
            />
            <Tooltip content={<CustomTooltipContent />} />

            {/* Emotional state line */}
            <Line
              type="monotone"
              dataKey="emotionalState"
              name="Emotional State"
              stroke="var(--chart-1)"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "var(--chart-1)", stroke: "#fff", strokeWidth: 1.5 }}
              activeDot={{ r: 5, stroke: "var(--chart-1)", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>

        {/* Zone labels */}
        <div className="flex items-center justify-center gap-6 pt-1">
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-danger opacity-60" />
            Distressed (0-3)
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-warning opacity-60" />
            Wary (3-7)
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-text-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-success opacity-60" />
            Opening (7-10)
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
