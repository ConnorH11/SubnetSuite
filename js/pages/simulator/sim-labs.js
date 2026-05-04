// sim-labs.js
// Central Lab Catalog - Imports from modular lab files

import { CCNA_LABS } from './labs/sim-labs-ccna.js';
import { CCNP_LABS } from './labs/sim-labs-ccnp.js';
import { JUNIPER_LABS } from './labs/sim-labs-juniper.js';
import { COMPTIA_NET_LABS } from './labs/sim-labs-comptia-net.js';
import { COMPTIA_SEC_LABS } from './labs/sim-labs-comptia-sec.js';
import { COMPTIA_LINUX_LABS } from './labs/sim-labs-comptia-linux.js';

export const LABS = [
    ...CCNA_LABS,
    ...CCNP_LABS,
    ...JUNIPER_LABS,
    ...COMPTIA_NET_LABS,
    ...COMPTIA_SEC_LABS,
    ...COMPTIA_LINUX_LABS
];
