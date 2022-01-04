import { sub } from 'date-fns';

/**
 * get Coingecko prior month timestamps for 12am UTC
 * @returns 30 day previous timestamps from coingecko
 */
export function getCoinGeckoTimestamps(): number[] {
  const intervalDays = 1;
  const currentUTCDate = new Date(new Date().setUTCHours(0, 0, 0, 0));
  const previousMonth = sub(currentUTCDate, { days: 31 });

  const timestamps = [];
  let currentTimestamp = previousMonth.getTime() / 1000;
  const now = Math.floor(Date.now() / 1000);
  while (currentTimestamp <= now) {
    timestamps.push(currentTimestamp);
    currentTimestamp += intervalDays * 24 * 60 * 60; // add 24hrs
  }
  timestamps.push(now);
  return timestamps;
}
