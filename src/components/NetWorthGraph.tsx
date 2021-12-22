import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

// hardcoded data for testing
const data = [
  {
    name: '11.26.2021',
    uv: 4000,
    pv: 2400,
    amt: 2400,
  },
  {
    name: '11.27.2021',
    uv: 3000,
    pv: 1398,
    amt: 2210,
  },
  {
    name: '11.28.2021',
    uv: 2000,
    pv: 9800,
    amt: 2290,
  },
  {
    name: '11.29.2021',
    uv: 2780,
    pv: 3908,
    amt: 2000,
  },
];

export default function NetWorthGraph() {
  const tokens = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);

  useEffect(() => {
    // console.log(tokens);
  }, [tokens]);

  return (
    <div className="portfolioChart1">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          width={800}
          height={380}
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          {/* <CartesianGrid strokeDasharray="3 3" /> */}
          <XAxis dataKey="name" />
          {/* <YAxis /> */}
          <Tooltip />
          {/* <Legend /> */}
          <Line type="monotone" dataKey="pv" stroke="green" activeDot={{ r: 8 }} />
          {/* <Line type="monotone" dataKey="uv" stroke="#82ca9d" /> */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
