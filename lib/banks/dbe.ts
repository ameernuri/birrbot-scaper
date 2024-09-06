import vision from '@google-cloud/vision'
import axios from 'axios'
import * as cheerio from 'cheerio'

const findExchangeImgUrls = async () => {
  try {
    const { data: html } = await axios.get('https://www.dbe.com.et/')
    const $ = cheerio.load(html)

    // Get all image elements whose URLs contain "exchange_rate"
    const imgUrls = $('img')
      .map((_, el) => $(el).attr('src'))
      .get()
      .filter((url) => url && url.toLowerCase().includes('exchange_rate'))
      .map((url) =>
        url.startsWith('http') ? url : `https://www.dbe.com.et/${url}`
      )

    if (imgUrls.length) {
      console.log('Found exchange rate image URLs:', imgUrls)
      return imgUrls
    } else {
      console.log('No exchange rate image URLs found.')
      return []
    }
  } catch (error) {
    console.error('Error while finding exchange rate image URLs:', error)
    return []
  }
}

const client = new vision.ImageAnnotatorClient()

async function detectTextFromUrl(imageUrl: string) {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })
    const imageBuffer = Buffer.from(response.data, 'binary')

    const [result] = await client.textDetection({
      image: { content: imageBuffer },
    })
    const detections = result.textAnnotations

    if (detections?.length) {
      const text = detections[0].description
      console.log('Detected text from:', imageUrl)
      console.log(text)
      return text
    } else {
      console.log('No text detected in image:', imageUrl)
      return ''
    }
  } catch (error) {
    console.error('Error during text detection for image:', imageUrl, error)
    return ''
  }
}

function parseExchangeRates(text: string) {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line)

  const rates: any = {}
  let currentCurrency = ''

  lines.forEach((line, index) => {
    const parts = line.split(/\s+/)

    if (parts.length === 1 && parts[0].length === 3) {
      currentCurrency = parts[0]
      rates[currentCurrency] = {}
    } else if (parts.length === 1 && !isNaN(parseFloat(parts[0]))) {
      const value = parseFloat(parts[0])
      const nextLine = lines[index + 1]?.split(/\s+/)

      if (
        nextLine &&
        nextLine.length === 1 &&
        !isNaN(parseFloat(nextLine[0]))
      ) {
        rates[currentCurrency].cashBuying = value
        rates[currentCurrency].transactionalBuying = value
        rates[currentCurrency].cashSelling = parseFloat(nextLine[0])
        rates[currentCurrency].transactionalSelling = parseFloat(nextLine[0])
      }
    }
  })

  return rates
}

export const getDbeRates = async () => {
  const imageUrls = await findExchangeImgUrls()

  if (!imageUrls.length) {
    console.log('No exchange rate image URLs found.')
    return null
  }

  // Iterate over all images and try to detect exchange rates
  for (const imageUrl of imageUrls) {
    const text = await detectTextFromUrl(imageUrl)

    if (text) {
      const rates = parseExchangeRates(text)

      // Check if rates are successfully parsed (you can improve this check)
      if (Object.keys(rates).length > 0) {
        console.log('Parsed rates from image:', imageUrl)
        console.log(JSON.stringify(rates, null, 2))
        return rates
      }
    }
  }

  console.log('No valid exchange rate data found in any image.')
  return null
}
