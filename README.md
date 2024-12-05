## installation
`npm i`

## description and advice
- before starting the script withdraw enough ETH for sale and  ~20$ more for TXns spam
- Script perform basic checks, **pay attention** to it. It also wraps ETH and approves WETH.
-  1 RPC is assinged to 1 wallet. If multiple wallets are run, its better to use multiple RPCs.

## setup
- tier is the TIERs tiers name (listed in config.ts file)
- count is limited by the sale rules. Do not set more than its allowed by the docs
- many tiers can go into one key, ***make sure to match tier names and counts***: 
```
tiers: ['Tier1ArbitrumWave1', 'Tier2ArbitrumWave1'],
count: [20, 50],
```
- you'd better add proxies, but it is not required

## running
`npm run start`
> Run it some time before sale start, so the script can **wrap & appprove** and perform basic checks


# Donos and contact

> telegram: **https://t.me/findmeonchain**  
donos: **[0x00000c7c61c5d7fbbf217ab9fc64f6016390d4ba](https://debank.com/profile/0x00000c7c61c5d7fbbf217ab9fc64f6016390d4ba)**