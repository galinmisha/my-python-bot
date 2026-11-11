import {sim} from '../src/sim';
import {T} from '../src/config';
import {writeFileSync} from 'fs';
writeFileSync('tools/impacts.json', JSON.stringify(sim().impacts.filter((i) => i.t > T.heat0 - 0.3)));
