import axios from 'axios'
import Sentry from '../sentry'

const CBE_URL =
  'https://www.combanketh.et/cbeapi/daily-exchange-rates?_limit=500&_sort=Date%3ADESC'

export const getCbeRatesRaw = async () => {
  try {
    const res = await axios.get(CBE_URL, {}).catch(console.log)

    if (!res) {
      throw new Error('CBE Rates Request failed')
    }

    return res?.data
  } catch (e) {
    Sentry.captureException(e)
  }
}

export const getCbeRates = async () => {
  console.log('Fetching CBE exchange rates...')

  try {
    const res = await axios.get(CBE_URL, {}).catch(console.log)

    if (!res) {
      throw new Error('CBE Rates Request failed')
    }

    const rates = ((res?.data || [])[0]['ExchangeRate'] || []).reduce(
      (
        acc: any,
        {
          cashBuying,
          cashSelling,
          transactionalBuying,
          transactionalSelling,
          currency,
        }: any
      ) => {
        if (
          !cashBuying &&
          !cashSelling &&
          !transactionalBuying &&
          !transactionalSelling
        )
          return acc
        return {
          ...acc,
          [currency?.CurrencyCode]: {
            cashBuying,
            cashSelling,
            transactionalBuying,
            transactionalSelling,
          },
        }
      },
      {}
    )

    return rates
  } catch (e) {
    Sentry.captureException(e)
  }
}
