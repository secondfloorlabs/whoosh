// Jan 1 2021
const startTime = 1637539200; // Mon Nov 22 2021 00:00:00 GMT+0000
const intervalDays = 1;

export function getCoinGeckoTimestamps(): number[] {
  const timestamps = [];
  let currentTimestamp = startTime;
  const now = Math.floor(Date.now() / 1000);
  while (currentTimestamp <= now) {
    timestamps.push(currentTimestamp);
    currentTimestamp += intervalDays * 24 * 60 * 60; // add 24hrs
  }
  timestamps.push(now);
  return timestamps;
}
