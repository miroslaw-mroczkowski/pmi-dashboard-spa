'use strict';

/* ============================================================
   weather.js — Pogoda (Open-Meteo, Kraków)
   ============================================================ */

const LAT = 50.0647;
const LON = 19.945;
const CITY = 'Kraków';

const WMO_ICONS = [
  [0, '☀️'], [2, '🌤'], [3, '☁️'], [49, '🌫'], [59, '🌦'],
  [69, '🌧'], [79, '❄️'], [82, '🌧'], [86, '🌨'], [99, '⛈'],
];

const WMO_DESC = [
  [0, 'Bezchmurnie'], [1, 'Głównie pogodnie'], [2, 'Częściowe zachmurzenie'],
  [3, 'Zachmurzenie całkowite'], [49, 'Mgła'], [59, 'Mżawka'],
  [65, 'Deszcz'], [69, 'Deszcz ze śniegiem'], [79, 'Opady śniegu'],
  [82, 'Przelotny deszcz'], [86, 'Przelotny śnieg'], [99, 'Burza'],
];

function lookup(table, code) {
  let result = table[table.length - 1][1];
  for (const [max, val] of table) {
    if (code <= max) { result = val; break; }
  }
  return result;
}

export async function load() {
  const box = document.getElementById('weather-box');
  if (!box) return;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&current_weather=true&hourly=relativehumidity_2m,apparent_temperature,weathercode` +
      `&timezone=Europe%2FWarsaw&forecast_days=1`;
    const data = await (await fetch(url)).json();
    const cw = data.current_weather;
    const hour = new Date(cw.time).getHours();
    const humid = data.hourly.relativehumidity_2m[hour] ?? '—';
    const feels = data.hourly.apparent_temperature[hour] != null
      ? Math.round(data.hourly.apparent_temperature[hour]) : '—';

    box.innerHTML = `
      <div class="weather-city">${CITY}</div>
      <div class="weather-main">
        <span class="weather-icon">${lookup(WMO_ICONS, cw.weathercode)}</span>
        <span class="weather-temp">${Math.round(cw.temperature)}°C</span>
      </div>
      <div class="weather-desc">${lookup(WMO_DESC, cw.weathercode)}</div>
      <div class="weather-meta">
        <span class="weather-meta-item">💧 ${humid}%</span>
        <span class="weather-meta-item">🌡 odczuwalnie ${feels}°C</span>
        <span class="weather-meta-item">💨 ${Math.round(cw.windspeed)} km/h</span>
      </div>`;
  } catch {
    box.innerHTML = '<div class="weather-loading">Brak danych pogodowych</div>';
  }
}
