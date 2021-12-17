import { Table } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { displayInPercent, displayInUSD } from 'src/utils/helpers';
import * as translations from 'src/utils/translations';
import ImageWithFallback from './ImageWithFallback';

const Assets = () => {
  const wallets = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);

  const sortedWallets = wallets.sort((a, b) =>
    a.currentPrice && b.currentPrice
      ? b.balance * b.currentPrice - a.balance * a.currentPrice
      : a.balance
  );

  const total = sortedWallets.reduce(
    (acc, curr) =>
      curr.balance && curr.currentPrice ? acc + curr.balance * curr.currentPrice : acc,
    0
  );

  return (
    <div className="portfolioChart3">
      {wallets.some((wallet) => wallet.walletName) ? (
        <Table hover borderless style={{ color: 'white' }}>
          <thead>
            <tr>
              <th>Assets</th>
            </tr>
          </thead>
          <hr />
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
              sortedWallets.map((wallet) => {
                return (
                  <tr>
                    <td key={wallet.name}>
                      <span>{wallet.name}</span>
                      <br></br>
                      <span>
                        <ImageWithFallback
                          fallback="https://images.emojiterra.com/twitter/v13.1/512px/1fa99.png"
                          src={`https://assets.coincap.io/assets/icons/${wallet.symbol.toLowerCase()}@2x.png`}
                          height="16px"
                          width="16px"
                        />{' '}
                        <small>{wallet.symbol}</small>
                      </span>
                    </td>
                    <td key={wallet.currentPrice}>
                      <span>
                        {wallet.currentPrice
                          ? displayInUSD(wallet.balance * wallet.currentPrice)
                          : wallet.balance}
                      </span>
                      <br></br>
                      <span>
                        {Number(wallet.balance).toFixed(5)} {wallet.symbol}
                      </span>
                    </td>
                    <td>
                      <span>
                        {wallet.currentPrice
                          ? displayInUSD(wallet.currentPrice)
                          : translations.noPriceFound}
                      </span>
                      <br></br>
                      <span>
                        <small>% change</small>
                      </span>
                    </td>
                    <td>
                      <span>
                        {wallet.currentPrice &&
                          displayInPercent((wallet.balance * wallet.currentPrice) / total)}
                      </span>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </Table>
      ) : (
        <div>Connect an account to see your assets!</div>
      )}
    </div>
  );
};

export default Assets;
