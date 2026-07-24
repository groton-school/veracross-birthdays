import { DateTime } from 'luxon';

export function filterByDate(
  date_of_birth: string | null | undefined,
  look_ahead: number,
  look_behind: number
) {
  if (date_of_birth) {
    let birthday = DateTime.fromISO(date_of_birth).set({
      year: DateTime.now().year
    });
    if (birthday.diffNow().as('days') > look_ahead) {
      birthday = birthday.set({ year: birthday.year - 1 });
      if (birthday.diffNow().as('days') > -look_behind) {
        return birthday;
      }
    } else {
      return birthday;
    }
  }
  return undefined;
}
