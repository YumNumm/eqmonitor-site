import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const appId = 'CPL7H8SHVM.net.yumnumm.eqmonitor';
const packageName = 'net.yumnumm.eqmonitor';
const fingerprints = [
  'F9:60:E8:2C:F4:69:F3:F3:DC:09:9D:5E:25:17:8B:9A:7E:C3:DC:FC:48:30:30:BB:EE:BE:65:CF:BC:E5:E0:9F',
  '4F:AE:CE:62:51:4A:79:D1:3F:C3:E3:D5:77:C8:CE:A1:62:EE:E1:C4:9E:6D:89:88:78:26:FA:7B:C8:78:DD:75',
];
const wellKnownDirectory = new URL('../public/.well-known/', import.meta.url);

const [aasaSource, assetLinksSource] = await Promise.all([
  readFile(new URL('apple-app-site-association', wellKnownDirectory), 'utf8'),
  readFile(new URL('assetlinks.json', wellKnownDirectory), 'utf8'),
]);
const aasa = JSON.parse(aasaSource);
const assetLinks = JSON.parse(assetLinksSource);

assert.ok(aasa.applinks, 'AASA must retain applinks');
assert.ok(Array.isArray(aasa.applinks.details), 'AASA applinks must retain details');
assert.ok(
  aasa.applinks.details.some(
    (detail) =>
      Array.isArray(detail.appIDs) &&
      detail.appIDs.includes(appId) &&
      Array.isArray(detail.paths) &&
      detail.paths.includes('*'),
  ),
  `AASA applinks must retain the wildcard route for ${appId}`,
);
assert.ok(Array.isArray(aasa.webcredentials?.apps), 'AASA must define webcredentials.apps');
assert.ok(
  aasa.webcredentials.apps.includes(appId),
  `AASA webcredentials.apps must contain ${appId}`,
);

assert.ok(Array.isArray(assetLinks), 'Digital Asset Links must be an array');
const androidAppAssociation = assetLinks.find(
  (association) => association.target?.package_name === packageName,
);
assert.ok(androidAppAssociation, `Digital Asset Links must contain ${packageName}`);
assert.ok(
  androidAppAssociation.relation.includes('delegate_permission/common.handle_all_urls'),
  'Digital Asset Links must retain handle_all_urls',
);
assert.ok(
  androidAppAssociation.relation.includes('delegate_permission/common.get_login_creds'),
  'Digital Asset Links must include get_login_creds',
);
for (const fingerprint of fingerprints) {
  assert.ok(
    androidAppAssociation.target.sha256_cert_fingerprints.includes(fingerprint),
    `Digital Asset Links must contain ${fingerprint}`,
  );
}

console.log('Well-known association contracts verified.');
