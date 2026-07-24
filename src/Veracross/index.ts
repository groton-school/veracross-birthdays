import { v3 } from './v3.js';
import { authorize, handleRedirect } from './OAuth.js';
import { getAll } from './getAll.js';

export { Data } from './getAll.js';

/** The Veracross Data API, including OAuth 2.0 authorization code flow handlers */
export const Veracross = { v3, authorize, handleRedirect, getAll };
