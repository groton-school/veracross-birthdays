import { v3 } from './v3.js';
import { Veracross } from '@oauth2-cli/veracross';
import { ClientPathsWithMethod } from 'openapi-fetch';

type Endpoint = ClientPathsWithMethod<typeof v3, 'get'>;
type Get<E extends Endpoint> = Veracross.Types.spec.DataAPI.paths[E]['get'];
type Query<E extends Endpoint> = NonNullable<Get<E>>['parameters']['query'];
export type Data<E extends Endpoint> =
  Get<E>['responses'][200]['content']['application/json']['data'];

const PAGE_SIZE = 100;

export async function getAll<E extends Endpoint>(
  endpoint: E,
  query?: Query<typeof endpoint>
): Promise<Data<E>> {
  let page = 1;
  let done: boolean;
  const all: Data<E> = [];
  do {
    // @ts-expect-error 2345
    const { data, error } = await v3.GET(endpoint, {
      params: {
        query,
        header: { 'X-Page-Number': page, 'X-Page-Size': PAGE_SIZE }
      }
    });
    if (error) {
      throw new Error(`Error fetching from API: ${JSON.stringify(error)}`);
    }
    if (data) {
      all.push(...data.data);
    }
    done = !data || data.data.length < PAGE_SIZE;
    page++;
  } while (!done);
  return all;
}
