import { ButtonGroup, Table, ToggleButton } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { displayInPercent, displayInUSD } from 'src/utils/helpers';
import * as translations from 'src/utils/translations';
import { isMobile } from 'react-device-detect';
import { useState } from 'react';

const Assets = () => {
  const wallets = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);
  const [radioValue, setRadioValue] = useState('1');

  const radios = [
    { name: 'Balances', value: '1' },
    { name: 'Prices', value: '2' },
  ];

  const sortedWallets = wallets.sort((a, b) =>
    a.price && b.price ? b.balance * b.price - a.balance * a.price : a.balance
  );

  const total = sortedWallets.reduce(
    (acc, curr) => (curr.balance && curr.price ? acc + curr.balance * curr.price : acc),
    0
  );

  // This function is triggered if an error occurs while loading an image
  const imageOnErrorHandler = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    event.currentTarget.src = 'https://images.emojiterra.com/twitter/v13.1/512px/1fa99.png';
  };

  const displaySymbols = (wallet: IToken) => {
    return (
      <td>
        <span>{wallet.name}</span>
        <br></br>
        <span>
          <img
            src={`https://assets.coincap.io/assets/icons/${wallet.symbol.toLowerCase()}@2x.png`}
            height="16px"
            width="16px"
            onError={imageOnErrorHandler}
            alt=""
          ></img>{' '}
          <small>{wallet.symbol}</small>
        </span>
      </td>
    );
  };

  const displayBalances = (wallet: IToken) => {
    return (
      <td>
        <span>
          {wallet.price && wallet.balance
            ? displayInUSD(wallet.balance * wallet.price)
            : wallet.balance.toFixed(3)}
        </span>
        <br></br>
        <span>
          {Number(wallet.balance).toFixed(3)} {wallet.symbol}
        </span>
      </td>
    );
  };

  const displayPercents = (wallet: IToken) => {
    return (
      <td>
        <span>{wallet.price ? displayInUSD(wallet.price) : translations.noPriceFound}</span>
        <br></br>
        <span>
          <small>
            {wallet.price &&
              wallet.lastPrice &&
              displayInPercent((wallet.price - wallet.lastPrice) / wallet.lastPrice)}
          </small>
        </span>
      </td>
    );
  };

  const displayAllocation = (wallet: IToken) => {
    return (
      <td>
        <span>
          {wallet.price &&
            wallet.balance &&
            displayInPercent((wallet.balance * wallet.price) / total)}
        </span>
      </td>
    );
  };

  const AssetsDesktop = () => {
    return wallets.some((wallet) => wallet.walletName) ? (
      <Table responsive="sm" borderless style={{ color: 'white' }}>
        <thead>
          <tr>
            <th>Assets</th>
          </tr>
        </thead>
        <thead>
          <tr>
            <th>Name</th>
            <th>Balance</th>
            <th>Price</th>
            <th>Allocation</th>
          </tr>
        </thead>

        <tbody>
          {sortedWallets &&
            sortedWallets.map((wallet, index) => {
              return (
                <tr key={index}>
                  {displaySymbols(wallet)}
                  {displayBalances(wallet)}
                  {displayPercents(wallet)}
                  {displayAllocation(wallet)}
                </tr>
              );
            })}
        </tbody>
      </Table>
    ) : (
      <div>Connect an account to see your assets!</div>
    );
  };

  const AssetsMobile = () => {
    return wallets.some((wallet) => wallet.walletName) ? (
      <Table responsive="sm" borderless style={{ color: 'white' }}>
        <thead>
          <tr>
            <th>Assets</th>
            <th>
              <ButtonGroup>
                {radios.map((radio, idx) => (
                  <ToggleButton
                    size="sm"
                    key={idx}
                    id={`radio-${idx}`}
                    type="radio"
                    variant={idx % 2 ? 'outline-success' : 'outline-danger'}
                    name="radio"
                    value={radio.value}
                    checked={radioValue === radio.value}
                    onChange={(e) => setRadioValue(e.currentTarget.value)}
                  >
                    {radio.name}
                  </ToggleButton>
                ))}
              </ButtonGroup>
            </th>
          </tr>
        </thead>
        <thead>
          <tr>
            <th>Name</th>
            {radioValue === '1' && <th>Balance</th>}
            {radioValue === '2' && <th>Price</th>}
          </tr>
        </thead>

        <tbody>
          {sortedWallets &&
            sortedWallets.map((wallet, index) => {
              return (
                <tr key={index}>
                  {displaySymbols(wallet)}
                  {radioValue === '1' && displayBalances(wallet)}
                  {radioValue === '2' && displayPercents(wallet)}
                </tr>
              );
            })}
        </tbody>
      </Table>
    ) : (
      <div>Connect an account to see your assets!</div>
    );
  };

  return (
    <div className="portfolioChart3">
      {isMobile ? <div>{AssetsMobile()}</div> : <div>{AssetsDesktop()}</div>}
    </div>
  );
};

export default Assets;
