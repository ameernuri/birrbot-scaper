import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getHibretRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

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
    const url = 'https://www.hibretbank.com.et/'

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 120000,
    })

    const selector = '#exchange-rate tbody tr'

    console.log('Parsing...')

    const rates = await page.evaluate((sel) => {
      const rows = Array.from(document.querySelectorAll(sel))

      return rows.reduce((acc: any, row) => {
        const cells = row.querySelectorAll('td')

        if (!cells || cells.length < 3) return acc

        const currencyText = cells[0].innerText.trim()
        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())

        if (!cashBuying && !cashSelling) return acc

        const currencyMatch = currencyText.match(/^\d+ (.+)$/)
        const currency = currencyMatch ? currencyMatch[1] : currencyText

        acc[currency] = {
          cashBuying,
          cashSelling,
        }

        return acc
      }, {})
    }, selector)

    await browser.close()

    if (rates && Object.keys(rates).length > 0) {
      console.log('Exchange Rates:', rates)
      return rates
    } else {
      console.log('Rates not found.')
    }
  } catch (e) {
    console.error('Error fetching exchange rates:', e)
    Sentry.captureException(e)
    return null
  } finally {
    if (browser) browser.close()
  }
}
