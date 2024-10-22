import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getCoopRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH || undefined

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

    const url = 'https://coopbankoromia.com.et/daily-exchange-rates/'

    await page.goto(url, {
      waitUntil: 'domcontentloaded',
    })

    const selector = '#exchange-rates-table tbody tr'

    console.log('parsing...')

    const rates = await page.evaluate((sel) => {
      const rows = Array.from(document.querySelectorAll(sel))

      return rows.reduce((acc: any, row) => {
        const cells = row.querySelectorAll('td')

        if (!cells || cells.length < 5) return acc
        const currencyName = cells[0].innerText.trim().split('-')[0].trim()

        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())
        const transactionalBuying = parseFloat(cells[3].innerText.trim())
        const transactionalSelling = parseFloat(cells[4].innerText.trim())

        acc[currencyName] = {
          cashBuying,
          cashSelling,
          transactionalBuying,
          transactionalSelling,
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
