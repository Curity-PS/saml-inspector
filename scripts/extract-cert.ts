#!/usr/bin/env tsx

/**
 * Extract the signing certificate from a Curity SAML IDP metadata endpoint.
 *
 * Usage: tsx scripts/extract-cert.ts [metadata-url]
 *
 * Tries the provided URL, then a small list of common Curity metadata paths,
 * derived from $SAML_ENTRY_POINT or localhost:8443 defaults.
 */

import * as https from 'node:https';
import * as fs from 'node:fs';
import * as path from 'node:path';

const agent = new https.Agent({ rejectUnauthorized: false });

const providedUrl = process.argv[2];
const baseUrl =
  providedUrl ?? process.env.SAML_ENTRY_POINT ?? 'https://localhost:8443/saml/sso';

const candidateEndpoints: string[] = Array.from(
  new Set(
    [
      providedUrl,
      baseUrl.replace('/sso', '/metadata'),
      'https://localhost:8443/saml/metadata',
      'https://localhost:8443/metadata',
      baseUrl.replace('/sso', '')
    ].filter((u): u is string => Boolean(u))
  )
);

function fetchUrl(url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    https
      .get(url, { agent }, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        res.on('end', () => {
          resolve({ status: res.statusCode ?? 0, body: data });
        });
      })
      .on('error', reject);
  });
}

function extractCert(metadataXml: string): string | null {
  const match = metadataXml.match(/<(?:[\w]+:)?X509Certificate>([\s\S]*?)<\/(?:[\w]+:)?X509Certificate>/);
  return match?.[1] ? match[1].replace(/\s+/g, '') : null;
}

async function main(): Promise<void> {
  console.log('Trying to fetch SAML metadata from Curity...\n');

  for (const endpoint of candidateEndpoints) {
    console.log(`Trying: ${endpoint}`);
    try {
      const { status, body } = await fetchUrl(endpoint);
      if (status !== 200) {
        console.log(`  ↳ HTTP ${status}`);
        continue;
      }
      const cert = extractCert(body);
      if (!cert) {
        console.log('  ↳ 200 OK but no <X509Certificate> in response');
        continue;
      }

      console.log('\n✅ Certificate found!\n');
      console.log('Add this to your .env file as SAML_IDP_CERT:\n');
      console.log(cert);
      console.log('');

      const tempFile = path.join(__dirname, '..', '.saml-cert.txt');
      fs.writeFileSync(tempFile, cert);
      console.log(`Certificate also saved to: ${tempFile}`);
      console.log('\nTo use it, add this line to your .env file:');
      console.log(`SAML_IDP_CERT=${cert}`);
      return;
    } catch (err) {
      const code = (err as NodeJS.ErrnoException)?.code;
      const message = err instanceof Error ? err.message : String(err);
      console.log(`  ↳ ${code ? `[${code}] ` : ''}${message || '(no message)'}`);
    }
  }

  console.error('\n❌ Could not find metadata at any known endpoint');
  console.log('\nTried the following URLs:');
  candidateEndpoints.forEach((url) => console.log(`  - ${url}`));
  console.log('\nPlease provide the correct metadata URL:');
  console.log('  tsx scripts/extract-cert.ts <your-metadata-url>');
  process.exitCode = 1;
}

void main();
