import 'src/App.css';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';

import Metamask from 'src/components/accounts/Metamask';
import Solana from 'src/components/accounts/Solana';
import Coinbase from 'src/components/accounts/Coinbase';
import WhooshNavbar from 'src/components/WhooshNavbar';
import Assets from 'src/components/Assets';
import { displayInUSD } from 'src/utils/helpers';
import NetWorthGraph from './components/NetWorthGraph';

function App() {
  useEffect(() => {
    document.body.style.backgroundColor = '#151629';
  }, []);

  const wallets = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [usdDifference, setUsdDifference] = useState<number>(0);
  const [percentDifference, setPercentDifference] = useState<number>(0);

  useEffect(() => {
    const total = wallets.reduce(
      (acc, curr) => (curr.balance && curr.price ? acc + curr.balance * curr.price : acc),
      0
    );

    const lastTotal = wallets.reduce(
      (acc, curr) => (curr.balance && curr.lastPrice ? acc + curr.balance * curr.lastPrice : acc),
      0
    );

    console.log(total);
    console.log(lastTotal);
    // console.log((total-lastTotal);
    setUsdDifference(total - lastTotal);
    setPercentDifference(((total - lastTotal) / lastTotal) * 100);
    setTotalBalance(total);
  }, [wallets]);

  return (
    <div className="App">
      <WhooshNavbar />
      <Container style={{ marginTop: '20px' }}>
        <Row>
          <h1>
            {displayInUSD(totalBalance)}{' '}
            <span className="balancePercentage">{`${displayInUSD(
              usdDifference
            )} (${percentDifference.toFixed(2)}%) `}</span>
          </h1>
        </Row>
        <Row>
          <Col xl={8}>
            <NetWorthGraph />
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
    </div>
  );
}

export default App;
