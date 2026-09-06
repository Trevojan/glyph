/**
 * glyph-zip — um escritor de ZIP em ~120 linhas, sem dependência.
 *
 * O bundle de uma Ordem são quatro projeções mais o manifesto, e entregá-las
 * como cinco downloads separados transfere ao Autor da Ordem o trabalho de
 * juntar e renomear — que é exatamente o trabalho que esta ferramenta existe
 * para não criar.
 *
 * Zero dependência é propriedade deste repositório e não acidente, então o ZIP
 * é escrito aqui. Só o método `store` (0): sem compressão. Um bundle de Ordem
 * tem alguns kilobytes de texto, e DEFLATE custaria trezentas linhas para
 * economizar um punhado deles. O formato aceita `store` desde sempre e todo
 * descompactador o lê.
 *
 * Roda nos dois lados sem ramificar: devolve Uint8Array, que o navegador
 * embrulha em Blob e o Node escreve com writeFileSync.
 */

"use strict";

/* CRC-32 (IEEE 802.3), a tabela montada uma vez na carga. */
var CRC_TABLE = (function () {
  var t = new Int32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

export function crc32(bytes) {
  var c = -1;
  for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

var UTF8 = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;
function utf8(str) {
  if (UTF8) return UTF8.encode(str);
  /* Node antigo sem TextEncoder global: Buffer serve e sai como Uint8Array */
  return new Uint8Array(Buffer.from(String(str), "utf8"));
}

/* Data e hora no formato do MS-DOS, que é o que o ZIP guarda. Segundos têm
   resolução de dois, por isso o >>> 1. */
function dosTime(d) {
  return ((d.getHours() & 31) << 11) | ((d.getMinutes() & 63) << 5) | ((d.getSeconds() / 2) & 31);
}
function dosDate(d) {
  return (((d.getFullYear() - 1980) & 127) << 9) | (((d.getMonth() + 1) & 15) << 5) | (d.getDate() & 31);
}

function w16(a, o, v) { a[o] = v & 0xFF; a[o + 1] = (v >>> 8) & 0xFF; }
function w32(a, o, v) { a[o] = v & 0xFF; a[o + 1] = (v >>> 8) & 0xFF; a[o + 2] = (v >>> 16) & 0xFF; a[o + 3] = (v >>> 24) & 0xFF; }

/**
 * entries: [{ name, text }] — o nome é caminho relativo dentro do zip.
 * when: Date opcional, para um bundle reprodutível.
 * Devolve Uint8Array.
 */
export function zipStore(entries, when) {
  var d = when || new Date();
  var time = dosTime(d), date = dosDate(d);
  var parts = [], central = [], offset = 0;

  entries.forEach(function (e) {
    var nameBytes = utf8(e.name);
    var data = utf8(e.text == null ? "" : String(e.text));
    var sum = crc32(data);

    /* cabeçalho local: 30 bytes fixos + nome */
    var lh = new Uint8Array(30 + nameBytes.length);
    w32(lh, 0, 0x04034B50);
    w16(lh, 4, 20);            /* versão necessária: 2.0 */
    w16(lh, 6, 0x0800);        /* bit 11: o nome está em UTF-8 */
    w16(lh, 8, 0);             /* método 0 — store */
    w16(lh, 10, time); w16(lh, 12, date);
    w32(lh, 14, sum);
    w32(lh, 18, data.length);  /* comprimido  */
    w32(lh, 22, data.length);  /* e original — iguais, porque não comprime */
    w16(lh, 26, nameBytes.length);
    w16(lh, 28, 0);            /* sem campo extra */
    lh.set(nameBytes, 30);

    /* entrada do diretório central: 46 bytes fixos + nome */
    var ch = new Uint8Array(46 + nameBytes.length);
    w32(ch, 0, 0x02014B50);
    w16(ch, 4, 20); w16(ch, 6, 20);
    w16(ch, 8, 0x0800);
    w16(ch, 10, 0);
    w16(ch, 12, time); w16(ch, 14, date);
    w32(ch, 16, sum);
    w32(ch, 20, data.length);
    w32(ch, 24, data.length);
    w16(ch, 28, nameBytes.length);
    w16(ch, 30, 0); w16(ch, 32, 0); w16(ch, 34, 0);
    w16(ch, 36, 0); w32(ch, 38, 0);
    w32(ch, 42, offset);       /* onde o cabeçalho local começa */
    ch.set(nameBytes, 46);

    parts.push(lh, data);
    central.push(ch);
    offset += lh.length + data.length;
  });

  var centralSize = central.reduce(function (n, c) { return n + c.length; }, 0);
  var end = new Uint8Array(22);
  w32(end, 0, 0x06054B50);
  w16(end, 4, 0); w16(end, 6, 0);
  w16(end, 8, entries.length); w16(end, 10, entries.length);
  w32(end, 12, centralSize);
  w32(end, 16, offset);        /* onde o diretório central começa */
  w16(end, 20, 0);             /* sem comentário */

  var all = parts.concat(central, [end]);
  var total = all.reduce(function (n, p) { return n + p.length; }, 0);
  var out = new Uint8Array(total), at = 0;
  all.forEach(function (p) { out.set(p, at); at += p.length; });
  return out;
}

export default { zipStore: zipStore, crc32: crc32 };
