/**
 * GSTIN Validator Utility
 * Format: 2 digits + 5 letters + 4 digits + 1 letter + 1 alphanumeric + Z + 1 alphanumeric
 * Example: 27AAACG1234F1Z5
 */

const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/

export function isValidGSTIN(gstin: string): boolean {
    if (!gstin) return false
    return GSTIN_REGEX.test(gstin.trim().toUpperCase())
}

export function formatGSTIN(gstin: string): string {
    return gstin.trim().toUpperCase().replace(/\s+/g, '')
}

export function getStateCode(gstin: string): string | null {
    const clean = formatGSTIN(gstin)
    return clean.length >= 2 ? clean.substring(0, 2) : null
}

const STATE_MAP: Record<string, string> = {
    '01': 'Jammu & Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
    '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
    '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
    '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
    '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
    '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
    '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
    '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
    '25': 'Daman & Diu', '26': 'Dadra & Nagar Haveli', '27': 'Maharashtra',
    '28': 'Andhra Pradesh (Old)', '29': 'Karnataka', '30': 'Goa',
    '31': 'Lakshadweep', '32': 'Kerala', '33': 'Tamil Nadu',
    '34': 'Puducherry', '35': 'Andaman & Nicobar Islands', '36': 'Telangana',
    '37': 'Andhra Pradesh (New)', '38': 'Ladakh',
}

export function getStateName(gstin: string): string | null {
    const code = getStateCode(gstin)
    return code ? (STATE_MAP[code] || null) : null
}