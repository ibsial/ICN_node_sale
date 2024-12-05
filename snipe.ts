import {Contract, JsonRpcProvider, Wallet, ZeroAddress, ethers, formatEther, formatUnits, parseEther, parseUnits} from 'ethers'
import {c, defaultSleep, getRandomElementFromArray, log} from './utils/helpers'
import {distributor_abi, WETH_abi} from './utils/abi.js'
import {RPCs, tierConfig, proxies} from './config'
import * as gotScraping from 'got-scraping'

async function sendRawTx(signer: Wallet, rawTx: string) {
    try {
        let receipt = await signer.provider!.broadcastTransaction(rawTx)
        log('https://arbiscan.io/tx/' + receipt.hash)
    } catch (e: any) {
        log(e?.message)
        log(c.red(`error on sending tx, you've probably bought or sale is sold out..`))
    }
}
function getCurrentTimestamp() {
    return Math.floor(Date.now() / 1000)
}
async function getSignature(
    signer: Wallet,
    tier: {
        address: string
        tier: string
        count: number
        code: string
    }
) {
    try {
        // const distributor = new Contract(tier.address, distributor_abi, signer)
        // let tierId: number | undefined = undefined
        // let tierIds = await distributor.getAllTierIds()
        // for (let i = 0; i < tierIds.length; i++) {
        //     if (tierIds[i].toLowerCase() == tier.tier.toLowerCase()) {
        //         tierId = i
        //     }
        // }
        // if (tierId == undefined) {
        //     console.log(`could not find tierId, choosing 12 (public tier1)`)
        //     tierId = 12
        // }
        let proxy = getRandomElementFromArray(proxies)
        let session = gotScraping.gotScraping.extend({
            headers: {
                accept: '*/*',
                'accept-language': 'en;q=0.9',
                Referer: 'https://wallet.coinbase.com/',
                'Referrer-Policy': 'strict-origin-when-cross-origin'
            },
            ...(proxy != undefined ? {proxyUrl: 'http://' + proxy} : {}),
            retry: {
                limit: 3,
                methods: ['GET', 'POST'],
                statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
                errorCodes: ['ETIMEDOUT', 'ECONNRESET', 'EADDRINUSE', 'ECONNREFUSED', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN'],
                maxRetryAfter: undefined,
                backoffLimit: 15,
                noise: 100
            }
        })
        let resp = await session
            // .post(`https://backend.impossible.finance/api/backend-service/allocation/icn?address=${signer.address}&tierId=${tierId}`, {
            .post(`https://backend.impossible.finance/api/backend-service/allocation/icn`, {
                json: {address: signer.address, saleAddress: tier.address, tierId: tier.tier}
            })
            .json()
        return {signature: resp.data, ...tier}
    } catch (e: any) {
        console.log(`could not get signature`)
        console.log(e)
        await defaultSleep(1, false)
        return getSignature(signer, tier)
    }
}
async function prepare(
    signer: Wallet,
    tiers: {
        address: string
        tier: string
        count: number
        code: string
    }[]
) {
    const distributor = new Contract(tiers[0].address, distributor_abi, signer)
    let sumApprove = 0n
    for (let i = 0; i < tiers.length; i++) {
        try {
            let salePrice = (await distributor.tiers(tiers[i].tier)).price
            let totalPayment = BigInt(tiers[i].count) * salePrice
            console.log(
                c.cyan(
                    `want to buy ${c.underline(tiers[i].count)} nodes for ${c.underline(
                        formatUnits(totalPayment, 18)
                    )} WETH at avg price: ${c.underline(formatUnits(totalPayment / BigInt(tiers[i].count), 18))}`
                )
            )
            sumApprove += totalPayment
        } catch (e) {
            console.log(e)
            return prepare(signer, tiers)
        }
    }
    try {
        const weth = new Contract('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1', WETH_abi, signer)
        const wethBalance = await weth.balanceOf(signer.address)
        const allowance = await weth.allowance(signer.address, await distributor.getAddress())
        console.log(
            `WETH balance: ${formatUnits(wethBalance, 18)} | allowance: ${formatUnits(allowance, 18)} (want ${formatUnits(sumApprove, 18)} WETH)`
        )
        if (wethBalance < sumApprove) {
            const ethBalance = await signer.provider?.getBalance(signer.address)
            if (ethBalance == undefined) {
                return prepare(signer, tiers)
            }
            // prettier-ignore
            if (wethBalance + ethBalance < sumApprove) {
                console.log(c.red.bold(`${signer.address} has not enough ETH. Want: ${formatUnits(sumApprove, 18)}, have: ${formatUnits(wethBalance+ethBalance, 18)}`))
                console.log(c.red.bold(`${signer.address} has not enough ETH. Want: ${formatUnits(sumApprove, 18)}, have: ${formatUnits(wethBalance+ethBalance, 18)}`))
                console.log(c.red.bold(`${signer.address} has not enough ETH. Want: ${formatUnits(sumApprove, 18)}, have: ${formatUnits(wethBalance+ethBalance, 18)}`))
                return false
            }
            console.log(c.yellow('WETH balance not enough, wrapping..'))
            let tx = await weth.deposit({value: sumApprove - wethBalance})
            console.log(`wrapped ${formatUnits(sumApprove - wethBalance, 18)} ETH ${'https://arbiscan.io/tx/' + tx.hash}`)
            await defaultSleep(2, false)
        }
        if (allowance < sumApprove) {
            console.log(c.yellow('allowance not enough, approving..'))
            let tx = await weth.approve(tiers[0].address, sumApprove)
            console.log(`approved ${'https://arbiscan.io/tx/' + tx.hash}`)
        }
        return true
    } catch (e: any) {
        console.log(e)
        return prepare(signer, tiers)
    }
}
async function participate(
    signer: Wallet,
    tiers: {
        address: string
        tier: string
        count: number
        code: string
        signature: string
    }[],
    retry = false
) {
    try {
        let provider = new JsonRpcProvider(getRandomElementFromArray(RPCs), 42161, {
            staticNetwork: true
        })
        let rotatedSigner
        if (retry) {
            rotatedSigner = signer.connect(provider)
        } else {
            rotatedSigner = signer
        }
        // get all the data ready for sign
        let signerNonce = await rotatedSigner.provider!.getTransactionCount(rotatedSigner.address)
        for (let i = 0; i < tiers.length; i++) {
            const distributor = new Contract(tiers[i].address, distributor_abi, signer)
            // let salePrice = (await distributor.tiers(tiers[i].tier)).price
            // let totalPayment = BigInt(tiers[i].count) * salePrice
            let totalPayment = BigInt(31e17)
            let maxFeePerGas = parseUnits('0.1', 'gwei')
            let maxPriorityFeePerGas = parseUnits('0.05', 'gwei')
            const txData = distributor.interface.encodeFunctionData('signedPurchaseInTierWithCode', [
                tiers[i].tier, // tier name
                BigInt(tiers[i].count), // amount of nodes
                totalPayment, // allocated payment (WETH in wei)
                tiers[i].signature, // signature
                tiers[i].code, //promo code
                ZeroAddress // walletPromoCode
            ])
            // // wait timestamp
            while (true) {
                log(`wait sale`)
                try {
                    let estimate = await distributor.signedPurchaseInTierWithCode.estimateGas(
                        tiers[i].tier, // tier name
                        BigInt(tiers[i].count), // amount of nodes
                        totalPayment, // allocated payment (WETH in wei)
                        tiers[i].signature, // signature
                        tiers[i].code, //promo code
                        ZeroAddress // walletPromoCode
                    )
                    break
                } catch (e: any) {
                    // console.log(e)
                }
                await defaultSleep(Math.random() / 2 + 0.5, false) // 0.5 + [0,0.5]
            }
            // // spam TXns
            const tx = {
                nonce: signerNonce,
                from: rotatedSigner.address,
                to: await distributor.getAddress(),
                data: txData,
                maxFeePerGas: maxFeePerGas,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                gasLimit: 4_000_000n,
                value: 0n,
                chainId: '42161'
            }
            let rawTx = await rotatedSigner.signTransaction(tx)
            sendRawTx(rotatedSigner, rawTx)
            signerNonce++
            await defaultSleep(0.1, false)
        }
    } catch (e: any) {
        log(e)
        return participate(signer, tiers, true)
    }
}

async function runWallet(
    signer: Wallet,
    tiers: {
        address: string
        tier: string
        count: number
        code: string
    }[]
) {
    for (let i = 0; i < tiers.length; i++) {
        if (tiers[i].code == '') {
            console.log(c.red(`SET REF CODE FOR ${signer.privateKey}!!!!\n`.repeat(20)))
        }
    }
    let walletReady = await prepare(signer, tiers)
    if (!walletReady) {
        return
    }
    let newTiers: {
        address: string
        tier: string
        count: number
        code: string
        signature: string
    }[] = []
    for (let i = 0; i < tiers.length; i++) {
        let newTier = await getSignature(signer, tiers[i])
        newTiers.push(newTier)
    }
    console.log(`${signer.address} is ready and waiting for 3 sec before sale start`)
    const distributor = new Contract(tiers[0].address, distributor_abi, signer)
    let saleStartTs = 1733392800n
    while (BigInt(getCurrentTimestamp() + 5) < saleStartTs) {
        if (saleStartTs - BigInt(getCurrentTimestamp()) > 100n) {
            await defaultSleep(10, false)
        } else if (saleStartTs - BigInt(getCurrentTimestamp()) < 100n && saleStartTs - BigInt(getCurrentTimestamp()) > 10n) {
            await defaultSleep(5, false)
        } else {
            await defaultSleep(1, false)
        }
        try {
            saleStartTs = (await distributor.tiers(newTiers[0].tier)).startTime
        } catch (e: any) {
            saleStartTs = 1733392800n
        }
    }
    await participate(signer, newTiers)
}
async function snipe() {
    let j = 0
    for (let tierKey in tierConfig) {
        try {
            const signer = new Wallet(tierKey)
        } catch (e) {
            console.log(c.red(`INVALID PRIVATE KEY: ${tierKey}`))
            console.log(c.red(`INVALID PRIVATE KEY: ${tierKey}`))
            console.log(c.red(`INVALID PRIVATE KEY: ${tierKey}`))
            continue
        }
        let tiers = []
        for (let i = 0; i < tierConfig[tierKey].tiers.length; i++) {
            tiers.push({
                address: '0xB02EB8a7ed892F444ED7D51c73C53250Ab8d754E',
                tier: tierConfig[tierKey].tiers[i],
                count: tierConfig[tierKey].count[i],
                code: tierConfig[tierKey].code
            })
        }
        const arb_provider = new JsonRpcProvider(RPCs[j % RPCs.length], 42161, {
            staticNetwork: true
        })
        const signer = new Wallet(tierKey, arb_provider)
        console.log(`starting ${signer.address} (${tierKey.slice(0, 5)}...${tierKey.slice(tierKey.length - 5, tierKey.length - 1)})`)
        runWallet(signer, tiers)
        await defaultSleep(0.1, false)
        j++
    }
}

snipe()
