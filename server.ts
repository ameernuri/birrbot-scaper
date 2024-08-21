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

const cron = Sentry.cron.instrumentNodeCron(nodeCron)

const bankJobs = [
  {
    slug: 'nbe',
    short: 'nbe',
    name: 'National Bank of Ethiopia',
    job: getNbeRates,
  },
  {
    slug: 'cbe',
    short: 'cbe',
    name: 'Commercial Bank of Ethiopia',
    job: getCbeRates,
  },
  {
    slug: 'abyssinia',
    short: 'boa',
    name: 'Bank of Abyssinia',
    job: getAbyssiniaRates,
  },
  {
    slug: 'abay',
    short: 'aba',
    name: 'Abay Bank',
    job: getAbayRates,
  },
  {
    slug: 'addis',
    short: 'add',
    name: 'Addis International Bank',
    job: getAddisRates,
  },
  {
    slug: 'ahadu',
    short: 'aha',
    name: 'Ahadu Bank',
    job: getAhaduRates,
  },
  {
    slug: 'amhara',
    short: 'amh',
    name: 'Amhara Bank',
    job: getAmharaBankRates,
  },
  {
    slug: 'awash',
    short: 'awa',
    name: 'Awash Bank',
    job: getAwashRates,
  },
  {
    slug: 'berhan',
    short: 'brh',
    name: 'Berhan Bank',
    job: getBerhanRates,
  },
  {
    slug: 'bunna',
    short: 'bun',
    name: 'Bunna Bank',
    job: getBunnaRates,
  },
  {
    slug: 'coop',
    short: 'coo',
    name: 'Cooperative Bank of Oromia',
    job: getCoopRates,
  },
  {
    slug: 'dashen',
    short: 'dsh',
    name: 'Dashen Bank',
    job: getDashenRates,
  },
  {
    slug: 'enat',
    short: 'ena',
    name: 'Enat Bank',
    job: getEnatRates,
  },
  {
    slug: 'gadaa',
    short: 'gad',
    name: 'Gadaa Bank',
    job: getGadaaRates,
  },
  {
    slug: 'global',
    short: 'glo',
    name: 'Global Bank',
    job: getGlobalBankRates,
  },
  {
    slug: 'goh',
    short: 'goh',
    name: 'Goh Betoch Bank',
    job: getGohBetRates,
  },
  {
    slug: 'hibret',
    short: 'hib',
    name: 'Hibret Bank',
    job: getHibretRates,
  },
  {
    slug: 'hijra',
    short: 'hij',
    name: 'Hijra Bank',
    job: getHijraRates,
  },
  {
    slug: 'nib',
    short: 'nib',
    name: 'Nib International Bank',
    job: getNibRates,
  },
  {
    slug: 'oromia',
    short: 'oro',
    name: 'Oromia Bank',
    job: getOromiaBankRates,
  },
  {
    slug: 'siinqee',
    short: 'snq',
    name: 'Siinqee Bank',
    job: getSiinqeeRates,
  },
  {
    slug: 'tsedey',
    short: 'tsd',
    name: 'Tsedey Bank',
    job: getTsedeyBankRates,
  },
  {
    slug: 'tsehay',
    short: 'tsa',
    name: 'Tsehay Bank',
    job: getTsehayRates,
  },
  {
    slug: 'wegagen',
    short: 'weg',
    name: 'Wegagen Bank',
    job: getWegagenRates,
  },
  {
    slug: 'zemen',
    short: 'zmn',
    name: 'Zemen Bank',
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
  for (const bank of bankJobs) {
    try {
      console.log('running job:', bank.name)
      const rates = await bank.job()

      if (!rates) {
        console.warn(`No rates returned for ${bank.name}. Skipping update.`)
        continue // Skip to the next bank job
      }

      const bankRatesNewDB = await db('birrbot/bank_rate_new')

      const existing = (await bankRatesNewDB
        .get('current_bank_rates')
        .catch(() => null)) as any

      const now = new Date().toISOString()

      const { slug, name, short } = bank

      const parsed = {
        [slug]: {
          updatedAt: now,
          slug,
          name,
          short,
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
