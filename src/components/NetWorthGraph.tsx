import React, { useEffect, useState } from 'react';
import Spinner from 'react-bootstrap/Spinner';
import { useSelector } from 'react-redux';
import { XAxis, Tooltip, ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { displayInUSD } from 'src/utils/helpers';

interface DataPoint {
  timestamp: number;
  worth: number;
}

export default function NetWorthGraph() {
  const [graphData, setGraphData] = useState<DataPoint[]>([]);
  const tokens = useSelector<TokenState, TokenState['allTokens']>((state) => state.allTokens);

  useEffect(() => {
    const allData: { [timestamp: number]: number } = {};
    tokens.forEach((token) => {
      const historicalWorth = token.historicalWorth;
      if (historicalWorth) {
        historicalWorth.forEach((worth) => {
          const currentWorth = allData[worth.timestamp] ?? 0;
          allData[worth.timestamp] = currentWorth + worth.worth;
        });
      }
    });

    const newGraphData: DataPoint[] = [];
    for (const [timestamp, worth] of Object.entries(allData)) {
      newGraphData.push({ timestamp: +timestamp, worth });
    }
    setGraphData(newGraphData);
  }, [tokens]);

  return (
    <div className="portfolioChart1">
      {graphData.length === 0 ? (
        <>
          <span>Graph Loading...</span>
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '200px',
            }}
          >
            <Spinner animation={'border'} />
          </div>
        </>
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            height={380}
            data={graphData}
            margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorPv" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="timestamp"
              tickFormatter={(value, index) => {
                return new Date(value * 1000).toLocaleDateString();
              }}
            />
            <YAxis
              tickFormatter={(value, index) => {
                return `${displayInUSD(value)}`;
              }}
            />
            <Tooltip
              viewBox={{ x: 0, y: 0, width: 100, height: 100 }}
              formatter={(value: any) => {
                return [`${displayInUSD(value)}`, 'Net Worth'];
              }}
            />
            <Area
              type="monotone"
              dataKey="worth"
              stroke="#8884d8"
              fillOpacity={1}
              fill="url(#colorPv)"
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
