import is from '@sindresorhus/is';
import arrify from 'arrify';
import dotenv from 'dotenv';
import {google} from 'googleapis';
import { Project } from '../../index.js';

dotenv.config();


export interface GoogleKeyJson {
  "type": string,
  "project_id": string,
  "private_key_id": string,
  "private_key": string,
  "client_email": string,
  "client_id": string,
  "auth_uri": string,
  "token_uri": string,
  "auth_provider_x509_cert_url": string,
  "client_x509_cert_url": string
}

const defaultScopes = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'openid'
]

export async function authenticate(scopes?: string | string[]) {
  const project = await Project.config();
  const files = project.files('config');
  const envAuth = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const configAuth = 'google-service-account.json';
  const workingScopes = scopes ? arrify(scopes) : defaultScopes;

  if (is.nonEmptyStringAndNotWhitespace(envAuth)) {
    const jwtClient = new google.auth.JWT(
      undefined,
      process.env.GOOGLE_APPLICATION_CREDENTIALS,
      undefined,
      workingScopes
    );

    google._options.auth = jwtClient;
    return jwtClient.authorize();

  } else {
    const json = await files.read(configAuth)
      .then(buffer => JSON.parse(buffer.toString()) as GoogleKeyJson);

    const jwtClient = new google.auth.JWT(
      json.client_email,
      undefined,
      json.private_key,
      workingScopes,
      undefined,
      json.private_key_id
    );

    google.options({ auth: jwtClient });
    return jwtClient.authorize();
  }
}