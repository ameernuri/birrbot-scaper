import axios from 'axios'
import * as cheerio from 'cheerio'
import Sentry from '../sentry'

export const getAbayRates = async () => {
  console.log('Scraping Abay Bank exchange rates...')

  try {
    const url = 'https://abaybank.com.et/exchange-rates/'

    // Fetch the HTML content
    const { data } = await axios.get(url)

    console.log('Parsing exchange rates...')

    // Load the HTML into Cheerio
    const $ = cheerio.load(data)

    const currencySelector = 'table tbody tr'

    const exchangeRates = $(currencySelector)
      .get()
      .reduce((acc, row) => {
        const cells = $(row).find('td')

        const currencyCode = $(cells[0]).text().trim().slice(-3).toUpperCase()
        const cashBuying = parseFloat($(cells[1]).text().trim())
        const cashSelling = parseFloat($(cells[2]).text().trim())

        if (!currencyCode || isNaN(cashBuying) || isNaN(cashSelling)) return acc

        return {
          ...acc,
          [currencyCode]: {
            cashBuying,
            cashSelling,
          },
        }
      }, {} as Record<string, { cashBuying: number; cashSelling: number }>)

    if (Object.keys(exchangeRates).length > 0) {
      console.log({ exchangeRates })
      return exchangeRates
    } else {
      console.log('Exchange rates not found.')
      return null
    }
  } catch (e) {
    console.error('Error fetching exchange rates:', e)
    Sentry.captureException(e)
    return null
  }
}
