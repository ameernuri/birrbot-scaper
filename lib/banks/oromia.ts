import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getOromiaBankRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Oromia Bank exchange rates...')

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

    const url = 'https://www.oromiabank.com/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = 'table tbody tr'

    await page.waitForSelector(currencySelector)

    const exchangeRates: {
      [key: string]: { cashBuying: number; cashSelling: number }
    } = {}

    console.log('Scraping page...')
    const pageRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))

      return rows.reduce((acc: any, row) => {
        const cells = row.querySelectorAll('td')

        if (
          cells.length >= 3 &&
          cells[0].innerText.trim() !== '' &&
          cells[1].innerText.trim() !== '' &&
          cells[2].innerText.trim() !== ''
        ) {
          const currencyText = cells[0].innerText.trim()
          const currencyCode = currencyText.trim().slice(-4, -1).toUpperCase()
          const cashBuying = parseFloat(cells[1].innerText.trim())
          const cashSelling = parseFloat(cells[2].innerText.trim())

          if (!currencyCode || isNaN(cashBuying) || isNaN(cashSelling))
            return acc

          acc[currencyCode] = {
            cashBuying,
            cashSelling,
          }
        }

        return acc
      }, {})
    }, currencySelector)

    Object.assign(exchangeRates, pageRates)

    await browser.close()

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
  } finally {
    if (browser) browser.close()
  }
}
