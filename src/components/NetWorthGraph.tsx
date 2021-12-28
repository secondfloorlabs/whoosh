import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { XAxis, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { displayInUSD } from 'src/utils/helpers';
import Loading from 'src/components/Loading';
import { isAfter, sub } from 'date-fns';
import { isMobile } from 'react-device-detect';

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
    setGraphData(newGraphData);
  }, [tokens]);

  return (
    <div className={isMobile ? "portfolioChartMobile1": "portfolioChart1"}>
      {graphData.length === 0 ? (
        <Loading text={'Graph Loading...'} />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          {/* <LineChart
              width={500}
              height={300}
              data={graphData}
              margin={{
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" tickFormatter={(value, index) => {
                return new Date(value * 1000).toLocaleDateString();
              }} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="linear" dataKey="worth" stroke="#8884d8" strokeWidth={3} activeDot={{ r: 8 }} />
              <Line type="linear" dataKey="uv" stroke="#82ca9d" />
            </LineChart> */}
          <AreaChart
            height={380}
            data={graphData}
            margin={
              {
                // left: 35
              }
            }
          >
            <defs>
              <linearGradient id="netWorth" x1="0" y1="0" x2="0" y2="15">
                <stop offset="5%" stopColor="#8884d8" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
              </linearGradient>
              {/* Iceberg one LOL */}
              {/* <linearGradient id="netWorth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#0075FF" stopOpacity={0.9} />
                <stop offset="35%" stopColor="#00000" stopOpacity={0.5} />
              </linearGradient> */}
            </defs>

            <XAxis
              dataKey="timestamp"
              tickFormatter={(value, index) => {
                return new Date(value * 1000).toLocaleDateString();
              }}
            />
            {/* <YAxis
              tickFormatter={(value, index) => {
                return `${displayInUSD(value)}`;
              }}
            /> */}
            <Tooltip
              viewBox={{ x: 0, y: 0, width: 100, height: 100 }}
              formatter={(value: any) => {
                return [`${displayInUSD(value)}`, 'Net Worth'];
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
