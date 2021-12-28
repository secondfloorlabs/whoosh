import 'src/App.css';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';
import { initializeApp } from 'firebase/app';
import { getAnalytics, logEvent } from 'firebase/analytics';

import Accounts from 'src/components/accounts/Accounts';
import WhooshNavbar from 'src/components/WhooshNavbar';
import Assets from 'src/components/Assets';
import Transactions from 'src/components/Transactions';
import NetWorthGraph from 'src/components/NetWorthGraph';
import Loading from 'src/components/Loading';
import NetWorthNumber from 'src/components/NetWorthNumber';

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

    const usdDifference = total - lastTotal;
    const percentDifference = lastTotal ? (total - lastTotal) / lastTotal : 0;

    setUsdDifference(usdDifference);
    setPercentDifference(percentDifference);
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
            <NetWorthNumber
              totalBalance={totalBalance}
              usdDifference={usdDifference}
              percentDifference={percentDifference}
            />
          </Row>
          <Row>
            <Col xl={8}>
              <NetWorthGraph />
              <Assets />
            </Col>
            <Col xl={4}>
              <Accounts />
              <Transactions />
            </Col>
          </Row>
          {/* <Row>
            <Col xl={8}>
            </Col>
            <Col xl={4}>
            </Col>
          </Row> */}
        </Container>
      )}
    </div>
  );
}

export default App;
