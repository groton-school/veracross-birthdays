import express from 'express';
import { calendar } from './Calendar/index.js';
import { Veracross } from './Veracross/index.js';
import { AUTHORIZE_PATH, DEFAULT_CALNAME, REDIRECT_PATH } from './Constants.js';
import { DateTime, Interval } from 'luxon';

const app = express();

// delegate OAuth 2 authorization to Veracross
app.get(AUTHORIZE_PATH, Veracross.authorize);
app.get(REDIRECT_PATH, Veracross.handleRedirect);

type CacheItem = {
  timestamp: DateTime;
  calendar: string | null;
};

const cache: Record<string, CacheItem> = {};

// generate the birthday calendar
app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${req.query.calName || DEFAULT_CALNAME}.ics"`
  );
  if (
    !(req.url in cache) ||
    Interval.fromDateTimes(cache[req.url].timestamp, DateTime.now()).length(
      'hours'
    ) > 6
  ) {
    cache[req.url] = {
      calendar: await calendar({ ...req.query }),
      timestamp: DateTime.now()
    };
  }
  res.send(cache[req.url].calendar);
});

// listen to Cloud Run-defined port
app.listen(process.env.PORT);
