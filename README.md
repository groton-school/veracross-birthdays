# @groton/veracross-birthdays

Configurable birthday calendar feed for Veracross

## Setup

Deployment will require Veracross OAuth app integration with the following scopes:

| Scope                  | Purpose                                             |
| ---------------------- | --------------------------------------------------- |
| `students:list`        | Read student names, graduation years, and birthdays |
| `staff_faculty:list`   | Read staff/faculty names                            |
| `staff_faculty:read`   | Read name prefix and suffix field values            |
| `health.patients:list` | Read staff/faculty birthdays                        |

Clone the repository, install dependencies, and deploy to Google Cloud Run using the provided wizard.

```bash
git clone https://github.com/groton-school/veracross-birthdays.git /path/to/project
cd /path/to/project
pnpm install
pnpm run deploy
```

The app runs as a Google Cloud Run service. Veracross OAuth credentials are stored in Google Secret Manager. Each instance of the service maintains its own locally cached Veracross v3 API access token in memory. All isntances share a single refresh token stored in Google Firestore.

The user authorizing the service needs to have at least `Staff_4` and `Medical_2` security roles to be able to see faculty and staff birthdays.

## Configuration

Developer-level configuration can be done by editing source code (especially [Constants.ts](./src/Constants.ts)).

Calendar feeds can be customized with query URLs:

| Parameter                     | Default Value      | Purpose                                                                                                                                                                                       |
| ----------------------------- | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `student`, `staff`, `faculty` | `undefined`        | The presence of these parameter include student,staff, and faculty birthdays in the calendar, respectively. They can also provide an optional name formats for each group as described below. |
| `look_ahead`                  | `30`               | How many days of birthdays past today to include in the calendar                                                                                                                              |
| `look_behind`                 | `30`               | How many days of birthdays before today to include in the calendar                                                                                                                            |
| `collapse`                    | `false`            | Collapse all the birthdays on each day into a single event, listing all of the names as the title of the event                                                                                |
| `calName`                     | `Groton Birthdays` | The name of the calendar                                                                                                                                                                      |

## Formatting Names

Each group (student, faculty, staff) can have its own name format defined. The default name format if none is defined is:

`{name_prefix} {preferred_name} {last_name} {name_suffix} {graduation_year.short}`

Placeholders are based on the Veracross field names for demographic information. All placeholders that do not contain a value will be removed from the name (e.g. `{graduation_year}` from a staff name) with exception of `{preferred_name}` which will fall back to `{first_name}`.

Available placeholders include:

| Placeholder                                    | Notes                                                                  |
| ---------------------------------------------- | ---------------------------------------------------------------------- |
| `{name_prefix}`                                |                                                                        |
| `{preferred_name}`                             | Falls back to `{first_name}` if no `preferred_name` value is available |
| `{first_name}`, `{first_name.initial}`         | Name(s) may be abbreviated (e.g. `Mary Lou` becomes `M.  L.`)          |
| `{middle_name}`, `{middle_name.initial}`       |                                                                        |
| `{last_name}`, `{last_name.initial}`           |                                                                        |
| `{name_suffix}`                                |                                                                        |
| `{graduation_year}`, `{graduation_year.short}` | The short version of the `graduation_year` is two digits: `’26`        |
