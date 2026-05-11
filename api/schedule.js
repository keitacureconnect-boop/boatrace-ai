// api/schedule.js
// 本日の開催場一覧と各場のレース状況を返す

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

const VENUE_CODES = {
  '01':'桐生','02':'戸田','03':'江戸川','04':'平和島',
  '05':'多摩川','06':'浜名湖','07':'蒲郡','08':'常滑',
  '09':'津','10':'三国','11':'びわこ','12':'住之江',
  '13':'尼崎','14':'鳴門','15':'丸亀','16':'児島',
  '17':'宮島','18':'徳山','19':'下関','20':'若松',
  '21':'芦屋','22':'福岡','23':'唐津','24':'大村',
};

function toDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  const dateStr = req.query.date || toDateStr();

  try {
    // 公式サイトのトップページから開催場を取得
    const url = `https://www.boatrace.jp/owpc/pc/race/index?hd=${dateStr}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; BoatraceAI/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();

    // 開催場コードを抽出
    const jcdMatches = [...html.matchAll(/jcd=(\d{2})/g)];
    const activeCodes = [...new Set(jcdMatches.map(m => m[1]))];
    const activeVenues = activeCodes
      .filter(code => VENUE_CODES[code])
      .map(code => ({
        code,
        name: VENUE_CODES[code],
        // レース進行状況を大まかに抽出
        currentRace: extractCurrentRace(html, code),
      }));

    // キャッシュ3分
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate');
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).json({
      success: true,
      date: dateStr,
      venues: activeVenues,
      total: activeVenues.length,
    });

  } catch (err) {
    console.error('Schedule fetch error:', err);
    // エラー時はモックデータを返す（開発・フォールバック用）
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).json({
      success: true,
      date: dateStr,
      venues: getMockVenues(),
      total: 6,
      note: 'フォールバックデータ',
    });
  }
}

function extractCurrentRace(html, jcdCode) {
  // 該当場のレース進行を抽出（簡易）
  const regex = new RegExp(`jcd=${jcdCode}[^"]*rno=(\\d+)`, 'g');
  const matches = [...html.matchAll(regex)];
  if (matches.length > 0) {
    return Math.max(...matches.map(m => parseInt(m[1])));
  }
  return 1;
}

function getMockVenues() {
  return [
    { code: '04', name: '平和島', currentRace: 5 },
    { code: '12', name: '住之江', currentRace: 4 },
    { code: '24', name: '大村', currentRace: 6 },
    { code: '15', name: '丸亀', currentRace: 3 },
    { code: '22', name: '福岡', currentRace: 7 },
    { code: '02', name: '戸田', currentRace: 5 },
  ];
}
