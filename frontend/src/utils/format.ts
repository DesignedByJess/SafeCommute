export function maskPhone(phone: string): string {
  if (phone.length < 7) return phone
  return `${phone.slice(0, 5)}***${phone.slice(-4)}`
}

export function maskPlate(plate: string): string {
  if (plate.length < 5) return plate
  return `**-${plate.slice(-5)}`
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export function formatDuration(minutes: number): string {
  if (minutes <= 0) return '< 1m'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
