import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getAddisRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Addis Bank exchange rates...')

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

    const url = 'https://addisbanksc.com/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = '#tablepress-13 tbody tr'

    await page.waitForSelector(currencySelector).catch((e) => {
      console.error('Selector not found', e)
    })
    console.log('Selector found')

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))

      return rows.reduce((acc: any, row) => {
        const cells = row.querySelectorAll('td')

        // Check if all required cells are available
        if (cells.length < 3) return acc

        const currencyCode = cells[0].innerText.trim().toUpperCase()
        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())

        // Check for NaN values
        if (!currencyCode || isNaN(cashBuying) || isNaN(cashSelling)) return acc

        acc[currencyCode] = {
          cashBuying,
          cashSelling,
        }

        return acc
      }, {})
    }, currencySelector)

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
    if (browser) {
      browser.close()
    }
  }
}
