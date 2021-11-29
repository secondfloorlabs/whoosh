import React, { useState } from 'react';
import Metamask from 'src/components/Metamask';
import Solana from 'src/components/Solana';

import 'src/App.css';

function App() {
  return (
    <div className="App">
      <Metamask />
      <br />
      <Solana />
    </div>
  );
}

export default App;
