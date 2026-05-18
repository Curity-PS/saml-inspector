import * as http from 'node:http';
import * as https from 'node:https';
import type { IdpReachability } from '../types/domain';

/**
 * GET a URL and resolve with the body string. Used for fetching IdP metadata.
 * Self-signed certificates are accepted (this app talks to local Curity).
 */
export function fetchText(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client
      .get(url, { rejectUnauthorized: false }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer | string) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          if (res.statusCode === 200) {
            resolve(data);
          } else {
            reject(new Error(`HTTP ${res.statusCode}`));
          }
        });
      })
      .on('error', reject);
  });
}

/**
 * Issue a HEAD request to check reachability. Resolves with a small status
 * envelope; never rejects (errors map to { reachable: false }).
 */
export function headCheck(
  url: string,
  { timeoutMs = 5000 }: { timeoutMs?: number } = {}
): Promise<IdpReachability> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    let responded = false;
    const respond = (data: IdpReachability) => {
      if (responded) return;
      responded = true;
      resolve(data);
    };

    const req = client.request(
      url,
      { method: 'HEAD', rejectUnauthorized: false, timeout: timeoutMs },
      (res) => {
        res.resume();
        respond({ reachable: true, statusCode: res.statusCode });
      }
    );
    req.on('timeout', () => {
      req.destroy();
      respond({ reachable: false, reason: 'timeout' });
    });
    req.on('error', () => respond({ reachable: false, reason: 'unreachable' }));
    req.end();
  });
}
