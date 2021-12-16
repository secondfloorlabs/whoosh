import { Table } from 'react-bootstrap';
import { useSelector } from 'react-redux';
import { displayInPercent, displayInUSD } from 'src/utils/helpers';
import * as translations from 'src/utils/translations';

const Assets = () => {
  const wallets = useSelector<TokenState, TokenState['tokens']>((state) => state.tokens);

  const sortedWallets = wallets.sort((a, b) =>
    a.price && b.price ? b.balance * b.price - a.balance * a.price : a.balance
  );

  const total = sortedWallets.reduce(
    (acc, curr) => (curr.balance && curr.price ? acc + curr.balance * curr.price : acc),
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
              sortedWallets.map((wallet, index) => {
                return (
                  <tr>
                    <td key={wallet.name}>
                      <span>{wallet.name}</span>
                      <br></br>
                      <span>
                        <small>{wallet.symbol}</small>
                      </span>
                    </td>
                    <td key={wallet.price}>
                      <span>
                        {wallet.price
                          ? displayInUSD(wallet.balance * wallet.price)
                          : wallet.balance}
                      </span>
                      <br></br>
                      <span>
                        {Number(wallet.balance).toFixed(5)} {wallet.symbol}
                      </span>
                    </td>
                    <td>
                      <span>
                        {wallet.price ? displayInUSD(wallet.price) : translations.noPriceFound}
                      </span>
                      <br></br>
                      <span>
                        <small>% change</small>
                      </span>
                    </td>
                    <td>
                      <span>
                        {wallet.price && displayInPercent((wallet.balance * wallet.price) / total)}
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
