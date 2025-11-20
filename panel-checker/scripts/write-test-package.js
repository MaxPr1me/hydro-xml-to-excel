import { writeFileSync } from 'fs';
writeFileSync('.tmp-tests/package.json', JSON.stringify({ type: 'commonjs' }));
