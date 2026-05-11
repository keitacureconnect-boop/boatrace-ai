// api/race.js
// ボートレース公式サイトからデータを取得するVercel Function
// 出走表・展示データ・オッズを提供

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

// 公式サイトのベースURL
const BASE_URL = 'https://www.boatrace.jp/owpc/pc/race';

// 場コード一覧
const VENUE_CODES = {
  '桐生': '01', '戸田': '02', '江戸川': '03', '平和島': '04',
  '多摩川': '05', '浜名湖': '06', '蒲郡': '07', '常滑': '08',
  '津': '09', '三国': '10', 'びわこ': '11', '住之江': '12',
  '尼崎': '13', '鳴門': '14', '丸亀': '15', '児島': '16',
  '宮島': '17', '徳山': '18', '下関': '19', '若松': '20',
  '芦屋': '21', '福岡': '22', '唐津': '23', '大村': '24',
};

// 日付を YYYYMMDD 形式に
function toDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

// HTMLから出走表データを解析
function parseRaceEntries(html) {
  const entries = [];
  // 選手名の抽出（正規表現でHTMLをパース）
  const nameRegex = /racerName"[^>]*>([^<]+)</g;
  const classRegex = /is-rank([A-B][12])/g;
  const numberRegex = /numberBig"[^>]*>(\d)</g;

  let nameMatch, numMatch;
  const names = [];
  const nums = [];

  while ((numMatch = numberRegex.exec(html)) !== null) {
    nums.push(numMatch[1]);
  }
  while ((nameMatch = nameRegex.exec(html)) !== null) {
    names.push(nameMatch[1].trim());
  }

  for (let i = 0; i < Math.min(6, names.length); i++) {
    entries.push({
      number: nums[i] || String(i + 1),
      name: names[i] || `選手${i + 1}`,
    });
  }
  return entries;
}

// メインハンドラー
export default async function handler(req, res) {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).set(CORS_HEADERS).end();
  }

  const { type, venue, race, date } = req.query;

  // パラメータチェック
  if (!venue || !race) {
    return res.status(400).json({ error: '場名とレース番号が必要です' });
  }

  const jcdCode = VENUE_CODES[venue];
  if (!jcdCode) {
    return res.status(400).json({ error: `不明な場名: ${venue}` });
  }

  const dateStr = date || toDateStr();
  const raceNum = String(race).padStart(2, '0');

  try {
    let data = {};

    if (type === 'entries' || type === 'all') {
      // 出走表取得
      const url = `${BASE_URL}/racelist?rno=${raceNum}&jcd=${jcdCode}&hd=${dateStr}`;
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BoatraceAI/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en-US;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();

      // HTMLをパースして必要データを抽出
      data.entries = parseEntriesFromHTML(html, venue, raceNum, dateStr);
      data.venue = venue;
      data.race = Number(race);
      data.date = dateStr;
    }

    if (type === 'exhibit' || type === 'all') {
      // 展示データ取得
      const url = `${BASE_URL}/raceresult?rno=${raceNum}&jcd=${jcdCode}&hd=${dateStr}`;
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BoatraceAI/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en-US;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        const html = await resp.text();
        data.exhibit = parseExhibitFromHTML(html);
      }
    }

    if (type === 'odds' || type === 'all') {
      // オッズ取得（3連単）
      const url = `${BASE_URL}/odds3t?rno=${raceNum}&jcd=${jcdCode}&hd=${dateStr}`;
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BoatraceAI/1.0)',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ja,en-US;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });
      if (resp.ok) {
        const html = await resp.text();
        data.odds = parseOddsFromHTML(html);
      }
    }

    // キャッシュ設定（1分）
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    Object.entries(CORS_HEADERS).forEach(([k, v]) => res.setHeader(k, v));
    return res.status(200).json({ success: true, data });

  } catch (err) {
    console.error('Race data fetch error:', err);
    return res.status(500).json({
      error: 'データ取得に失敗しました',
      detail: err.message,
    });
  }
}

// ---- HTML パーサー群 ----

function parseEntriesFromHTML(html, venue, raceNum, dateStr) {
  const entries = [];

  // 艇番ブロックを探す（公式サイトの構造に基づく）
  // tbody.is-fs12 内の tr を各選手として処理
  const trBlocks = html.split('<tr');

  let boatNum = 1;
  for (const block of trBlocks) {
    if (boatNum > 6) break;

    // 選手名
    const nameMatch = block.match(/class="(?:racerName|is-fs18)[^"]*"[^>]*>\s*([^\s<]{2,10})\s*(?:<br\/>|\s)/);
    // 登番
    const regMatch = block.match(/(\d{4})<\/td>/);
    // 級別
    const gradeMatch = block.match(/class="[^"]*is-rank([AB][12])[^"]*"/);
    // 勝率
    const winMatch = block.match(/(\d+\.\d{2})<\/td>/g);
    // モーター番号
    const motorMatch = block.match(/モーター.*?(\d{2,3})/);
    // ボート番号
    const boatMatch = block.match(/ボート.*?(\d{2,3})/);

    if (nameMatch || regMatch) {
      entries.push({
        number: boatNum,
        name: nameMatch ? nameMatch[1].trim() : `選手${boatNum}`,
        regNo: regMatch ? regMatch[1] : '----',
        grade: gradeMatch ? gradeMatch[1] : '??',
        winRate: winMatch && winMatch[0] ? winMatch[0].replace('</td>', '') : '?.??',
        motorNo: motorMatch ? motorMatch[1] : '--',
        boatNo: boatMatch ? boatMatch[1] : '--',
      });
      boatNum++;
    }
  }

  // パースが不十分な場合のフォールバック（プレースホルダー）
  if (entries.length < 6) {
    for (let i = entries.length + 1; i <= 6; i++) {
      entries.push({
        number: i, name: `選手${i}`, regNo: '----',
        grade: '--', winRate: '?.??', motorNo: '--', boatNo: '--',
      });
    }
  }

  return entries;
}

function parseExhibitFromHTML(html) {
  const exhibit = [];
  // 展示タイム・周回展示タイムを抽出
  const timeMatches = html.match(/\d+\.\d{2}/g) || [];
  for (let i = 0; i < 6; i++) {
    exhibit.push({
      number: i + 1,
      exhibitTime: timeMatches[i] || '--',
      lap: timeMatches[i + 6] || '--',
    });
  }
  return exhibit;
}

function parseOddsFromHTML(html) {
  // 3連単オッズの最低・最高・人気順を大まかに抽出
  const oddsMatches = html.match(/(\d+\.\d)/g) || [];
  const top10 = oddsMatches.slice(0, 10).map(Number).sort((a, b) => a - b);
  return {
    lowest: top10[0] || null,
    highest: top10[top10.length - 1] || null,
    topOdds: top10,
  };
}
