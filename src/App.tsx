import Metamask from 'src/components/Metamask';
import Solana from 'src/components/Solana';
import Coinbase from 'src/components/Coinbase';

import 'src/App.css';
import { useEffect, useState } from 'react';

function App() {
  const [coinbaseCode, setCoinbaseCode] = useState('');

  useEffect(() => {
    let search = window.location.search;
    let params = new URLSearchParams(search);
    let code = params.get('code');

    if (code) {
      setCoinbaseCode(code);
    }
  }, [coinbaseCode]);

  return (
    <div className="App">
      <Metamask />
      <br />
      <Solana />
      <br />
      <Coinbase coinbaseCode={coinbaseCode} />
    </div>
  );
}

export default App;
