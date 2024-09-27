import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getBunnaRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH

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

    const url = 'https://bunnabanksc.com/foreign-exchange/'

    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
    )

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    })

    // Wait for the table to load
    await page.waitForSelector('table.currency-table tbody > tr', {
      timeout: 15000,
    })

    console.log('parsing...')

    const selector = 'table.currency-table tbody > tr'

    const rates = await page.evaluate((sel) => {
      const rows = Array.from(document.querySelectorAll(sel))

      return rows.reduce((acc: any, row) => {
        const cells = row.querySelectorAll('td')

        if (!cells || cells.length < 6) return acc

        const currencyCode = cells[0].innerText.trim()
        const currencyName = cells[1].innerText.trim()
        const cashBuying = parseFloat(cells[2].innerText.trim())
        const cashSelling = parseFloat(cells[3].innerText.trim())
        const transactionalBuying = parseFloat(cells[4].innerText.trim())
        const transactionalSelling = parseFloat(cells[5].innerText.trim())

        acc[currencyCode] = {
          currencyName,
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
