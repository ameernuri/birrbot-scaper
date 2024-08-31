import puppeteer from 'puppeteer'
import Sentry from '../sentry'

export const getDashenRates = async () => {
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

    const url = 'https://dashenbanksc.com/daily-exchange-rates/'

    await page.goto(url, { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('.et_pb_all_tabs', { timeout: 15000 })

    const scrapeTable = async (tableIndex: number) => {
      try {
        await page.click(`ul.et_pb_tabs_controls li.et_pb_tab_${tableIndex} a`)
        await page.waitForSelector(`.et_pb_tab_${tableIndex}`)

        return page.evaluate(() => {
          const rows = Array.from(
            document.querySelectorAll('.et_pb_tab_content tbody tr')
          ).slice(1)
          return rows.map((row) => {
            const cells = row.querySelectorAll('td')
            const buy = parseFloat(cells[2].innerText.trim())
            const sell = parseFloat(cells[3].innerText.trim())

            if (!buy || !sell) return

            return {
              currencyCode: cells[0].textContent
                ?.trim()
                .slice(-3)
                .toUpperCase(),
              buy,
              sell,
            }
          })
        })
      } catch (error) {
        console.error(`Failed to scrape table ${tableIndex}:`, error)
        return []
      }
    }

    const cash = await scrapeTable(0)
    const transactional = await scrapeTable(1)

    const rates = cash.reduce((acc, rate) => {
      if (!rate) return acc
      const { currencyCode: code, buy: cashBuying, sell: cashSelling } = rate

      if (!code) return acc
      return {
        ...acc,
        [code.toUpperCase()]: {
          cashBuying,
          cashSelling,
          transactionalBuying: transactional.find(
            (t) => t?.currencyCode?.toLowerCase().trim() === code?.toLowerCase()
          )?.buy,
          transactionalSelling: transactional.find(
            (t) => t?.currencyCode?.toLowerCase().trim() === code?.toLowerCase()
          )?.sell,
        },
      }
    }, {})

    console.log(rates)

    await browser.close()
    return rates
  } catch (e) {
    console.error('Error fetching exchange rates:', e)
    Sentry.captureException(e)
    return null
  } finally {
    if (browser) browser.close()
  }
}
