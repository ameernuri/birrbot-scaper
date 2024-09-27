import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getWegagenRates = async () => {
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

    const url = 'https://www.wegagen.com'

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    )

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait for the button that opens the exchange rate section
    await page.waitForSelector('a._iconlink_zd5m9_27', { timeout: 15000 })

    // Click the button to load the exchange rates
    await page.click('a._iconlink_zd5m9_27')

    // Wait for the exchange rates table to load
    await page.waitForSelector('div._popexchange_zd5m9_487 tbody > tr', {
      timeout: 15000,
    })

    console.log('parsing...')

    const selector = 'div._popexchange_zd5m9_487 tbody > tr'

    const rates = await page.evaluate((sel) => {
      const rows = Array.from(document.querySelectorAll(sel))

      return rows.reduce((acc: any, row) => {
        const cells = row.querySelectorAll('td')

        if (!cells || cells.length < 7) return acc

        const currency = cells[1].innerText.trim()
        const cashBuying = parseFloat(cells[3].innerText.trim())
        const cashSelling = parseFloat(cells[4].innerText.trim())
        const transactionalBuying = parseFloat(cells[5].innerText.trim())
        const transactionalSelling = parseFloat(cells[6].innerText.trim())

        acc[currency] = {
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
