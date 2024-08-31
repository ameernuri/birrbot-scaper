import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getTsehayRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

  console.log('Scraping Tsehay Bank exchange rates...')

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

    page.setViewport({
      width: 1280,
      height: 800,
    })

    const url = 'https://tsehaybank.com.et/exchange-rate/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const rates = await page.evaluate(() => {
      const rows = Array.from(
        document.querySelectorAll('#tablepress-7 tbody tr')
      )
      const result: any = {}

      rows.slice(2, -1).forEach((row) => {
        // Skip header rows and last empty row
        const cells = row.querySelectorAll('td')
        const currency = cells[0].innerText.trim().replace(/<.*>/, '') // Clean HTML tags
        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())
        const transactionalBuying = parseFloat(cells[3].innerText.trim())
        const transactionalSelling = parseFloat(cells[4].innerText.trim())

        if (
          !isNaN(cashBuying) &&
          !isNaN(cashSelling) &&
          !isNaN(transactionalBuying) &&
          !isNaN(transactionalSelling)
        ) {
          result[currency] = {
            cashBuying,
            cashSelling,
            transactionalBuying,
            transactionalSelling,
          }
        }
      })

      return result
    })

    await browser.close()

    if (rates) {
      console.log({ rates })
      return rates
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
