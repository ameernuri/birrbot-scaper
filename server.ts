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
import moment from 'moment'

const cron = Sentry.cron.instrumentNodeCron(nodeCron)

const bankJobs = [
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
    slug: 'zemen',
    symbol: 'zmn',
    name: 'Zemen Bank',
    shortName: 'Zemen Bank',
    job: getZemenRates,
  },
]

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

  const rates = (await bankRatesNewDB
    .get('current_bank_rates')
    .catch(() => null)) as any

  const banks = rates?.banks

  // sort bankJobs by rates.rows updated at date
  const bjs = bankJobs
    .filter((job) => {
      return moment(banks[job.slug]?.updatedAt).isBefore(
        moment().subtract(10, 'minutes')
      )
    })
    .sort((a, b) => {
      const aRates = banks[a.slug]
      const bRates = banks[b.slug]

      const aRatesUpdatedAt = aRates?.updatedAt || null
      const bRatesUpdatedAt = bRates?.updatedAt || null

      return (
        new Date(aRatesUpdatedAt).getTime() -
        new Date(bRatesUpdatedAt).getTime()
      )
    })

  for (const bank of bjs) {
    try {
      console.log('running job:', bank.name)
      const res = await bank.job()

      if (!res || !(Object.keys(res).length > 0)) {
        console.warn(`No rates returned for ${bank.name}. Skipping update.`)
        continue // Skip to the next bank job
      }

      const existing = (await bankRatesNewDB
        .get('current_bank_rates')
        .catch(() => null)) as any

      const now = new Date().toISOString()

      const { slug, name, shortName, symbol } = bank

      const updates = Object.keys(res).reduce((a, c) => {
        const update = {
          [c]: { ...res[c], updatedAt: now },
        }

        return {
          ...a,
          ...update,
        }
      }, {})

      const rates = {
        ...(existing?.banks?.[slug]?.rates || {}),
        ...updates,
      }

      const parsed = {
        [slug]: {
          updatedAt: now,
          slug,
          name,
          shortName,
          symbol,
          rates,
        },
      }

      if (existing) {
        const update = {
          ...existing,
          updatedAt: now,
          banks: {
            ...existing.banks,
            ...parsed,
          },
        } as MaybeDocument
        await bankRatesNewDB.insert(update)
      } else {
        await bankRatesNewDB.insert({
          _id: 'current_bank_rates',
          updatedAt: now,
          banks: parsed,
        } as MaybeDocument)
      }
    } catch (e) {
      console.error(`Error running job for ${bank.name}:`, e)
    }
  }
}

cron.schedule('*/20 * * * *', runBankJobs, {
  name: 'bank_jobs',
})

runBankJobs()
