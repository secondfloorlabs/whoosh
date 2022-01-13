import { Table, Dropdown, Spinner } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import {
  averageUndefinedField,
  capitalizeFirstLetter,
  displayInPercent,
  displayInUSD,
  imageOnErrorHandler,
  sumUndefinedField,
} from 'src/utils/helpers';
import { getYieldYakFarms, getYieldYakApys } from 'src/utils/yieldYak';
import * as translations from 'src/utils/translations';
import { isMobile } from 'react-device-detect';
import { useState, useEffect } from 'react';
import { calculateProfitLoss } from 'src/utils/prices';
import { isSameToken } from 'src/utils/tokens';

type MergedIToken = IToken & {
  mergedHistorical: boolean;
};

const Assets = () => {
  const currentTokenData = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);
  const historicalTokenData = useSelector<TokenState, TokenState['tokens']>(
    (state) => state.allTokens
  );
  const [radioValue, setRadioValue] = useState<string>('Balances');

  const radios = [
    { name: 'Balances' },
    { name: 'Prices' },
    { name: 'Allocations' },
    { name: 'Profit/Loss' },
  ];

  useEffect(() => {
    yieldYak(currentTokenData);
  }, [currentTokenData]);

  //TODO: clean up
  async function yieldYak(tokens: IToken[]) {
    const farms = await getYieldYakFarms();
    const apys = await getYieldYakApys();
    const arrayList = [];

    for (var i in farms) {
      var obj: any = {
        address: farms[i].address,
        name: farms[i].name,
        token0: farms[i].token0,
        token1: farms[i].token1,
        apr: 0,
        apy: 0,
      };

      if (
        apys[obj.address] !== undefined &&
        apys[obj.address].apr !== undefined &&
        apys[obj.address].apy !== undefined &&
        obj.token0 !== undefined &&
        obj.token1 !== undefined
      ) {
        const apy = apys[obj.address];
        obj['apr'] = apy.apr;
        obj['apy'] = apy.apy;
        arrayList.push(obj);
      }
    }

    for (let token in tokens) {
      const matchingTokenIndex = arrayList.findIndex(
        (existingToken) =>
          existingToken.token0.symbol.toLowerCase() === tokens[token].symbol.toLowerCase() ||
          existingToken.token1.symbol.toLowerCase() === tokens[token].symbol.toLowerCase()
      );
      if (matchingTokenIndex !== -1) {
        tokens[token]['apy'] = arrayList[matchingTokenIndex].apy;
      }
    }
  }

  function mergeToken(token1: IToken, token2: IToken): IToken {
    const avgPrice = averageUndefinedField(token1, token2, 'price');
    const avgLastPrice = averageUndefinedField(token1, token2, 'lastPrice');
    const totalBalance = token2.balance + token1.balance;
    return {
      ...token1,
      balance: totalBalance,
      price: avgPrice,
      lastPrice: avgLastPrice,
    };
  }

  function mergeHistoricalToken(token1: IToken, token2: IToken): IToken {
    const totalBalanceBought = sumUndefinedField(token1, token2, 'totalBalanceBought');
    const totalFiatBought = sumUndefinedField(token1, token2, 'totalFiatBought');
    const totalBalanceSold = sumUndefinedField(token1, token2, 'totalBalanceSold');
    const totalFiatSold = sumUndefinedField(token1, token2, 'totalFiatSold');
    return {
      ...token1,
      totalBalanceBought,
      totalFiatBought,
      totalBalanceSold,
      totalFiatSold,
    };
  }

  function dedupeTokens(tokens: IToken[]) {
    const newTokens: IToken[] = [];
    for (let token of tokens) {
      const matchingTokenIndex = newTokens.findIndex((existingToken) =>
        isSameToken(existingToken, token)
      );
      if (matchingTokenIndex === -1) {
        newTokens.push(token);
      } else {
        const matchingToken = newTokens[matchingTokenIndex];
        newTokens[matchingTokenIndex] = mergeToken(matchingToken, token);
      }
    }
    return newTokens;
  }

  function dedupeHistoricalTokens(tokens: IToken[]) {
    const newTokens: IToken[] = [];
    for (let token of tokens) {
      const matchingTokenIndex = newTokens.findIndex((existingToken) =>
        isSameToken(existingToken, token)
      );
      if (matchingTokenIndex === -1) {
        newTokens.push(token);
      } else {
        const matchingToken = newTokens[matchingTokenIndex];
        newTokens[matchingTokenIndex] = mergeHistoricalToken(matchingToken, token);
      }
    }
    return newTokens;
  }

  function mergeHistoricalTokens(tokens: IToken[], historicalTokens: IToken[]): MergedIToken[] {
    const newTokens: MergedIToken[] = [];
    for (let token of tokens) {
      const matchingTokenIndex = historicalTokens.findIndex((existingToken) =>
        isSameToken(existingToken, token)
      );
      if (matchingTokenIndex === -1) {
        newTokens.push({ ...token, mergedHistorical: false });
      } else {
        const historicalToken = historicalTokens[matchingTokenIndex];
        const mergedToken: MergedIToken = {
          ...token,
          mergedHistorical: true,
          totalBalanceBought: historicalToken.totalBalanceBought,
          totalFiatBought: historicalToken.totalFiatBought,
          totalBalanceSold: historicalToken.totalBalanceSold,
          totalFiatSold: historicalToken.totalFiatSold,
        };
        newTokens.push(mergedToken);
      }
    }
    return newTokens;
  }

  const dedupedTokens = dedupeTokens(currentTokenData);
  const dedupedHistoricalTokens = dedupeHistoricalTokens(historicalTokenData);
  const mergedTokens = mergeHistoricalTokens(dedupedTokens, dedupedHistoricalTokens);

  const sortedtokens = mergedTokens.sort((a, b) => {
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
        <span>
          {token.apy && (
            <>
              <br></br>
              <span style={{ color: '#FFF01F' }}>Earn {token.apy}% APY</span>
            </>
          )}
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

  const displayProfitLoss = (token: MergedIToken) => {
    let profitLossValue = 0;
    let profitLossRatio = 0;
    const {
      totalBalanceBought,
      totalFiatBought,
      totalBalanceSold,
      totalFiatSold,
      mergedHistorical,
    } = token;

    if (totalBalanceBought && totalFiatBought && totalBalanceSold && totalFiatSold) {
      [profitLossValue, profitLossRatio] = calculateProfitLoss(
        totalBalanceBought,
        totalFiatBought,
        totalBalanceSold,
        totalFiatSold
      );
    }

    return (
      <td>
        <span>
          {mergedHistorical ? (
            profitLossValue ? (
              displayInUSD(profitLossValue)
            ) : (
              translations.noProfitValue
            )
          ) : (
            <>
              <Spinner animation={'border'} />
            </>
          )}
        </span>
        <br></br>
        <span>
          <small>
            {profitLossValue && profitLossRatio ? (
              <span
                className={profitLossRatio >= 0 ? 'posBalancePercent' : 'negBalancePercent'}
                style={{ fontSize: '100%' }}
              >
                {displayInPercent(profitLossRatio)}
              </span>
            ) : (
              <></>
            )}
          </small>
        </span>
      </td>
    );
  };

  const AssetsDesktop = () => {
    return currentTokenData.some((token) => token.walletName) ? (
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
            <th>Profit/Loss</th>
          </tr>
        </thead>

        <tbody>
          {sortedtokens &&
            sortedtokens.map((token, index) => {
              return (
                <>
                  {token.apy !== undefined ? (
                    <tr key={index} style={{ border: '.5px dashed royalblue' }}>
                      {displaySymbols(token)}
                      {displayBalances(token)}
                      {displayPercents(token)}
                      {displayAllocation(token)}
                      {displayProfitLoss(token)}
                    </tr>
                  ) : (
                    <tr key={index}>
                      {displaySymbols(token)}
                      {displayBalances(token)}
                      {displayPercents(token)}
                      {displayAllocation(token)}
                      {displayProfitLoss(token)}
                    </tr>
                  )}
                </>
              );
            })}
        </tbody>
      </Table>
    ) : (
      <div>Connect an account to see your assets!</div>
    );
  };

  const AssetsMobile = () => {
    return currentTokenData.some((token) => token.walletName) ? (
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
            {radioValue === 'Profit/Loss' && <th>Profit/Loss</th>}
          </tr>
        </thead>

        <tbody>
          {sortedtokens &&
            sortedtokens.map((token, index) => {
              return (
                <>
                  {token.apy !== undefined ? (
                    <tr key={index} style={{ border: '2px dashed royalblue' }}>
                      {displaySymbols(token)}
                      {radioValue === 'Balances' && displayBalances(token)}
                      {radioValue === 'Prices' && displayPercents(token)}
                      {radioValue === 'Allocations' && displayAllocation(token)}
                      {radioValue === 'Profit/Loss' && displayProfitLoss(token)}
                    </tr>
                  ) : (
                    <tr key={index}>
                      {displaySymbols(token)}
                      {radioValue === 'Balances' && displayBalances(token)}
                      {radioValue === 'Prices' && displayPercents(token)}
                      {radioValue === 'Allocations' && displayAllocation(token)}
                      {radioValue === 'Profit/Loss' && displayProfitLoss(token)}
                    </tr>
                  )}
                </>
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
