import 'src/App.css';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

import Metamask from 'src/components/accounts/Metamask';
import Solana from 'src/components/accounts/Solana';
import Coinbase from 'src/components/accounts/Coinbase';
import WhooshNavbar from 'src/components/WhooshNavbar';
import Assets from 'src/components/Assets';
import Loading from 'src/components/Loading';

import { displayInPercent, displayInUSD } from 'src/utils/helpers';

const firebaseConfig = {
  apiKey: 'AIzaSyCG4yu4fHJMv3T7wFVrgzZ9F6qPqAWr_2M',
  authDomain: 'whooshwallet.firebaseapp.com',
  projectId: 'whooshwallet',
  storageBucket: 'whooshwallet.appspot.com',
  messagingSenderId: '364830006127',
  appId: '1:364830006127:web:df52d65322e4d7251fa69a',
  measurementId: 'G-E7KDF2T4KM',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

logEvent(analytics, 'screen_view');

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

function App() {
  useEffect(() => {
    document.body.style.backgroundColor = '#151629';
  }, []);

  const wallets = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [usdDifference, setUsdDifference] = useState<number>(0);
  const [percentDifference, setPercentDifference] = useState<number>(0);
  const [loading, setLoading] = useState<Boolean>(true);

  useEffect(() => {
    const total = wallets.reduce(
      (acc, curr) => (curr.balance && curr.price ? acc + curr.balance * curr.price : acc),
      0
    );

    const lastTotal = wallets.reduce(
      (acc, curr) => (curr.balance && curr.lastPrice ? acc + curr.balance * curr.lastPrice : acc),
      0
    );

    setUsdDifference(total - lastTotal);
    setPercentDifference(lastTotal ? (total - lastTotal) / lastTotal : 0);
    setTotalBalance(total);

    setLoading(false);
  }, [wallets]);

  return (
    <div className="App">
      <WhooshNavbar />
      {loading ? (
        <Container style={{ marginTop: '20px' }}>
          <Loading />
        </Container>
      ) : (
        <Container style={{ marginTop: '20px' }}>
          <Row>
            <h1>
              {displayInUSD(totalBalance)}{' '}
              <span className={usdDifference >= 0 ? 'posBalancePercent' : 'negBalancePercent'}>
                {`${usdDifference >= 0 ? `↑` : `↓`}`}
                {`${displayInUSD(usdDifference)}`} {`(${displayInPercent(percentDifference)})`}{' '}
              </span>
            </h1>
          </Row>
          <Row>
            <Col xl={8}>
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
            </Col>
            <Col xl={4}>
              <div className="portfolioChart2">
                <p> Wallets + Exchanges </p>
                <Metamask />
                <br />
                <Solana />
                <br />
                <Coinbase />
              </div>
            </Col>
          </Row>
          <Row>
            <Col xl={8}>
              <Assets />
            </Col>
            <Col xl={4}>
              <div className="portfolioChart4">
                <p> Recent Transactions </p>
                <p>⬇️ Deposit</p>
              </div>
            </Col>
          </Row>
        </Container>
      )}
    </div>
  );
}

export default App;
