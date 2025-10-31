export function calcularTotal(precoNoite, startMid, endMid) {
  const diffMs = endMid - startMid;
  const noites = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  return noites * Number(precoNoite);
}

