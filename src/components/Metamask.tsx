import { useState } from 'react';
import Web3 from 'web3';

const Metamask = () => {
  const [web3Enabled, setWeb3Enabled] = useState(false);
  const [ethBalance, setEthBalance] = useState(0);

  let web3: Web3 = new Web3();
  const ethEnabled = async () => {
    if (typeof window.ethereum !== 'undefined') {
      // Instance web3 with the provided information from the MetaMask provider information
      web3 = new Web3(window.ethereum);
      try {
        // Request account access
        await window.ethereum.enable();

        return true;
      } catch (e) {
        // User denied access
        return false;
      }
    }

    return false;
  };

  const onClickConnect = async () => {
    if (await !ethEnabled()) {
      alert('Please install MetaMask to use this dApp!');
    }

    // setWeb3Enabled(true);

    const accs = await web3.eth.getAccounts();
    console.log(accs);

    const ethValue = await web3.eth.getBalance('0x3dCb690313ACd03C80D347c0a75d5be3F11dBFeA');

    setEthBalance(parseInt(ethValue, 10));
  };

  return (
    <div className="App">
      <div className="actions">
        {!web3Enabled && <button onClick={onClickConnect}>Connect Metamask</button>}
      </div>

      {ethBalance ? <div>Eth Value: {ethBalance}</div> : <div>No ETH in Metamask</div>}

      <br />
    </div>
  );
};

export default Metamask;
