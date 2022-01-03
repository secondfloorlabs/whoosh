import { Table, Dropdown } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import {
  capitalizeFirstLetter,
  displayInPercent,
  displayInUSD,
  imageOnErrorHandler,
} from 'src/utils/helpers';
import * as translations from 'src/utils/translations';
import { isMobile } from 'react-device-detect';
import { useState } from 'react';

const Assets = () => {
  const tokens = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);
  const [radioValue, setRadioValue] = useState('Balances');

  const radios = [{ name: 'Balances' }, { name: 'Prices' }, { name: 'Allocations' }];

  function dedupeTokens(tokens: IToken[]) {
    const newTokens: IToken[] = [];
    for (let token of tokens) {
      const matchingTokenIndex = newTokens.findIndex(
        (existingToken) =>
          existingToken.name.toLowerCase() === token.name.toLowerCase() &&
          existingToken.symbol.toLowerCase() === token.symbol.toLowerCase()
      );
      if (matchingTokenIndex === -1) {
        newTokens.push(token);
      } else {
        const matchingToken = newTokens[matchingTokenIndex];
        const avgPrice =
          matchingToken.price && token.price
            ? (matchingToken.price + token.price) / 2
            : matchingToken.price
            ? matchingToken.price
            : token.price
            ? token.price
            : undefined;
        const totalBalance = token.balance + matchingToken.balance;
        newTokens[matchingTokenIndex] = {
          ...matchingToken,
          balance: totalBalance,
          price: avgPrice,
        };
      }
    }
    return newTokens;
  }

  const dedupedtokens = dedupeTokens(tokens);

  const sortedtokens = dedupedtokens.sort((a, b) => {
    if (a.price && !b.price) {
      return -1;
    } else if (!a.price && b.price) {
      return 1;
    } else {
      return a.price && b.price ? b.balance * b.price - a.balance * a.price : 1;
    }
  });

  const total = sortedtokens.reduce(
    (acc, curr) => (curr.balance && curr.price ? acc + curr.balance * curr.price : acc),
    0
  );

  const displaySymbols = (token: IToken) => {
    return (
      <td>
        <span>{capitalizeFirstLetter(token.name)}</span>
        <br></br>
        <span>
          <img
            src={`https://assets.coincap.io/assets/icons/${token.symbol.toLowerCase()}@2x.png`}
            height="16px"
            width="16px"
            onError={imageOnErrorHandler}
            alt=""
          ></img>{' '}
          <small>{token.symbol.toUpperCase()}</small>
        </span>
      </td>
    );
  };

  const displayBalances = (token: IToken) => {
    return (
      <td>
        <span>
          {token.price && token.balance
            ? displayInUSD(token.balance * token.price)
            : token.balance.toFixed(3)}
        </span>
        <br></br>
        <span>
          {Number(token.balance).toFixed(3)} {token.symbol}
        </span>
      </td>
    );
  };

  const displayPercents = (token: IToken) => {
    return (
      <td>
        <span>{token.price ? displayInUSD(token.price) : translations.noPriceFound}</span>
        <br></br>
        <span>
          <small>
            {token.price && token.lastPrice && (
              <span
                className={
                  (token.price - token.lastPrice) / token.lastPrice >= 0
                    ? 'posBalancePercent'
                    : 'negBalancePercent'
                }
                style={{ fontSize: '100%' }}
              >
                {displayInPercent((token.price - token.lastPrice) / token.lastPrice)}
              </span>
            )}
          </small>
        </span>
      </td>
    );
  };

  const displayAllocation = (token: IToken) => {
    return (
      <td>
        <span>
          {token.price && token.balance
            ? displayInPercent((token.balance * token.price) / total)
            : displayInPercent(0)}
        </span>
      </td>
    );
  };

  const AssetsDesktop = () => {
    return tokens.some((token) => token.walletName) ? (
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
          {sortedtokens &&
            sortedtokens.map((token, index) => {
              return (
                <tr key={index}>
                  {displaySymbols(token)}
                  {displayBalances(token)}
                  {displayPercents(token)}
                  {displayAllocation(token)}
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
    return tokens.some((token) => token.walletName) ? (
      <Table responsive="sm" borderless style={{ color: 'white' }}>
        <thead>
          <tr>
            <th>Assets</th>
            <th>
              <Dropdown>
                <Dropdown.Toggle variant="dark" size="sm">
                  {radioValue}
                </Dropdown.Toggle>
                <Dropdown.Menu variant="dark">
                  {radios.map((radio, idx) => (
                    <Dropdown.Item
                      size="sm"
                      key={idx}
                      id={`radio-${idx}`}
                      value={radio.name}
                      onClick={() => setRadioValue(radio.name)}
                    >
                      {radio.name}
                    </Dropdown.Item>
                  ))}
                </Dropdown.Menu>
              </Dropdown>
            </th>
          </tr>
        </thead>
        <thead>
          <tr>
            <th>Name</th>
            {radioValue === 'Balances' && <th>Balance</th>}
            {radioValue === 'Prices' && <th>Price</th>}
            {radioValue === 'Allocations' && <th>Allocations</th>}
          </tr>
        </thead>

        <tbody>
          {sortedtokens &&
            sortedtokens.map((token, index) => {
              return (
                <tr key={index}>
                  {displaySymbols(token)}
                  {radioValue === 'Balances' && displayBalances(token)}
                  {radioValue === 'Prices' && displayPercents(token)}
                  {radioValue === 'Allocations' && displayAllocation(token)}
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
