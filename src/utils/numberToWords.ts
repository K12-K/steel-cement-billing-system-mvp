const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function twoDigitsToWords(n: number): string {
  if (n < 20) return ONES[n];
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return `${TENS[ten]}${one ? ` ${ONES[one]}` : ''}`.trim();
}

function threeDigitsToWords(n: number): string {
  const hundred = Math.floor(n / 100);
  const rem = n % 100;
  const parts: string[] = [];
  if (hundred > 0) parts.push(`${ONES[hundred]} Hundred`);
  if (rem > 0) parts.push(twoDigitsToWords(rem));
  return parts.join(' ').trim();
}

function integerToIndianWords(num: number): string {
  if (num === 0) return 'Zero';

  const parts: string[] = [];
  let remaining = Math.floor(num);

  const crore = Math.floor(remaining / 10000000);
  if (crore > 0) {
    parts.push(`${integerToIndianWords(crore)} Crore`);
    remaining %= 10000000;
  }

  const lakh = Math.floor(remaining / 100000);
  if (lakh > 0) {
    parts.push(`${twoDigitsToWords(lakh)} Lakh`);
    remaining %= 100000;
  }

  const thousand = Math.floor(remaining / 1000);
  if (thousand > 0) {
    parts.push(`${twoDigitsToWords(thousand)} Thousand`);
    remaining %= 1000;
  }

  if (remaining > 0) {
    parts.push(threeDigitsToWords(remaining));
  }

  return parts.join(' ').trim();
}

export function numberToIndianRupeesWords(amount: number): string {
  if (isNaN(amount) || amount < 0) return 'Rupees Zero Only';
  const rounded = Math.round(amount * 100) / 100;
  const rupees = Math.floor(rounded);
  const paise = Math.round((rounded - rupees) * 100);

  const rupeeWords = integerToIndianWords(rupees);
  if (paise > 0) {
    return `Rupees ${rupeeWords} and ${twoDigitsToWords(paise)} Paise Only`;
  }
  return `Rupees ${rupeeWords} Only`;
}
