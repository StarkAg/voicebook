import QRCode from 'qrcode'

// Merchant UPI VPA that receives payments (from the hackathon config).
export const UPI_VPA = '8709964141@ptyes'
export const UPI_PAYEE_NAME = 'VoiceBook'

// Build a standard UPI deep link. Scanning it (or the QR) opens the payer's UPI
// app pre-filled with amount + note.
export function upiLink({
  amount,
  name = UPI_PAYEE_NAME,
  note,
}: {
  amount: number
  name?: string
  note: string
}): string {
  const params = new URLSearchParams({
    pa: UPI_VPA,
    pn: name,
    am: amount.toFixed(2),
    cu: 'INR',
    tn: note,
  })
  return `upi://pay?${params.toString()}`
}

// PNG data URL for on-screen <img> rendering.
export async function upiQrDataUrl(link: string): Promise<string> {
  return QRCode.toDataURL(link, { margin: 1, width: 512 })
}

// Strip the data-URL prefix for the WhatsApp outbox imageBase64 field.
export const stripDataUrl = (dataUrl: string) =>
  dataUrl.replace(/^data:image\/\w+;base64,/, '')
