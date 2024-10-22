import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getAnbesaBankRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH || undefined

  console.log('Scraping Anbesa Bank exchange rates...')

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

    const url = 'https://anbesabank.com/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    // Scroll the page to ensure lazy-loaded images are loaded
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight)
    })

    console.log('Parsing exchange rates...')

    const rates = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('table tbody tr'))
      const result: any = {}

      const currencyMap: { [key: string]: string } = {
        usd: 'USD',
        pound: 'GBP',
        euro: 'EUR',
        // Add more mappings as necessary
      }

      rows.forEach((row) => {
        const cells = row.querySelectorAll('td')
        if (cells.length < 3) return // Ensure row has enough columns

        const img = cells[0].querySelector('img')
        let currency = ''

        if (img) {
          // Check if data-src is available for lazy-loaded images
          const lazySrc = img.getAttribute('data-src') || img.src
          const currencyKey = lazySrc.split('/').pop()?.split('-')[0] || ''
          currency =
            currencyMap[currencyKey.toLowerCase()] || currencyKey.toUpperCase()
        }

        const cashBuying = parseFloat(cells[1].innerText.trim())
        const cashSelling = parseFloat(cells[2].innerText.trim())

        if (currency && !isNaN(cashBuying) && !isNaN(cashSelling)) {
          result[currency] = {
            cashBuying,
            cashSelling,
          }
        }
      })

      return result
    })

    await browser.close()

    if (rates && Object.keys(rates).length > 0) {
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
