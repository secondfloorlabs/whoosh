// Jan 1 2021
const startTime = 1609459200;
const intervalDays = 30;

export function getCoinGeckoTimestamps(): number[] {
  const timestamps = [];
  let currentTimestamp = startTime;
  const now = Math.floor(Date.now() / 1000);
  while (currentTimestamp <= now) {
    timestamps.push(currentTimestamp);
    console.log(currentTimestamp);
    currentTimestamp += intervalDays * 24 * 60 * 60; // add 24hrs
  }
  timestamps.push(now);
  return timestamps;
}
