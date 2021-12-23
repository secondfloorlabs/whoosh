import { displayInPercent, displayInUSD } from 'src/utils/helpers';

type NetWorthNumberProps = {
  totalBalance: number;
  usdDifference: number;
  percentDifference: number;
};

const NetWorthNumber = ({
  totalBalance,
  usdDifference,
  percentDifference,
}: NetWorthNumberProps) => {
  return (
    <h1>
      {displayInUSD(totalBalance)}{' '}
      <span className={usdDifference >= 0 ? 'posBalancePercent' : 'negBalancePercent'}>
        {`${usdDifference >= 0 ? `↑` : `↓`}`}
        {`${displayInUSD(usdDifference)}`} {`(${displayInPercent(percentDifference)})`}{' '}
      </span>
    </h1>
  );
};

export default NetWorthNumber;
