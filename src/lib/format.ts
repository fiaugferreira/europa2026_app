import { trip, type Currency, type WalletId } from '../data/trip';

export type ExchangeRates = {
  EUR_USD: number; // USD para 1 EUR
  DKK_USD: number; // DKK para 1 USD
  CHF_USD: number; // CHF para 1 USD
};

export const fallbackRates: ExchangeRates = {
  EUR_USD: trip.rates.EUR_USD,
  DKK_USD: trip.rates.DKK_USD,
  CHF_USD: trip.rates.CHF_USD,
};

export const brDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(`${iso}T12:00:00`));

export const brFullDate = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(`${iso}T12:00:00`));

export const shortDay = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
    .format(new Date(`${iso}T12:00:00`))
    .replace('.', '')
    .toUpperCase();

export const money = (value: number, currency: Currency) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: currency === 'DKK' ? 0 : 2,
    maximumFractionDigits: currency === 'DKK' ? 0 : 2,
  }).format(value);

export const compactMoney = (value: number, currency: Currency) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Converte qualquer moeda usada na viagem para USD.
 *
 * Regras:
 * EUR -> multiplica por EUR_USD
 * DKK -> divide por DKK_USD
 * CHF -> divide por CHF_USD
 */
export function toUSD(
  value: number,
  currency: Currency,
  rates: ExchangeRates = fallbackRates,
) {
  if (currency === 'USD') return roundMoney(value);

  if (currency === 'EUR') {
    return roundMoney(value * rates.EUR_USD);
  }

  if (currency === 'DKK') {
    return roundMoney(value / rates.DKK_USD);
  }

  if (currency === 'CHF') {
    return roundMoney(value / rates.CHF_USD);
  }

  // BRL não faz parte do caixa principal da viagem.
  // Mantemos somente como fallback para lançamentos excepcionais.
  if (currency === 'BRL') {
    return roundMoney(value / 5.5);
  }

  return roundMoney(value);
}

/**
 * Determina em qual moeda o caixa será efetivamente reduzido.
 *
 * EUR -> EUR
 * DKK -> USD
 * CHF -> USD
 * USD -> USD
 */
export function walletDebitCurrency(currency: Currency): 'EUR' | 'USD' {
  if (currency === 'EUR') return 'EUR';
  return 'USD';
}

/**
 * Valor que realmente deve ser baixado da carteira.
 *
 * Exemplo:
 * 500 DKK -> aproximadamente US$ 77,52
 * 100 CHF -> aproximadamente US$ 123
 * € 50 -> € 50
 */
export function walletDebitAmount(
  value: number,
  currency: Currency,
  rates: ExchangeRates = fallbackRates,
) {
  if (currency === 'EUR') return roundMoney(value);

  return toUSD(value, currency, rates);
}

/**
 * Sugestão de carteira.
 *
 * Para EUR o usuário ainda deverá escolher:
 * - dinheiro físico
 * - Nomad EUR
 *
 * DKK e CHF sempre vão para Nomad USD.
 */
export function suggestedWalletForCurrency(
  currency: Currency,
): WalletId | undefined {
  if (currency === 'DKK' || currency === 'CHF' || currency === 'USD') {
    return 'usdnomad';
  }

  return undefined;
}

export function exchangeExplanation(
  value: number,
  currency: Currency,
  rates: ExchangeRates = fallbackRates,
) {
  if (currency === 'DKK') {
    return `${money(value, 'DKK')} → ${money(
      toUSD(value, 'DKK', rates),
      'USD',
    )}`;
  }

  if (currency === 'CHF') {
    return `${money(value, 'CHF')} → ${money(
      toUSD(value, 'CHF', rates),
      'USD',
    )}`;
  }

  if (currency === 'EUR') {
    return money(value, 'EUR');
  }

  return money(value, currency);
}

export const googleMaps = (
  name: string,
  address?: string,
  lat?: number,
  lng?: number,
) => {
  const q =
    lat !== undefined && lng !== undefined
      ? `${lat},${lng}`
      : [name, address].filter(Boolean).join(', ');

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    q,
  )}`;
};

export const googleMapsDirections = (
  destinationName: string,
  address?: string,
  lat?: number,
  lng?: number,
) => {
  const destination =
    lat !== undefined && lng !== undefined
      ? `${lat},${lng}`
      : [destinationName, address].filter(Boolean).join(', ');

  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destination,
  )}`;
};

export const wikiThumb = async (title?: string) => {
  if (!title) return undefined;

  try {
    const response = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title,
      )}`,
    );

    if (!response.ok) return undefined;

    const json = await response.json();
    return json.thumbnail?.source as string | undefined;
  } catch {
    return undefined;
  }
};
