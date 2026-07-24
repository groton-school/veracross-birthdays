import createClient from 'openapi-fetch';
import type { Veracross as VC } from '@oauth2-cli/veracross';
import { access_token, credentials } from './OAuth.js';

export const v3 = createClient<VC.Types.spec.DataAPI.paths>({
  baseUrl: `https://api.veracross.com/${credentials().school_route}/v3`
});
v3.use({
  onRequest: async ({ request }) => {
    request.headers.set('Authorization', `Bearer ${await access_token()}`);
    return request;
  }
});
