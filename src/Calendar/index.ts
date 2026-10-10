import ics from 'ics';
import { Data, Veracross } from '../Veracross/index.js';
import { SimpleAttribute, toEventAttribute } from './toEventAtrribute.js';
import { filterByDate } from './filterByDate.js';
import { DEFAULT_CALNAME, DEFAULT_FORMAT } from '../Constants.js';
import { ArrayElement } from '@battis/typescript-tricks';

interface Options {
  student?: string;
  staff?: string;
  faculty?: string;
  calName?: string;
  collapse?: boolean;
  look_ahead?: number;
  look_behind?: number;
}

type Birthday = Pick<
  ArrayElement<Data<'/health/patients'>>,
  'id' | 'date_of_birth'
>;

const birthdayCache = { faculty: [] as Birthday[], staff: [] as Birthday[] };

async function getBirthday(isFaculty: boolean, id: number) {
  const key = isFaculty ? 'faculty' : 'staff';
  if (!birthdayCache[key].length) {
    birthdayCache[key] = (
      await Veracross.getAll('/health/patients', { role: isFaculty ? 22 : 21 })
    ).map((patient) => ({
      id: patient.id,
      date_of_birth: patient.date_of_birth
    }));
  }
  return (
    birthdayCache[key].find((b) => b.id === id) || { date_of_birth: undefined }
  );
}

export async function calendar({
  calName = DEFAULT_CALNAME,
  collapse = false,
  look_ahead = 30,
  look_behind = 30,
  ...formats
}: Options = {}) {
  let birthdays: SimpleAttribute[] = [];

  let key: keyof typeof formats;
  for (key in formats) {
    let isFaculty = true;
    let format = DEFAULT_FORMAT;
    if (formats[key] && formats[key]!.length > 0) {
      format = formats[key]!;
    }
    switch (key) {
      case 'student':
        for (const person of await Veracross.getAll('/students')) {
          if (person.birthday) {
            const birthday = filterByDate(
              person.birthday,
              look_ahead,
              look_behind
            );
            if (birthday) {
              birthdays.push(await toEventAttribute(person, format, birthday));
            }
          }
        }
        break;
      case 'staff':
        isFaculty = false;
      // eslint-disable-next-line no-fallthrough
      case 'faculty':
        for (const person of await Veracross.getAll('/staff_faculty', {
          role: isFaculty ? 22 : 21
        })) {
          const { date_of_birth } = await getBirthday(isFaculty, person.id);
          if (date_of_birth) {
            const birthday = filterByDate(
              date_of_birth,
              look_ahead,
              look_behind
            );
            if (birthday) {
              birthdays.push(await toEventAttribute(person, format, birthday));
            }
          }
        }
        break;
    }
  }

  if (collapse) {
    birthdays = birthdays.reduce((collapsed, config) => {
      let inserted = false;
      for (let i = 0; !inserted && i < collapsed.length; i++) {
        if (
          collapsed[i].start[0] === config.start[0] &&
          collapsed[i].start[1] === config.start[1] &&
          collapsed[i].start[2] === config.start[2]
        ) {
          collapsed[i].title = `${collapsed[i].title}\n${config.title}`;
          inserted = true;
        }
      }
      if (!inserted) {
        collapsed.push(config);
      }
      return collapsed;
    }, [] as SimpleAttribute[]);
  }

  const { value, error } = ics.createEvents(birthdays, { calName });
  if (error) {
    throw new Error(`Error generating calendar: ${error.message}`);
  }
  return value;
}
