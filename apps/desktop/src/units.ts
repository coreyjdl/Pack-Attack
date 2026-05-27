/** Unit conversion + formatting helpers — storage stays SI (grams, ml, km, m);
 *  the UI and exports surface imperial units (oz, fl oz, miles, feet, lb). */

export const G_PER_OZ = 28.3495;
export const ML_PER_FL_OZ = 29.5735;
export const KM_PER_MI = 1.60934;
export const M_PER_FT = 0.3048;
export const G_PER_LB = 453.592;

export function gramsToOz(g: number | undefined): number | undefined {
  if (g === undefined || Number.isNaN(g)) return undefined;
  return g / G_PER_OZ;
}
export function ozToGrams(oz: number | undefined): number | undefined {
  if (oz === undefined || Number.isNaN(oz)) return undefined;
  return Math.round(oz * G_PER_OZ);
}

export function mlToFlOz(ml: number | undefined): number | undefined {
  if (ml === undefined || Number.isNaN(ml)) return undefined;
  return ml / ML_PER_FL_OZ;
}
export function flOzToMl(flOz: number | undefined): number | undefined {
  if (flOz === undefined || Number.isNaN(flOz)) return undefined;
  return Math.round(flOz * ML_PER_FL_OZ);
}

export function kmToMi(km: number | undefined): number | undefined {
  if (km === undefined || Number.isNaN(km)) return undefined;
  return km / KM_PER_MI;
}
export function miToKm(mi: number | undefined): number | undefined {
  if (mi === undefined || Number.isNaN(mi)) return undefined;
  return Math.round(mi * KM_PER_MI * 100) / 100;
}

export function mToFt(m: number | undefined): number | undefined {
  if (m === undefined || Number.isNaN(m)) return undefined;
  return m / M_PER_FT;
}
export function ftToM(ft: number | undefined): number | undefined {
  if (ft === undefined || Number.isNaN(ft)) return undefined;
  return Math.round(ft * M_PER_FT);
}

export function gramsToLb(g: number): number {
  return g / G_PER_LB;
}

/** Format helpers — return strings ready to drop into the UI. */
export function fmtOz(g: number | undefined, digits = 1): string {
  const oz = gramsToOz(g);
  return oz === undefined ? "" : oz.toFixed(digits);
}
export function fmtFlOz(ml: number | undefined, digits = 1): string {
  const v = mlToFlOz(ml);
  return v === undefined ? "" : v.toFixed(digits);
}
export function fmtMi(km: number | undefined, digits = 1): string {
  const v = kmToMi(km);
  return v === undefined ? "" : v.toFixed(digits);
}
export function fmtFt(m: number | undefined): string {
  const v = mToFt(m);
  return v === undefined ? "" : Math.round(v).toLocaleString();
}
