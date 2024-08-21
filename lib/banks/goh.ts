import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getGohBetRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Goh Bet Bank exchange rates...')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
    executablePath,
  })

  try {
    const page = await browser.newPage()

    page.setRequestInterception(true)
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font'].includes(req.resourceType())) {
        req.abort()
      } else {
        req.continue()
      }
    })

    const url = 'https://www.gohbetbank.com/todays-exchange-rate/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = '.ea-advanced-data-table tbody tr'

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))

      return rows.reduce((acc, row) => {
        const cells = row.querySelectorAll('td')

        const currencyCode = cells[0]
          .querySelector('strong')
          ?.innerText.trim()
          .toUpperCase()
        const cashBuying = parseFloat(cells[2].innerText.trim())
        const cashSelling = parseFloat(cells[3].innerText.trim())

        if (!currencyCode || !cashBuying || !cashSelling) return acc

        return {
          ...acc,
          [currencyCode]: {
            cashBuying,
            cashSelling,
          },
        }
      }, {})
    }, currencySelector)

    await browser.close()

    if (exchangeRates) {
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
  } finally {
    if (browser) browser.close()
  }
}
