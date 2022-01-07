import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { displayInUSD } from 'src/utils/helpers';
import Loading from 'src/components/Loading';
import { isMobile } from 'react-device-detect';
import { isAfter, sub } from 'date-fns';

interface DataPoint {
  timestamp: number;
  worth: number;
}

interface NetWorthGraphProps {
  currentBalance: number;
}

export default function NetWorthGraph(props: NetWorthGraphProps) {
  const [graphData, setGraphData] = useState<DataPoint[]>([]);
  const tokens = useSelector<TokenState, TokenState['allTokens']>((state) => state.allTokens);

  useEffect(() => {
    const allData: { [timestamp: number]: number } = {};
    tokens.forEach((token) => {
      const historicalWorth = token.historicalWorth;
      if (historicalWorth) {
        historicalWorth.forEach((worth) => {
          const currentWorth = allData[worth.timestamp] ?? 0;

          // coingecko data may not be updated within 8 hours
          if (isAfter(Number(worth.timestamp), sub(new Date(), { days: 1 }).getTime() / 1000)) {
            return;
          }

          allData[worth.timestamp] = currentWorth + worth.worth;
        });
      }
    });
    const newGraphData: DataPoint[] = [];
    for (const [timestamp, worth] of Object.entries(allData)) {
      newGraphData.push({ timestamp: +timestamp, worth });
    }
    newGraphData.push({ timestamp: Date.now() / 1000, worth: props.currentBalance });
    setGraphData(newGraphData);
  }, [tokens, props.currentBalance]);

  return (
    <div className={isMobile ? 'portfolioChartMobile1' : 'portfolioChart1'}>
      {graphData.length <= 1 ? (
        <Loading text={'Graph Loading...'} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart margin={{ left: -5, right: -5 }} height={380} data={graphData}>
            <defs>
              <linearGradient id="netWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>

            <XAxis hide dataKey="timestamp" />
            <YAxis
              hide
              dataKey="worth"
              domain={[(dataMin: number) => dataMin * 0.9, (dataMax: number) => dataMax * 1.1]}
            />
            <Tooltip
              itemStyle={{ backgroundColor: '#181A1B' }}
              wrapperStyle={{ backgroundColor: '#181A1B' }}
              contentStyle={{ backgroundColor: '#181A1B' }}
              viewBox={{ x: 0, y: 0, width: 100, height: 100 }}
              formatter={(value: any) => {
                return [`${displayInUSD(value)}`, 'Net Worth'];
              }}
              labelFormatter={(timestamp) => {
                return new Date(timestamp * 1000).toLocaleDateString();
              }}
            />
            <Area
              type="linear"
              dataKey="worth"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#netWorth)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
