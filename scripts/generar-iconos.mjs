// Genera el favicon y los íconos de Km 12 a partir del isotipo A de Stitch
// (docs/diseno/stitch_km_12_logo_design_system). El "12" es texto en Public Sans, así que se
// dibuja en Chromium con la fuente cargada y se guarda como PNG. Uso: node scripts/generar-iconos.mjs
import { writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const AZUL = "#0B3D91";
const ORO = "#F2B705";
const MOJON = "M0 114V38C0 17.0132 17.0132 0 38 0C58.9868 0 76 17.0132 76 38V114H0Z";

// Mojón blanco sobre un cuadrado azul. En 32 px el testigo es un punto y el número más grueso, como
// en la lámina de favicons de Stitch; desde 48 px va el testigo vertical del isotipo. En 16 px el
// punto no se distingue: el mojón ocupa más lugar y el "12" crece para que se lea.
function icono({ chico, minimo, peso, redondeo }) {
  const testigo = minimo
    ? ""
    : chico
      ? `<circle cx="38" cy="20" r="6.5" fill="${ORO}"/>`
      : `<rect x="34" y="10" width="8" height="16" rx="4" fill="${ORO}"/>`;
  const lado = minimo ? 94 : 75;
  const margen = (100 - lado) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <rect width="100" height="100" rx="${redondeo}" fill="${AZUL}"/>
    <svg x="${margen}" y="${margen}" width="${lado}" height="${lado}" viewBox="0 0 76 114">
      <path d="${MOJON}" fill="#FFFFFF"/>${testigo}
      <text x="38" y="${minimo ? 94 : 86}" fill="${AZUL}" font-family="'Public Sans'" font-weight="${peso}" font-size="${minimo ? 60 : chico ? 48 : 44}"
        text-anchor="middle" letter-spacing="-0.03em">12</text>
    </svg>
  </svg>`;
}

const navegador = await chromium.launch();
const pagina = await navegador.newPage();
await pagina.setContent(
  `<link href="https://fonts.googleapis.com/css2?family=Public+Sans:wght@700;800;900&display=block" rel="stylesheet">
   <style>body{margin:0} #i{display:block}</style><div id="i"></div>`,
);

async function png(tam, opciones) {
  await pagina.setViewportSize({ width: tam, height: tam });
  await pagina.evaluate(
    ([html, t]) => {
      const d = document.getElementById("i");
      d.style.width = d.style.height = `${t}px`;
      d.innerHTML = html;
    },
    [icono(opciones), tam],
  );
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.evaluate(() => document.fonts.load("900 16px 'Public Sans'"));
  return pagina.locator("#i").screenshot({ omitBackground: true });
}

const favicon = { chico: true, peso: 900, redondeo: 18 };
const grande = { chico: false, peso: 800, redondeo: 22 };
// Ícono de la pantalla de inicio: cuadrado lleno, el sistema le aplica su propia máscara.
const inicio = { chico: false, peso: 800, redondeo: 0 };

// favicon.ico con PNG adentro (16, 32 y 48 px): cabecera ICONDIR + una entrada por tamaño.
const tamanos = [16, 32, 48];
const imagenes = [await png(16, { ...favicon, minimo: true, redondeo: 12 }), await png(32, { ...favicon, peso: 800 }), await png(48, grande)];
const cabecera = Buffer.alloc(6 + 16 * imagenes.length);
cabecera.writeUInt16LE(0, 0);
cabecera.writeUInt16LE(1, 2);
cabecera.writeUInt16LE(imagenes.length, 4);
let desplazamiento = cabecera.length;
imagenes.forEach((img, i) => {
  const o = 6 + 16 * i;
  cabecera.writeUInt8(tamanos[i], o);
  cabecera.writeUInt8(tamanos[i], o + 1);
  cabecera.writeUInt16LE(1, o + 4);
  cabecera.writeUInt16LE(32, o + 6);
  cabecera.writeUInt32LE(img.length, o + 8);
  cabecera.writeUInt32LE(desplazamiento, o + 12);
  desplazamiento += img.length;
});
await writeFile("src/app/favicon.ico", Buffer.concat([cabecera, ...imagenes]));
await writeFile("src/app/apple-icon.png", await png(180, inicio));
await writeFile("public/icono-192.png", await png(192, inicio));
await writeFile("public/icono-512.png", await png(512, inicio));
await navegador.close();
console.log("Listo: favicon.ico, apple-icon.png, icono-192.png e icono-512.png");
