const axios = require('axios')

export const getNbeRates = async () => {
  console.log('Fetching NBE exchange rates...')
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: 'https://api.nbe.gov.et/api/filter-transaction-exchange',
    headers: {
      accept: '*/*',
      'accept-language': 'en-US,en;q=0.9',
    },
  }

  try {
    const response = await axios.request(config)
    const data = response.data?.data

    if (!data) {
      throw new Error('Invalid response from NBE API')
    } else {
      return data.reduce((a: any, c: any) => {
        return {
          ...a,
          [c.currency.code]: {
            transactionalBuying: parseFloat(c.buying),
            transactionalSelling: parseFloat(c.selling),
          },
        }
      }, {})
    }
  } catch (error) {
    console.log(error)
  }
}
