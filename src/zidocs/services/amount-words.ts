// Indian numbering system: Lakh, Crore
// Input: total paise (BIGINT)
// Output: "Rupees One Lakh Twenty Three Thousand and Fifty Paise Only"

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

function toWords(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) return TENS[Math.floor(n / 10)] + (n % 10 ? ' ' + ONES[n % 10] : '')
  if (n < 1_000) {
    const rem = n % 100
    return ONES[Math.floor(n / 100)] + ' Hundred' + (rem ? ' and ' + toWords(rem) : '')
  }
  if (n < 1_00_000) {           // up to 99,999
    const rem = n % 1_000
    return toWords(Math.floor(n / 1_000)) + ' Thousand' + (rem ? ' ' + toWords(rem) : '')
  }
  if (n < 1_00_00_000) {        // up to 99,99,999
    const rem = n % 1_00_000
    return toWords(Math.floor(n / 1_00_000)) + ' Lakh' + (rem ? ' ' + toWords(rem) : '')
  }
  // Crore and above
  const rem = n % 1_00_00_000
  return toWords(Math.floor(n / 1_00_00_000)) + ' Crore' + (rem ? ' ' + toWords(rem) : '')
}

export function amountInWords(totalPaise: number): string {
  if (!totalPaise || totalPaise === 0) return 'Zero Rupees Only'
  const rupees   = Math.floor(totalPaise / 100)
  const paise    = totalPaise % 100
  let result = 'Rupees ' + toWords(rupees).trim()
  if (paise > 0) result += ' and ' + toWords(paise).trim() + ' Paise'
  return result + ' Only'
}
