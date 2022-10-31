import * as fs from 'node:fs/promises';
import {OAuth2Client, Credentials} from 'google-auth-library';
import * as http from 'node:http';
import arrify from 'arrify';
import destroyer from 'server-destroy';
import open from 'open';
import * as dotenv from 'dotenv';

dotenv.config();

type KeyData = {
  installed: {
    client_id: string,
    project_id: string,
    auth_uri?: string,
    token_uri?: string,
    auth_provider_x509_cert_url?: string,
    client_secret: string,
    redirect_uris: string[]
  }
}

// TODO: read in the key and check if the requested scopes are present in the key.
// If not, build a superset of the existing scopes and the requestted scopes and
// authorize it.
// For the moment, if authentication is requested for different scopes in different
// code paths, the different scopes will continue to blow each other away, requiring
// repeated reauthentication.
export class SimpleAuth {
  private static async loadJson<T>(file: string) {
    return fs.readFile(file)
      .then(buffer => buffer.toString())
      .then(data => JSON.parse(data) as T)
  }

  static async authenticate(
    scope: string | string[],
    keyFilePath?: string,
    tokenFilePath?: string,
  ) {
      keyFilePath ??= process.env.GOOGLE_KEYS_PATH ?? './config/google-keys.json';
      tokenFilePath ??= tokenFilePath ?? process.env.GOOGLE_TOKEN_PATH ?? './config/google-token.json';
      const scopes = arrify(scope);

      // Load the google key and token files
      const keys = await SimpleAuth.loadJson<KeyData>(keyFilePath);
      const {client_secret, client_id, redirect_uris} = keys.installed;
      const client = new OAuth2Client(
        client_id, client_secret, redirect_uris[0]
      );

      const token = await this.loadJson<Credentials>(tokenFilePath)
        .catch(err => SimpleAuth.getNewToken(client, keys, scopes));
      
      // Write it back out, as the token data might be updated with
      // new expiry dates, etc.
      return fs.writeFile(tokenFilePath, JSON.stringify(token))
        .then(() => {
          client.credentials = token;
          return client;
        });
  }

  private static async getNewToken(client: OAuth2Client, keys: KeyData, scopes: string[]) {
    return new Promise<Credentials>((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
          try {
            const url = new URL(req.url!, 'http://localhost:3000');
            if (url.pathname !== new URL(keys.installed.redirect_uris[0]).pathname) {
              res.end('Invalid callback URL');
              return;
            }
            const code = url.searchParams.get('code') ?? '';
            res.end('Authentication successful! Please return to the console.');
            await client.getToken(code)
              .then(response => {
                client.setCredentials(response.tokens);
                resolve(response.tokens);
              })
          } catch (e) {
            reject(e);
          }
        });
    
        server.listen(3000, () => {
          // open the browser to the authorize url to start the workflow
          const authorizeUrl = client.generateAuthUrl({
            redirect_uri: 'http://localhost:3000',
            access_type: 'offline',
            scope: scopes.join(' '),
          });
          open(authorizeUrl, {wait: false}).then(cp => cp.unref());
        });
        destroyer(server);
      });    
  }
}