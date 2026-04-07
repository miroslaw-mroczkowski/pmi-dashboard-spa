'use strict';

let structure = null;
let links = null;

export async function loadAll() {
  const [s, l] = await Promise.all([
    fetch('/api/structure').then((r) => r.json()),
    fetch('/api/links').then((r) => r.json()),
  ]);
  structure = s;
  links = l;
}

export const getBUs = () => structure?.businessUnits || [];

export const getLUsByBU = (buId) =>
  getBUs()
    .find((b) => b.id === buId)
    ?.lu.map((lu) => lu.id) || [];

export const getLUData = (luId) => {
  for (const bu of getBUs()) {
    const lu = bu.lu.find((l) => l.id === luId);
    if (lu) return lu;
  }
  return null;
};

export const getTools = () => links?.tools || [];
export const getReports = () => links?.reports || [];
export const getQuickLinkGroups = () => links?.quickLinkGroups || null;
export const getSpaLinks = () => links?.spaLinks || [];
export const getDashboardGroups = () => links?.dashboardGroups || [];
export const getReportGroups = () => links?.reportGroups || [];

export function getSpaUrl(spaId, lineNum) {
  const spa = getSpaLinks().find((s) => s.id === spaId);
  if (!spa) return '#';
  return spa.urlPattern.replace('{lu}', lineNum);
}
