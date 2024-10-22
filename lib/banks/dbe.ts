import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getDbeRates = async () => {
  const executablePath = process.env.CHROMIUM_PATH || undefined

  console.log('Scraping Development Bank of Ethiopia exchange rates...')

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

    const url = 'https://dbe.com.et/'
    await page.goto(url, { waitUntil: 'domcontentloaded' })

    console.log('Parsing exchange rates...')

    const currencySelector = '#tablepress-1 tbody tr'
    const nextButtonSelector = '#tablepress-1_next'

    const exchangeRates: {
      [key: string]: {
        cashBuying: number
        cashSelling: number
      }
    } = {}

    let hasNextPage = true

    while (hasNextPage) {
      await page.waitForSelector(currencySelector, { timeout: 15000 })

      const pageRates = await page.evaluate((selector) => {
        const rows = Array.from(document.querySelectorAll(selector))

        return rows.reduce((acc: any, row) => {
          const cells = row.querySelectorAll('td')

          if (cells.length >= 4) {
            const currencyCode = cells[1].innerText.trim().toUpperCase()
            const cashBuying = parseFloat(cells[2].innerText.trim())
            const cashSelling = parseFloat(cells[3].innerText.trim())

            if (currencyCode && !isNaN(cashBuying) && !isNaN(cashSelling)) {
              acc[currencyCode] = {
                cashBuying,
                cashSelling,
              }
            }
          }

          return acc
        }, {})
      }, currencySelector)

      Object.assign(exchangeRates, pageRates)

      const isNextDisabled = await page.$eval(nextButtonSelector, (btn) =>
        btn.classList.contains('disabled')
      )

      hasNextPage = !isNextDisabled

      if (hasNextPage) {
        await page.click(nextButtonSelector)
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }

    await browser.close()

    if (Object.keys(exchangeRates).length > 0) {
      // console.log({ exchangeRates })
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
