import { ArrayElement } from '@battis/typescript-tricks';
import { Data, Veracross } from '../Veracross/index.js';

export type Person =
  ArrayElement<Data<'/students'>> | ArrayElement<Data<'/staff_faculty'>>;

let name_prefixes:
  | undefined
  | { id: number; description: string; category: number; sort_key: number }[] =
  undefined;
let name_suffixes:
  | undefined
  | { id: number; description: string; category: number; sort_key: number }[] =
  undefined;

export async function formattedName(
  person: Person,
  format: string
): Promise<string> {
  if (
    (!name_prefixes && 'name_prefix' in person && person.name_prefix) ||
    (!name_suffixes && 'name_suffix' in person && person.name_suffix)
  ) {
    const { data, error } = await Veracross.v3.GET('/staff_faculty/{id}', {
      params: {
        path: { id: person.id },
        header: { 'X-API-Value-Lists': 'include' }
      }
    });
    if (error) {
      throw new Error(
        `Error looking up name prefixes and suffixes: ${error.error}`
      );
    }
    const value_lists = data.value_lists;
    // @ts-expect-error 2322 typing is incorrect
    name_prefixes = (value_lists || []).find((v) =>
      v.fields.includes('name_prefix')
    )?.items;
    // @ts-expect-error 2322 typing is incorrect
    name_suffixes = (value_lists || []).find((v) =>
      v.fields.includes('name_suffix')
    )?.items;
  }

  return format
    .replace(
      '{name_prefix}',
      'name_prefix' in person && person.name_prefix && name_prefixes
        ? name_prefixes.find((i) => i.id === person.name_prefix)?.description ||
            ''
        : ''
    )
    .replace('{preferred_name}', person.preferred_name || person.first_name)
    .replace(
      '{first_name.initial}',
      person.first_name
        .split(' ')
        .map((n) => `${n[0]}.`)

        .join(' ')
        .replace(
          '{middle_name.initial}',
          (person.middle_name || '')
            .split(' ')
            .map((n) => `${n[0]}.`)
            .join(' ')
        )
    )
    .replace('{middle_name}', person.middle_name || '')
    .replace('{first_name}', person.first_name)
    .replace(
      '{last_name.initial}',
      person.last_name
        .split(' ')
        .map((n) => `${n[0]}.`)
        .join(' ')
    )
    .replace('{last_name}', person.last_name)
    .replace(
      '{name_suffix}',
      'name_suffix' in person && person.name_suffix && name_suffixes
        ? name_suffixes.find((i) => i.id === person.name_suffix)?.description ||
            ''
        : ''
    )
    .replace(
      '{graduation_year.short}',
      'graduation_year' in person && person.graduation_year
        ? `’${person.graduation_year.toString().substring(2)}`
        : ''
    )
    .replace(
      '{graduation_year}',
      ('graduation_year' in person && person.graduation_year?.toString()) || ''
    )
    .trim();
}
