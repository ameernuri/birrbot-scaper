import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getZemenRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Zemen Bank exchange rates...')

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

    const url = 'https://zemenbank.com/exchange-rates'

    await page.goto(url)

    console.log('Parsing Zemen Bank exchange rates...')

    const currencySelector = '.currency-exchange-table tbody tr.currency-entry'

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))

      return rows.reduce((acc, row) => {
        const currencyCode = row
          .querySelector('.media-heading')
          ?.textContent?.trim()
          .toUpperCase()

        // Get the buying and selling rates from the current-rate elements
        const cashBuying = parseFloat(
          (row.querySelectorAll('.current-rate')[0]?.textContent || '').trim()
        )
        const cashSelling = parseFloat(
          (row.querySelectorAll('.current-rate')[1]?.textContent || '').trim()
        )
        if (!currencyCode || isNaN(cashBuying) || isNaN(cashSelling)) return acc

        return {
          ...acc,
          [currencyCode]: {
            cashBuying,
            cashSelling,
          },
        }
      }, {})
    }, currencySelector)

    browser.close()

    if (Object.keys(exchangeRates).length > 0) {
      console.log({ exchangeRates })
      return exchangeRates
    } else {
      console.log('Exchange rates not found.')
    }
  } catch (e) {
    console.log(e)
    Sentry.captureException(e)
  } finally {
    if (browser) await browser.close()
  }
}
