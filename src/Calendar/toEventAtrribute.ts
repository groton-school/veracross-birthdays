import { DateTime } from 'luxon';
import { formattedName, Person } from './formattedName.js';

type DateTuple = [number, number, number];

export type SimpleAttribute = {
  title: string;
  start: DateTuple;
  end: DateTuple;
  recurrenceRule: string;
};

export async function toEventAttribute(
  person: Person,
  format: string,
  birthday: DateTime
): Promise<SimpleAttribute> {
  const start = birthday.toISODate();
  if (!start) {
    throw new Error('Could not convert to ISO date', { cause: birthday });
  }
  const end = birthday.plus({ days: 1 });
  return {
    title: await formattedName(person, format),
    start: [birthday.year, birthday.month, birthday.day],
    end: [end.year, end.month, end.day],
    recurrenceRule: `FREQ=YEARLY;BYMONTH=${birthday.month};BYMONTHDAY=${birthday.day}`
  };
}
