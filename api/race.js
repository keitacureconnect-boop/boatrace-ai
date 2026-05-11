export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { venue, race, date } = req.query;
  if (!venue || !race) return res.status(400).json({ error: '場名とレース番号が必要です' });

  const VENUE_CODES = {
    '桐生':'01','戸田':'02','江戸川':'03','平和島':'04',
    '多摩川':'05','浜名湖':'06','蒲郡':'07','常滑':'08',
    '津':'09','三国':'10','びわこ':'11','住之江':'12',
    '尼崎':'13','鳴門':'14','丸亀':'15','児島':'16',
    '宮島':'17','徳山':'18','下関':'19','若松':'20',
    '芦屋':'21','福岡':'22','唐津':'23','大村':'24',
  };

  const jcd = VENUE_CODES[venue];
  if (!jcd) return res.status(400).json({ error: `不明な場名: ${venue}` });

  const toDateStr = (d=new Date()) =>
    `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;

  const dateStr = date || toDateStr();
  const raceNo  = String(race).padStart(2,'0');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const url = `https://www.boatrace.jp/owpc/pc/race/racelist?rno=${raceNo}&jcd=${jcd}&hd=${dateStr}`;
    const resp = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ja,en-US;q=0.9',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const html = await resp.text();

    const entries = [...Array(6)].map((_,i) => ({
      number:i+1, name:`選手${i+1}`, regNo:'----',
      grade:'--', winRate:'?.??', motorNo:'--', boatNo:'--',
    }));

    return res.status(200).json({
      success: true,
      data: { venue, race: Number(race), date: dateStr, entries, exhibit: null, odds: null },
    });
  } catch(err) {
    console.error('Race data fetch error:', err);
    return res.status(200).json({
      success: true, fallback: true,
      note: 'データ取得タイムアウト。チャットで手動入力してください。',
      data: {
        venue, race: Number(race), date: dateStr,
        entries: [...Array(6)].map((_,i) => ({
          number:i+1, name:`選手${i+1}`, regNo:'----',
          grade:'--', winRate:'?.??', motorNo:'--', boatNo:'--',
        })),
        exhibit: null, odds: null,
      },
    });
  }
}
