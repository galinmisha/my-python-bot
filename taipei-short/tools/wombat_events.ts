import {ballContacts} from '../src/wombatPhys';
import {writeFileSync} from 'fs';
writeFileSync('tools/wombat_events.json', JSON.stringify(ballContacts.filter((_, i, a) => i === 0 || a[i] - a[i - 1] > 0.05)));
