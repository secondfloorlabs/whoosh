import { useEffect } from 'react';

import { Container, Row, Col } from 'react-bootstrap';
import { LineChart, Line, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

import Metamask from 'src/components/accounts/Metamask';
import Solana from 'src/components/accounts/Solana';
import Coinbase from 'src/components/accounts/Coinbase';
import WhooshNavbar from 'src/components/WhooshNavbar';

import 'src/App.css';

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

  return (
    <div className="App">
      <WhooshNavbar />
      <Container style={{ marginTop: '69px' }}>
        <Row>
          <h1>$18,256</h1>
        </Row>
        <Row>
          <Col xl={8}>
            <div
              style={{
                padding: '20px',
                backgroundImage: 'linear-gradient(#221F3C, #363E54)',
                borderRadius: '10px',
                marginBottom: '2%',
                textAlign: 'center',
                height: '420px',
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  width={800}
                  height={400}
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
            <div
              style={{
                padding: '20px',
                backgroundImage: 'linear-gradient(#221F3C, #363E54)',
                borderRadius: '10px',
                marginBottom: '2%',
                height: '420px',
              }}
            >
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
            <h1>Assets</h1>
            <p>Solana</p>
            <p>Ethereum</p>
            <p>Bitcoin</p>
            <p>Litecoin</p>
          </Col>
        </Row>
      </Container>
    </div>
  );
}

export default App;
