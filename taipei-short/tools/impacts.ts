import {sim} from '../src/sim';
import {writeFileSync} from 'fs';
writeFileSync('tools/impacts.json', JSON.stringify(sim().impacts.filter((i) => i.t > 13.7)));
