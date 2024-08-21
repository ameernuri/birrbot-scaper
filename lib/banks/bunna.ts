import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getBunnaRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Bunna Bank exchange rates...')

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

    const url = 'https://bunnabanksc.com/foreign-exchange/'

    // Navigate to the page and wait for the content to load
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 120000 })
    await page.waitForSelector('.currency-table')

    console.log('Parsing exchange rates...')

    const currencySelector = '.currency-table tbody tr'

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))

      return rows.reduce((acc, row) => {
        const cells = row.querySelectorAll('td')

        if (!cells || cells.length < 5) return acc

        const currency = cells[0].innerText.trim()

        const cashBuying = parseFloat(cells[2].innerText.trim())
        const cashSelling = parseFloat(cells[3].innerText.trim())
        const transactionalBuying = parseFloat(cells[4].innerText.trim())
        const transactionalSelling = parseFloat(cells[5].innerText.trim())

        return {
          ...acc,
          [currency]: {
            cashBuying,
            cashSelling,
            transactionalBuying,
            transactionalSelling,
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
