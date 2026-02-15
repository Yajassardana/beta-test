import { Exchange, ScenarioConfig } from "./types";

export interface ChartDataPoint {
  exchange: number;
  label: string;
  emotionalState: number;
}

export interface ExchangeDelta {
  exchangeIndex: number;
  emotionalStateDelta: number;
}

export function buildChartData(
  exchanges: Exchange[],
  scenario: ScenarioConfig
): ChartDataPoint[] {
  const points: ChartDataPoint[] = [
    {
      exchange: 0,
      label: "Start",
      emotionalState: scenario.opening_emotional_state,
    },
  ];

  for (let i = 0; i < exchanges.length; i++) {
    const r = exchanges[i].child_response;
    points.push({
      exchange: i + 1,
      label: `Exchange ${i + 1}`,
      emotionalState: r.emotional_state,
    });
  }

  return points;
}

export function computeExchangeDeltas(
  exchanges: Exchange[],
  scenario: ScenarioConfig
): ExchangeDelta[] {
  return exchanges.map((ex, i) => {
    const prev =
      i === 0
        ? scenario.opening_emotional_state
        : exchanges[i - 1].child_response.emotional_state;
    return {
      exchangeIndex: i,
      emotionalStateDelta: ex.child_response.emotional_state - prev,
    };
  });
}
