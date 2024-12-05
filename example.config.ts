import {tierConfigType} from './types'
/*  Impossible Cloud Network
1: Tier1ArbitrumWave1  |  0.13 WETH  | 20
2: Tier2ArbitrumWave1  |  0.172 WETH | 50
3: Tier3ArbitrumWave1  |  0.211 WETH | 50
4: Tier4Arbitrum  |  0.243 WETH | 525
5: Tier5Arbitrum  |  0.279000000000000032 WETH | 700
6: Tier6Arbitrum  |  0.301 USDC | 700
*/

export const tierConfig: tierConfigType = {
    'key1': {
        tiers: ['Tier1ArbitrumWave1'], // tiers
        count: [20], // count per tier
        code: 'defigen' // DONT FORGET TO SET
    },
    // 'key2': {
    //     tiers: ['Tier1ArbitrumWave1', 'Tier2ArbitrumWave1'], // tiers
    //     count: [20, 20], // count per tier
    //     code: 'defigen' // DONT FORGET TO SET
    // },
}

export const RPCs = [
    'https://arb1.arbitrum.io/rpc', // -- better keep this one
    'https://arb1.arbitrum.io/rpc', // -- better keep this one
    'https://arb1.arbitrum.io/rpc', // -- better keep this one
    'https://arb1.arbitrum.io/rpc', // -- better keep this one
    'https://arb1.arbitrum.io/rpc', // -- better keep this one

    'https://arbitrum-one-rpc.publicnode.com', // may remove this one
    'https://arbitrum-one.public.blastapi.io', // may remove this one
    'https://rpc.ankr.com/arbitrum',            // may remove this one

    // better use alchemy/ankr/infura/any other private rpc
]

export const proxies = [
    // Can be set or left empty
    // 'login:pass@ip:port',
]