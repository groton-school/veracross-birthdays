import express from 'express';
import { calendar } from './Calendar/index.js';
import { Veracross } from './Veracross/index.js';
import { AUTHORIZE_PATH, DEFAULT_CALNAME, REDIRECT_PATH } from './Constants.js';

const app = express();

// delegate OAuth 2 authorization to Veracross
app.get(AUTHORIZE_PATH, Veracross.authorize);
app.get(REDIRECT_PATH, Veracross.handleRedirect);

// generate the birthday calendar
app.get('/', async (req, res) => {
  res.setHeader('Content-Type', 'text/calendar');
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${req.query.calName || DEFAULT_CALNAME}.ics"`
  );
  res.send(await calendar({ ...req.query }));
});

// listen to Cloud Run-defined port
app.listen(process.env.PORT);
