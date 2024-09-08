import db from './lib/db'
import { MaybeDocument } from 'nano'
import nodeCron from 'node-cron'
import z from 'zod'
import * as _ from 'ramda'

import Sentry from './lib/sentry'
import { getCbeRates } from './lib/banks/cbe'
import { getAwashRates } from './lib/banks/awash'
import { getDashenRates } from './lib/banks/dashen'
import { getCoopRates } from './lib/banks/coop'
import { getZemenRates } from './lib/banks/zemen'
import { getBunnaRates } from './lib/banks/bunna'
import { getGohBetRates } from './lib/banks/goh'
import { getHijraRates } from './lib/banks/hijra'
import { getAbayRates } from './lib/banks/abay'
import { getBerhanRates } from './lib/banks/berhan'
import { getNibRates } from './lib/banks/nib'
import { getAddisRates } from './lib/banks/addis'
import { getEnatRates } from './lib/banks/enat'
import { getGlobalRates as getGlobalBankRates } from './lib/banks/global'
import { getSiinqeeRates } from './lib/banks/siinqee'
import { getAhaduRates } from './lib/banks/ahadu'
import { getTsehayRates } from './lib/banks/tsehay'
import { getGadaaRates } from './lib/banks/gadaa'
import { getWegagenRates } from './lib/banks/wegagen'
import { getAmharaBankRates } from './lib/banks/amhara'
import { getAbyssiniaRates } from './lib/banks/abyssinia'
import { getTsedeyBankRates } from './lib/banks/tsedey'
import { getOromiaBankRates } from './lib/banks/oromia'
import { getHibretRates } from './lib/banks/hibret'
import { getNbeRates } from './lib/banks/nbe'
import { getAnbesaBankRates } from './lib/banks/anbesa'
import { getDbeRates } from './lib/banks/dbe'
import { getZamZamRates } from './lib/banks/zamzam'

import moment from 'moment'

const cron = Sentry.cron.instrumentNodeCron(nodeCron)

// Types for Bank Job
interface BankJob {
  slug: string
  symbol: string
  name: string
  shortName: string
  job: () => Promise<Record<string, CurrencyRates> | null>
}

const bankJobs: BankJob[] = [
  {
    slug: 'nbe',
    symbol: 'nbe',
    name: 'National Bank of Ethiopia',
    shortName: 'NBE',
    job: getNbeRates,
  },
  {
    slug: 'cbe',
    symbol: 'cbe',
    name: 'Commercial Bank of Ethiopia',
    shortName: 'CBE',
    job: getCbeRates,
  },
  {
    slug: 'abyssinia',
    symbol: 'boa',
    name: 'Bank of Abyssinia',
    shortName: 'Abyssinia',
    job: getAbyssiniaRates,
  },
  {
    slug: 'abay',
    symbol: 'aba',
    name: 'Abay Bank',
    shortName: 'Abay Bank',
    job: getAbayRates,
  },
  {
    slug: 'addis',
    symbol: 'add',
    name: 'Addis International Bank',
    shortName: 'Addis Bank',
    job: getAddisRates,
  },
  {
    slug: 'ahadu',
    symbol: 'aha',
    name: 'Ahadu Bank',
    shortName: 'Ahadu Bank',
    job: getAhaduRates,
  },
  {
    slug: 'amhara',
    symbol: 'amh',
    name: 'Amhara Bank',
    shortName: 'Amhara Bank',
    job: getAmharaBankRates,
  },
  {
    slug: 'anbesa',
    symbol: 'anb',
    name: 'Anbesa Bank',
    shortName: 'Anbesa',
    job: getAnbesaBankRates,
  },
  {
    slug: 'awash',
    symbol: 'awa',
    name: 'Awash Bank',
    shortName: 'Awash Bank',
    job: getAwashRates,
  },
  {
    slug: 'berhan',
    symbol: 'brh',
    name: 'Berhan Bank',
    shortName: 'Berhan Bank',
    job: getBerhanRates,
  },
  {
    slug: 'bunna',
    symbol: 'bun',
    name: 'Bunna Bank',
    shortName: 'Bunna Bank',
    job: getBunnaRates,
  },
  {
    slug: 'coop',
    symbol: 'coo',
    name: 'Cooperative Bank of Oromia',
    shortName: 'Coop Oromia',
    job: getCoopRates,
  },
  {
    slug: 'dashen',
    symbol: 'dsh',
    name: 'Dashen Bank',
    shortName: 'Dashen Bank',
    job: getDashenRates,
  },
  {
    slug: 'dbe',
    symbol: 'dbe',
    name: 'Development Bank of Ethiopia',
    shortName: 'DBE',
    job: getDbeRates,
  },
  {
    slug: 'enat',
    symbol: 'ena',
    name: 'Enat Bank',
    shortName: 'Enat Bank',
    job: getEnatRates,
  },
  {
    slug: 'gadaa',
    symbol: 'gda',
    name: 'Gadaa Bank',
    shortName: 'Gadaa Bank',
    job: getGadaaRates,
  },
  {
    slug: 'global',
    symbol: 'glo',
    name: 'Global Bank',
    shortName: 'Global Bank',
    job: getGlobalBankRates,
  },
  {
    slug: 'goh',
    symbol: 'goh',
    name: 'Goh Betoch Bank',
    shortName: 'Goh Betoch',
    job: getGohBetRates,
  },
  {
    slug: 'hibret',
    symbol: 'hbr',
    name: 'Hibret Bank',
    shortName: 'Hibret Bank',
    job: getHibretRates,
  },
  {
    slug: 'hijra',
    symbol: 'hij',
    name: 'Hijra Bank',
    shortName: 'Hijra Bank',
    job: getHijraRates,
  },
  {
    slug: 'nib',
    symbol: 'nib',
    name: 'Nib International Bank',
    shortName: 'Nib Bank',
    job: getNibRates,
  },
  {
    slug: 'oromia',
    symbol: 'oro',
    name: 'Oromia Bank',
    shortName: 'Oromia Bank',
    job: getOromiaBankRates,
  },
  {
    slug: 'siinqee',
    symbol: 'snq',
    name: 'Siinqee Bank',
    shortName: 'Siinqee Bank',
    job: getSiinqeeRates,
  },
  {
    slug: 'tsedey',
    symbol: 'tsd',
    name: 'Tsedey Bank',
    shortName: 'Tsedey Bank',
    job: getTsedeyBankRates,
  },
  {
    slug: 'tsehay',
    symbol: 'tse',
    name: 'Tsehay Bank',
    shortName: 'Tsehay Bank',
    job: getTsehayRates,
  },
  {
    slug: 'wegagen',
    symbol: 'weg',
    name: 'Wegagen Bank',
    shortName: 'Wegagen Bank',
    job: getWegagenRates,
  },
  {
    slug: 'zamzam',
    symbol: 'zam',
    name: 'ZamZam Bank',
    shortName: 'ZamZam Bank',
    job: getZamZamRates,
  },
  {
    slug: 'zemen',
    symbol: 'zmn',
    name: 'Zemen Bank',
    shortName: 'Zemen Bank',
    job: getZemenRates,
  },
]

interface CurrencyRates {
  updatedAt?: string
  cashBuying?: number
  cashSelling?: number
  transactionalBuying?: number
  transactionalSelling?: number
}

interface BankRates {
  [currency: string]: CurrencyRates & { updatedAt: string }
}

interface Bank {
  updatedAt: string
  slug: string
  name: string
  shortName: string
  symbol: string
  rates: BankRates
}

interface ExistingRates {
  banks: Record<string, Bank>
}

// Zod Schema for validation
const bankRateSchema = z.record(
  z.object({
    cashBuying: z.number().optional(),
    cashSelling: z.number().optional(),
    transactionalBuying: z.number().optional(),
    transactionalSelling: z.number().optional(),
  })
)

const runBankJobs = async () => {
  const bankRatesNewDB = await db('birrbot/bank_rate_new')

  // Fetch existing rates
  const existing = (await bankRatesNewDB
    .get('current_bank_rates')
    .catch(() => null)) as ExistingRates | null

  const banks = existing?.banks || {}

  // Sort jobs based on last update date, and filter those updated more than 10 minutes ago
  const bjs = bankJobs
    .filter((job) =>
      moment(banks[job.slug]?.updatedAt).isBefore(
        moment().subtract(10, 'minutes')
      )
    )
    .sort((a, b) => {
      const aUpdatedAt = banks[a.slug]?.updatedAt || 0
      const bUpdatedAt = banks[b.slug]?.updatedAt || 0
      return new Date(aUpdatedAt).getTime() - new Date(bUpdatedAt).getTime()
    })

  const allBanksRates = Object.values(banks).map((bank) => bank.rates)

  // Utility function to calculate average rates
  const calculateAverage = (ratesArr: (number | undefined)[]) => {
    const filteredRates = ratesArr.filter(Boolean) as number[]
    return filteredRates.length
      ? filteredRates.reduce((a, b) => a + b, 0) / filteredRates.length
      : 0
  }

  // Utility function to filter rates based on a range
  const filterRange = (rate: number | undefined, avg: number) => {
    if (!rate) return undefined
    return rate > avg * 1.2 || rate < avg * 0.8 ? undefined : rate
  }

  for (const bank of bjs) {
    try {
      const existing = (await bankRatesNewDB
        .get('current_bank_rates')
        .catch(() => null)) as ExistingRates | null

      if (!existing) {
        console.warn(`Couldn't fetch existing rates. Skipping update.`)
        continue
      }

      console.log('Running job:', bank.name)
      const res = await bank.job()

      if (!res || Object.keys(res).length === 0) {
        console.warn(`No rates returned for ${bank.name}. Skipping update.`)
        continue
      }

      const now = new Date().toISOString()

      const updates = Object.keys(res).reduce((acc, currency) => {
        const buyingAvgs = allBanksRates
          .map((rates) => {
            const curr = rates[currency]
            return curr
              ? calculateAverage([curr.cashBuying, curr.transactionalBuying])
              : 0
          })
          .filter(Boolean)

        const sellingAvgs = allBanksRates
          .map((rates) => {
            const curr = rates[currency]
            return curr
              ? calculateAverage([curr.cashSelling, curr.transactionalSelling])
              : 0
          })
          .filter(Boolean)

        const buying = calculateAverage(buyingAvgs)
        const selling = calculateAverage(sellingAvgs)

        const C = res[currency]
        const filteredRates: CurrencyRates = {
          cashBuying: filterRange(C.cashBuying, buying),
          cashSelling: filterRange(C.cashSelling, buying),
          transactionalBuying: filterRange(C.transactionalBuying, selling),
          transactionalSelling: filterRange(C.transactionalSelling, selling),
        }

        const definedRates = Object.fromEntries(
          Object.entries(filteredRates).filter(
            ([_, value]) => value !== undefined
          )
        ) as CurrencyRates

        const previousRates: CurrencyRates =
          existing?.banks?.[bank.slug]?.rates?.[currency] || {}

        // Check if any rates have changed
        const hasRatesChanged = Object.entries(definedRates).some(
          ([key, value]) => {
            return previousRates[key as keyof CurrencyRates] !== value
          }
        )

        const newRates: any = {
          ...previousRates,
          ...definedRates,
          updatedAt: previousRates.updatedAt || now,
        }

        // Add updatedAt only if rates have changed
        if (hasRatesChanged) {
          newRates.updatedAt = now
        }

        // Only add the currency if there are defined rates or changes
        if (Object.keys(definedRates).length > 0) {
          acc[currency] = newRates
        }

        return acc
      }, {} as BankRates)

      const bankData: Bank = {
        updatedAt: now,
        slug: bank.slug,
        name: bank.name,
        shortName: bank.shortName,
        symbol: bank.symbol,
        rates: {
          ...((banks[bank.slug]?.rates || {}) as BankRates),
          ...updates,
        },
      }

      const newBanks = {
        ...banks,
        [bank.slug]: bankData,
      }

      const update = {
        ...existing,
        updatedAt: now,
        banks: newBanks,
      } as MaybeDocument

      await bankRatesNewDB
        .insert(update)
        .then(() => {
          console.log(`Updated rates for ${bank.name}.`)
        })
        .catch((e) => {
          console.error(`Error updating rates for ${bank.name}:`, e)
        })
    } catch (e) {
      console.error(`Error running job for ${bank.name}:`, e)
    }
  }
}

cron.schedule('*/20 * * * *', runBankJobs, {
  name: 'bank_jobs',
})

runBankJobs()
