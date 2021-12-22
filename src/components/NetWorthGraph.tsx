import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DataPoint {
  timestamp: number;
  worth: number;
}

// hardcoded data for testing
const data = [
  {
    timestamp: 1,
    worth: 2400,
  },
  {
    timestamp: 2,
    worth: 1398,
  },
  {
    timestamp: 3,
    worth: 9800,
  },
  {
    timestamp: 4,
    worth: 3908,
  },
];

export default function NetWorthGraph() {
  const [graphData, setGraphData] = useState<DataPoint[]>([]);
  const tokens = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);

  useEffect(() => {
    console.log('tokens');
    // console.log(tokens);
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
    console.log(newGraphData);
    setGraphData(newGraphData);
  }, [tokens]);

  return (
    <div className="portfolioChart1">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          height={380}
          data={graphData}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
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
          <XAxis dataKey="timestamp" />
          <Tooltip />
          {/* <Area type="monotone" dataKey="uv" stroke="#8884d8" fillOpacity={1} fill="url(#colorUv)" /> */}
          <Area
            type="monotone"
            dataKey="worth"
            stroke="#8884d8"
            fillOpacity={1}
            fill="url(#colorPv)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
