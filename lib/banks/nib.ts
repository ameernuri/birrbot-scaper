import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getNibRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Nib Bank exchange rates...')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
    executablePath,
    timeout: 15000,
  })

  if (!browser) {
    Sentry.captureException(new Error('Failed to launch browser'))
    return
  }

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

    const url = 'https://www.nibbanksc.com/exchange-rate'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = 'table tbody tr'

    await page
      .waitForSelector(currencySelector, { timeout: 15000 })
      .catch((e) => {
        console.error('selector not found', e)
      })
    console.log('selector found')

    const exchangeRates = await page.evaluate((selector) => {
      const rows = Array.from(document.querySelectorAll(selector))

      return rows.reduce((acc: any, row) => {
        const cells = row.querySelectorAll('td')

        // Check if all required cells are available
        if (cells.length < 6) return acc

        const currencyCode = cells[1].innerText.trim().toUpperCase()
        const cashBuying = parseFloat(cells[2].innerText.trim())
        const cashSelling = parseFloat(cells[3].innerText.trim())
        const transactionalBuying = parseFloat(cells[4].innerText.trim())
        const transactionalSelling = parseFloat(cells[5].innerText.trim())

        // Correct the logic for checking values
        if (
          !currencyCode ||
          isNaN(cashBuying) ||
          isNaN(cashSelling) ||
          isNaN(transactionalBuying) ||
          isNaN(transactionalSelling)
        )
          return acc

        acc[currencyCode] = {
          cashBuying,
          cashSelling,
          transactionalBuying,
          transactionalSelling,
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
    if (browser) browser.close()
  }
}
