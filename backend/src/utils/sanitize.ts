export function maskPhone(phone: string | null | undefined): string {
  if (!phone || phone.length < 7) return phone || '';
  const prefix = phone.slice(0, 5);
  const suffix = phone.slice(-4);
  return `${prefix}***${suffix}`;
}

export function maskPlate(plate: string): string {
  if (plate.length < 5) return plate;
  const suffix = plate.slice(-5);
  return `**-${suffix}`;
}
