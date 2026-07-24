import { Firestore, DocumentReference } from '@google-cloud/firestore';
import { Request, Response } from 'express';
import fs from 'node:fs';
import * as OpenIDClient from 'openid-client';
import { PATH_TO_VERACROSS_CREDENTIALS } from '../Constants.js';

// Veracross OAuth configuration
interface Credentials {
  school_route: string;
  client_id: string;
  client_secret: string;
  redirect_uri: string;
  scope: string;
}
const scopes = [
  'students:list',
  'staff_faculty:list',
  'staff_faculty:read',
  'health.patients:list'
];
export function credentials(): Credentials {
  return {
    ...JSON.parse(fs.readFileSync(PATH_TO_VERACROSS_CREDENTIALS, 'utf8')),
    scope: scopes.join(' ')
  };
}
const config = OpenIDClient.discovery(
  new URL(`https://accounts.veracross.com/${credentials().school_route}`),
  credentials().client_id,
  credentials().client_secret
);
// Firestore shared refresh_token storage
interface RefreshToken {
  refresh_token: NonNullable<
    OpenIDClient.TokenEndpointResponse['refresh_token']
  >;
}
const firestore = new Firestore();
const docRef = firestore
  .collection('veracross')
  .doc('v3') as DocumentReference<RefreshToken>;
// per-instance OAuth caches
type Tokens = OpenIDClient.TokenEndpointResponse &
  OpenIDClient.TokenEndpointResponseHelpers;
interface AuthSession {
  pkceCodeVerifier: string;
  expectedState: string;
  resolver: (tokens: Tokens) => void;
}
let tokens: Tokens | undefined = undefined;
let session: AuthSession | undefined = undefined;

/**
 * Acquire an API access token
 *
 * Either use the locally cached, unexpired access token if available, or
 * request a new acess token to cache locally and use
 */
export async function access_token() {
  if (!tokens || !tokens.expiresIn()) {
    tokens = await refreshTokenGrant();
  }
  return tokens?.access_token;
}

/**
 * Acquire a new access_token using the shared refresh_token cache
 *
 * Use Firestore transaction to block other instances from the refresh_token
 * while acquiring our new access_token and storing the (possibly updated)
 * refresh_token for other instances to use
 */
async function refreshTokenGrant() {
  return await firestore.runTransaction<Tokens>(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    if (!snapshot.exists) {
      throw new Error('No authorization token available');
    }
    const data = snapshot.data() as RefreshToken;
    const tokens = await OpenIDClient.refreshTokenGrant(
      await config,
      data.refresh_token,
      { scope: credentials().scope }
    );
    data.refresh_token = tokens.refresh_token || data.refresh_token;
    transaction.set(docRef, data);
    return tokens;
  });
}

/**
 * Initiate OAuth 2.0 authorization code flow
 *
 * Open a Firestore transaction to block other instance's from accessing the
 * refresh token (that isn't yet present) while the user is interactively
 * prompted to authorize the application and redirect back to the app, where
 * {@link handleRedirect()} will finish the authorization code flow and close the
 * transaction.
 */
export async function authorize(_: Request, res: Response) {
  const state = OpenIDClient.randomState();
  const code_verifier = OpenIDClient.randomPKCECodeVerifier();
  const code_challenge =
    await OpenIDClient.calculatePKCECodeChallenge(code_verifier);
  firestore.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(docRef);
    let data: RefreshToken | undefined = undefined;
    if (snapshot.exists) {
      data = snapshot.data();
    }
    const conf = await config;
    return new Promise((resolve) => {
      session = {
        pkceCodeVerifier: code_verifier,
        expectedState: state,
        resolver: (t: Tokens) => {
          tokens = t;
          transaction.set(docRef, {
            refresh_token: t.refresh_token || data?.refresh_token
          });
          resolve(t);
        }
      };
      res.redirect(
        OpenIDClient.buildAuthorizationUrl(conf, {
          redirect_uri: credentials().redirect_uri,
          scope: credentials().scope,
          code_challenge,
          code_challenge_method: 'S256',
          state
        }).toString()
      );
    });
  });
}

/**
 * Handle the redirect leg of the OAuth 2.0 authorization code flow
 *
 * Verify the state and PKCE code against the locally cached values and acquire
 * an access_token to cache locally, potentially including a refresh_token wich
 * will be cached in shared storage, releasing the Firestore transaction block
 * that {@link authorize()} opened
 */
export async function handleRedirect(req: Request, res: Response) {
  if (session) {
    const tokens = await OpenIDClient.authorizationCodeGrant(
      await config,
      new URL(req.url, credentials().redirect_uri),
      session
    );
    session.resolver(tokens);
    session = undefined;
    res.send('Authorized');
  } else {
    res.status(400).send();
  }
}
