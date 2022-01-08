import 'src/App.css';
import { useContext, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { Container, Row, Col } from 'react-bootstrap';

import Accounts from 'src/components/accounts/Accounts';
import WhooshNavbar from 'src/components/WhooshNavbar';
import Assets from 'src/components/Assets';
import NetWorthGraph from 'src/components/NetWorthGraph';
import Loading from 'src/components/Loading';
import NetWorthNumber from 'src/components/NetWorthNumber';

import { logEvent } from 'firebase/analytics';
import { analytics } from 'src/services/firebase';
import { Mixpanel } from 'src/utils/mixpanel';
import { AuthContext } from 'src/context/AuthContext';

function App() {
  const wallets = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [usdDifference, setUsdDifference] = useState<number>(0);
  const [percentDifference, setPercentDifference] = useState<number>(0);
  const [loading, setLoading] = useState<Boolean>(true);
  const user = useContext(AuthContext);

  useEffect(() => {
    document.body.style.backgroundColor = '#151629';
    logEvent(analytics, 'screen_view');
    Mixpanel.identify();
    Mixpanel.track('Site Visited');
  }, []);

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
    if (user === undefined) {
      // user not logged in
      Mixpanel.track('Loaded assets', {
        currentTotal: total,
        lastTotal: lastTotal,
        percentDiff: percentDifference,
        firebaseSignIn: false,
      });
      setLoading(false);
    } else if (user === null) {
      // loading firebase auth
    } else {
      // firebase user logged in
      Mixpanel.track('Loaded assets', {
        currentTotal: total,
        lastTotal: lastTotal,
        percentDiff: percentDifference,
        firebaseSignIn: true,
      });
      setLoading(false);
    }
  }, [wallets, user]);

  return (
    <div className="App">
      <WhooshNavbar />
      {loading ? (
        <Container style={{ marginTop: '0.4vw' }}>
          <Loading />
        </Container>
      ) : (
        <Container style={{ marginTop: '0.4vw' }}>
          <Row>
            <NetWorthNumber
              totalBalance={totalBalance}
              usdDifference={usdDifference}
              percentDifference={percentDifference}
            />
          </Row>
          <Row>
            <Col xl={8}>
              <NetWorthGraph currentBalance={totalBalance} />
              <Assets />
            </Col>
            <Col xl={4}>
              <Accounts />
              {/* <Transactions /> */}
            </Col>
          </Row>
        </Container>
      )}
      <div style={{ textAlign: 'center' }}>
        © 2022 Whoosh. All rights reserved.{' '}
        <a
          href="https://forms.gle/tujpXpGZwQCipSZ79"
          target="_blank"
          rel="noreferrer"
          style={{ textDecoration: 'none' }}
        >
          Feedback
        </a>
      </div>
    </div>
  );
}

export default App;
