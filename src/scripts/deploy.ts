import gcloud from '@battis/partly-gcloudy';
import { Core } from '@qui-cli/core';
import { Env } from '@qui-cli/env';
import input from '@inquirer/input';
import { Validators } from '@qui-cli/validators';
import { Log } from '@qui-cli/log';
import { Colors } from '@qui-cli/colors';
import {
  AUTHORIZE_PATH,
  PATH_TO_VERACROSS_CREDENTIALS,
  REDIRECT_PATH,
  VERACROSS_CREDENTIALS
} from '../Constants.js';

const { values: { force } = {} } = await Core.init({
  man: [{ level: 1, text: 'Deploy Options' }],
  flag: {
    force: {
      description: `Force re-running the initial setup wizard`,
      short: 'f'
    }
  }
});
await Core.run();

const serviceName =
  (await Env.get({ key: 'SERVICE_NAME' })) ||
  (await input({
    message: 'Google Cloud Run service name',
    default: 'birthdays',
    validate: Validators.combine(
      Validators.notEmpty,
      Validators.lengthBetween(1, 49)
    )
  }));
let redirect_uri: string | undefined = undefined;
if (!gcloud.projects.active.get() || force) {
  let region = await Env.get({ key: 'REGION' });
  const { project } = await gcloud.batch.projects.initialize({
    defaultName: 'Veracross Birthdays',
    env: true
  });
  const member = `serviceAccount:${project.projectNumber}-compute@developer.gserviceaccount.com`;

  region = await gcloud.run_.regions.select({ region });

  await gcloud.services.enable(gcloud.services.API.SecretManagerAPI);
  await gcloud.shell.gcloud(
    `projects add-iam-policy-binding ${[project.projectId]}`,
    {
      flags: {
        member,
        role: gcloud.iam.Role.SecretManager.SecretAccessor
      },
      includeProjectIdFlag: false
    }
  );

  redirect_uri = `https://${serviceName}-${project.projectNumber}.${region}.run.app${REDIRECT_PATH}`;
  await gcloud.secrets.set({
    name: VERACROSS_CREDENTIALS,
    // FIXME this is not generating valid JSON -- only `"school_route":"groton"`
    value: JSON.stringify({
      school_route: await input({
        message: 'Veracross school route',
        validate: Validators.notEmpty
      }),
      client_id: await input({
        message: 'Veracross OAuth 2.0 client ID',
        validate: Validators.notEmpty
      }),
      client_secret: await input({
        message: 'Veracross OAuth 2.0 client secret',
        validate: Validators.notEmpty
      }),
      redirect_uri
    })
  });

  await gcloud.services.enable(gcloud.services.API.CloudFirestoreAPI);
  try {
    const db = await gcloud.shell.gcloud('firestore databases describe');
    if (db.type !== 'FIRESTORE_NATIVE') {
      await gcloud.shell.gcloud('firestore databases update', {
        flags: {
          database: db.name,
          type: 'firestore-native'
        }
      });
    }
  } catch (_) {
    await gcloud.shell.gcloud('firestore databases create', {
      flags: {
        location: region,
        type: 'firestore-native'
      }
    });
  }
  await gcloud.shell.gcloud(
    `projects add-iam-policy-binding ${project.projectId}`,
    {
      flags: {
        member,
        role: 'roles/datastore.user'
      },
      includeProjectIdFlag: false
    }
  );

  await gcloud.services.enable(gcloud.services.API.CloudBuildAPI);
}
await gcloud.batch.run.deployService({
  defaultName: 'Veracross Birthdays',
  serviceName,
  env: true,
  args: {
    source: '.',
    'base-image': 'nodejs22',
    'allow-unauthenticated': true,
    'set-secrets': `${PATH_TO_VERACROSS_CREDENTIALS}=${VERACROSS_CREDENTIALS}:latest`,
    'set-env-vars': 'CI=TRUE' // run pnpm non-interactively
  },
  retainRevisions: 2
});

if (redirect_uri) {
  Log.info(
    `Make sure that ${Colors.url(redirect_uri)} is registered as a redirect ` +
      `URI for your app and then visit ` +
      `${Colors.url(new URL(AUTHORIZE_PATH, redirect_uri))} to authorize the ` +
      `app.`
  );
}
