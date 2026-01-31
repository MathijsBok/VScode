/**
 * Map of countries to their typical GMT offset
 */
const countryToTimezone: Record<string, string> = {
  'Afghanistan': 'GMT+4:30',
  'Albania': 'GMT+1',
  'Algeria': 'GMT+1',
  'Argentina': 'GMT-3',
  'Australia': 'GMT+10',
  'Austria': 'GMT+1',
  'Bangladesh': 'GMT+6',
  'Belgium': 'GMT+1',
  'Brazil': 'GMT-3',
  'Bulgaria': 'GMT+2',
  'Canada': 'GMT-5',
  'Chile': 'GMT-3',
  'China': 'GMT+8',
  'Colombia': 'GMT-5',
  'Croatia': 'GMT+1',
  'Czech Republic': 'GMT+1',
  'Czechia': 'GMT+1',
  'Denmark': 'GMT+1',
  'Egypt': 'GMT+2',
  'Estonia': 'GMT+2',
  'Finland': 'GMT+2',
  'France': 'GMT+1',
  'Germany': 'GMT+1',
  'Greece': 'GMT+2',
  'Hong Kong': 'GMT+8',
  'Hungary': 'GMT+1',
  'India': 'GMT+5:30',
  'Indonesia': 'GMT+7',
  'Iran': 'GMT+3:30',
  'Iraq': 'GMT+3',
  'Ireland': 'GMT+0',
  'Israel': 'GMT+2',
  'Italy': 'GMT+1',
  'Japan': 'GMT+9',
  'Kenya': 'GMT+3',
  'Latvia': 'GMT+2',
  'Lithuania': 'GMT+2',
  'Malaysia': 'GMT+8',
  'Mexico': 'GMT-6',
  'Morocco': 'GMT+1',
  'Nepal': 'GMT+5:45',
  'Netherlands': 'GMT+1',
  'The Netherlands': 'GMT+1',
  'New Zealand': 'GMT+12',
  'Nigeria': 'GMT+1',
  'Norway': 'GMT+1',
  'Pakistan': 'GMT+5',
  'Peru': 'GMT-5',
  'Philippines': 'GMT+8',
  'Poland': 'GMT+1',
  'Portugal': 'GMT+0',
  'Romania': 'GMT+2',
  'Russia': 'GMT+3',
  'Saudi Arabia': 'GMT+3',
  'Serbia': 'GMT+1',
  'Singapore': 'GMT+8',
  'Slovakia': 'GMT+1',
  'Slovenia': 'GMT+1',
  'South Africa': 'GMT+2',
  'South Korea': 'GMT+9',
  'Spain': 'GMT+1',
  'Sweden': 'GMT+1',
  'Switzerland': 'GMT+1',
  'Taiwan': 'GMT+8',
  'Thailand': 'GMT+7',
  'Turkey': 'GMT+3',
  'Ukraine': 'GMT+2',
  'United Arab Emirates': 'GMT+4',
  'United Kingdom': 'GMT+0',
  'United States': 'GMT-5',
  'Venezuela': 'GMT-4',
  'Vietnam': 'GMT+7'
};

/**
 * Map of GMT offsets to likely countries (most common)
 */
const timezoneToCountry: Record<string, string> = {
  'GMT-12': 'United States',
  'GMT-11': 'United States',
  'GMT-10': 'United States',
  'GMT-9': 'United States',
  'GMT-8': 'United States',
  'GMT-7': 'United States',
  'GMT-6': 'Mexico',
  'GMT-5': 'United States',
  'GMT-4': 'Venezuela',
  'GMT-3': 'Brazil',
  'GMT-2': 'Brazil',
  'GMT-1': 'Portugal',
  'GMT+0': 'United Kingdom',
  'GMT+1': 'Germany',
  'GMT+2': 'South Africa',
  'GMT+3': 'Russia',
  'GMT+3:30': 'Iran',
  'GMT+4': 'United Arab Emirates',
  'GMT+4:30': 'Afghanistan',
  'GMT+5': 'Pakistan',
  'GMT+5:30': 'India',
  'GMT+5:45': 'Nepal',
  'GMT+6': 'Bangladesh',
  'GMT+7': 'Thailand',
  'GMT+8': 'China',
  'GMT+9': 'Japan',
  'GMT+10': 'Australia',
  'GMT+11': 'Australia',
  'GMT+12': 'New Zealand'
};

/**
 * Get timezone from country, or derive country from timezone
 */
export function getTimezoneDisplay(timezone: string | null | undefined, country: string | null | undefined): string {
  if (timezone) return timezone;
  if (country && countryToTimezone[country]) return countryToTimezone[country];
  return '-';
}

/**
 * Get country from timezone, or use existing country
 */
export function getCountryDisplay(country: string | null | undefined, timezone: string | null | undefined): string {
  if (country) return country;
  if (timezone && timezoneToCountry[timezone]) return timezoneToCountry[timezone];
  return '-';
}
