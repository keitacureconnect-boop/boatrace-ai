import { useState, useRef, useEffect, useCallback } from "react";

// ==================== 定数 ====================
const VENUE_TRAITS = {
  桐生:"山に囲まれた淡水面。イン勝率やや低め。モーターの影響大。",
  戸田:"狭いコース幅。スロー有利。インが強い。",
  江戸川:"河川水面で難水面。うねり・流れあり。荒れやすい。",
  平和島:"海水・干満差あり。荒れやすく穴が出やすい。",
  多摩川:"静水面。イン天国。堅い決着が多い。",
  浜名湖:"汽水面・広大。スピード戦。アウトも台頭しやすい。",
  蒲郡:"静水面。インが強い。堅い決着。",
  常滑:"海水。インの強い水面。比較的堅い。",
  津:"静水面。イン天国。高インコース勝率。",
  三国:"うねり・荒れやすい。穴が出やすい。",
  びわこ:"淡水・広水面。風の影響大。荒れることも。",
  住之江:"静水面・整備された水面。インが強い。",
  尼崎:"静水面。インが非常に強い。",
  鳴門:"潮流が激しい難水面。荒れやすい。",
  丸亀:"海水・広水面。風の影響大。",
  児島:"潮流あり。差しが決まりやすい。",
  宮島:"海水・広水面。潮流の影響あり。",
  徳山:"静水面。インが強め。",
  下関:"海水・広水面。荒れることも。",
  若松:"海水・波あり。荒れやすい。",
  芦屋:"海水・静水面。インが強い。",
  福岡:"海水・静水面。インが強い。",
  唐津:"海水・荒れやすい。穴場。",
  大村:"静水面・インが日本一強い場。",
};

const ALL_VENUES = Object.keys(VENUE_TRAITS);

const STYLE_OPTIONS = [
  { id:"balanced", label:"⚖️ バランス", desc:"総合判断" },
  { id:"inner",    label:"🎯 イン重視", desc:"1〜2コース優先" },
  { id:"outer",    label:"💨 アウト狙い", desc:"捲り・差し重視" },
  { id:"upset",    label:"🎰 波乱狙い", desc:"万舟・高配当" },
];

const RESULT_OPTIONS = [
  { id:"hit3",    label:"3連単的中", color:"#f59e0b" },
  { id:"hit2",    label:"2連単的中", color:"#34d399" },
  { id:"miss",    label:"ハズレ",    color:"#f87171" },
  { id:"partial", label:"惜しい",    color:"#818cf8" },
];

const DEFAULT_TENDENCY = {
  style:"balanced", motorWeight:3, weatherWeight:3,
  gradeWeight:4, startWeight:3, customRule:"",
};

// ==================== ユーティリティ ====================
const genId = () => Math.random().toString(36).slice(2,9);
const toDay = () => new Date().toLocaleDateString("ja-JP");
const toDateParam = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return `${y}${m}${dd}`;
};

function buildSystemPrompt(tendency, venue) {
  const styleMap = {
    balanced:"コース・選手・モーター・気象をバランスよく評価して総合予想する。",
    inner:"1〜2コースを最大重視。イン勝率が高い場合は迷わず本命固定を推奨する。",
    outer:"4〜6コースの捲り・差しを積極評価。インが弱い条件では強くアウト推奨する。",
    upset:"人気薄・高配当を優先。B級台頭・モーター逆転・荒れ条件を積極ピックアップし万舟候補を示す。",
  };
  const vt = venue && VENUE_TRAITS[venue] ? `\n【選択場の特性】${venue}：${VENUE_TRAITS[venue]}` : "";
  return `あなたはボートレース（競艇）の予想専門AIアシスタントです。
【スタイル】${styleMap[tendency.style]}
【重視度(1=低〜5=高)】モーター:${tendency.motorWeight} 気象:${tendency.weatherWeight} 選手級別:${tendency.gradeWeight} スタート:${tendency.startWeight}
${tendency.customRule?`【独自ルール】${tendency.customRule}`:""}${vt}
【出走表・展示データが提供された場合】そのデータを最優先で分析し、詳細な予想を行う。
【回答形式】◎本命 ○対抗 ▲単穴 △連下で予想。3連単の軸・ヒモを具体提案。根拠を簡潔に説明。最後に「※参考予想です」を添える。日本語で回答。`;
}

const fmtMsg = (text) =>
  text.split("\n").map((line,i)=>{
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return <span key={i} style={{display:"block"}}>{parts.map((p,j)=>
      p.startsWith("**")&&p.endsWith("**")
        ?<strong key={j} style={{color:"#7dd3fc"}}>{p.slice(2,-2)}</strong>
        :p
    )}</span>;
  });

// ==================== API クライアント ====================
// Vercel Functions を経由してデータ取得
// ローカル開発時は /api/... → vite proxy → localhost:3000/api/...

async function fetchSchedule(date) {
  const r = await fetch(`/api/schedule?date=${date}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchRaceData(venue, race, date, type = 'all') {
  const params = new URLSearchParams({ venue, race, date, type });
  const r = await fetch(`/api/race?${params}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

async function fetchAIReply(messages, systemPrompt) {
  const r = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, systemPrompt }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  return d.reply || 'エラーが発生しました';
}

// ==================== コンポーネント ====================

export default function App() {
  const [tab, setTab] = useState("race");
  const [tendency, setTendency] = useState(DEFAULT_TENDENCY);
  const [tempTend, setTempTend] = useState(DEFAULT_TENDENCY);
  const [showSettings, setShowSettings] = useState(false);

  // レース選択
  const [selectedVenue, setSelectedVenue] = useState("");
  const [selectedRace, setSelectedRace] = useState(1);
  const [selectedDate, setSelectedDate] = useState(toDateParam());
  const [schedule, setSchedule] = useState([]);
  const [raceData, setRaceData] = useState(null);
  const [loadingRace, setLoadingRace] = useState(false);
  const [raceError, setRaceError] = useState("");

  // チャット
  const [messages, setMessages] = useState([{
    role:"assistant",
    content:"🚤 **ボートレース予想AI** へようこそ！\n\n**「レース」タブ**から場・レース番号を選ぶと出走表・展示データを自動取得して予想します。\n\nこのチャットでは追加の質問や詳細分析ができます。",
  }]);
  const [input, setInput] = useState("");
  const [loadingChat, setLoadingChat] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const bottomRef = useRef(null);

  // 履歴・成績
  const [history, setHistory] = useState([]);
  const [records, setRecords] = useState([]);
  const [newRecord, setNewRecord] = useState({
    date:toDay(), venue:"", race:"", prediction:"", result:"miss", memo:"", payout:"",
  });

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,loadingChat]);

  // 開催場スケジュール取得
  useEffect(()=>{
    fetchSchedule(selectedDate)
      .then(d=>{ if(d.venues) setSchedule(d.venues); })
      .catch(()=>{
        // フォールバック：全場リストを表示
        setSchedule(ALL_VENUES.map((name,i)=>({ name, code:String(i+1).padStart(2,'0'), currentRace:1 })));
      });
  },[selectedDate]);

  // 出走表・展示データを取得してAI予想
  const loadAndPredict = useCallback(async () => {
    if(!selectedVenue) return;
    setLoadingRace(true);
    setRaceError("");
    setRaceData(null);

    try {
      setStatusMsg("📋 出走表を取得中...");
      const result = await fetchRaceData(selectedVenue, selectedRace, selectedDate, 'all');

      if(!result.success) throw new Error(result.error);
      setRaceData(result.data);
      setStatusMsg("🤖 AI予想を生成中...");

      // データをテキスト化してAIに渡す
      const dataText = buildDataText(result.data, selectedVenue, selectedRace);
      const predMsg = {
        role:"user",
        content:`以下のデータを基に${selectedVenue}競艇 第${selectedRace}Rの予想をしてください。\n\n${dataText}`,
      };

      const allMsgs = [...messages, predMsg].map(m=>({role:m.role,content:m.content}));
      const reply = await fetchAIReply(allMsgs, buildSystemPrompt(tendency, selectedVenue));

      const aiMsg = { role:"assistant", content:reply, id:genId(), date:toDay() };
      setMessages(p=>[...p, predMsg, aiMsg]);

      // 履歴保存
      setHistory(p=>[{
        id:genId(), date:toDay(), venue:selectedVenue, race:selectedRace,
        query:`${selectedVenue} 第${selectedRace}R`,
        reply:reply.slice(0,120)+"…", full:reply, style:tendency.style,
      },...p].slice(0,50));

      setTab("chat");
    } catch(err) {
      setRaceError(`データ取得に失敗しました: ${err.message}`);
    } finally {
      setLoadingRace(false);
      setStatusMsg("");
    }
  },[selectedVenue, selectedRace, selectedDate, messages, tendency]);

  // テキスト化
  function buildDataText(data, venue, race) {
    let txt = `【${venue}競艇 第${race}R】\n`;
    if(data.entries?.length) {
      txt += `\n■ 出走表\n`;
      data.entries.forEach(e=>{
        txt += `${e.number}号艇 ${e.name}（${e.grade}）勝率${e.winRate} モーター${e.motorNo}\n`;
      });
    }
    if(data.exhibit?.length) {
      txt += `\n■ 展示タイム\n`;
      data.exhibit.forEach(e=>{
        txt += `${e.number}号艇 展示:${e.exhibitTime}秒 周回:${e.lap}秒\n`;
      });
    }
    if(data.odds) {
      txt += `\n■ オッズ（3連単）\n`;
      txt += `最低:${data.odds.lowest}倍 最高:${data.odds.highest}倍\n`;
    }
    return txt;
  }

  // チャット送信
  const sendMsg = async () => {
    const text = input.trim();
    if(!text||loadingChat) return;
    const userMsg = {role:"user",content:text};
    const next = [...messages,userMsg];
    setMessages(next);
    setInput("");
    setLoadingChat(true);
    try {
      const reply = await fetchAIReply(
        next.map(m=>({role:m.role,content:m.content})),
        buildSystemPrompt(tendency, selectedVenue||"")
      );
      setMessages(p=>[...p,{role:"assistant",content:reply}]);
    } catch(e) {
      setMessages(p=>[...p,{role:"assistant",content:"⚠️ エラーが発生しました。"}]);
    } finally { setLoadingChat(false); }
  };

  // 成績集計
  const statsAll  = records.length;
  const statsHit  = records.filter(r=>r.result==="hit3"||r.result==="hit2").length;
  const statsRate = statsAll>0 ? Math.round(statsHit/statsAll*100) : 0;

  // ==================== スタイル定数 ====================
  const S = {
    bg:"#070f1e", card:"rgba(7,17,42,0.97)",
    border:"rgba(0,130,255,0.18)", accent:"#0ea5e9",
    text:"rgba(255,255,255,0.88)", muted:"rgba(255,255,255,0.38)",
  };

  const TABS = [
    {id:"race",    icon:"🏟", label:"レース"},
    {id:"chat",    icon:"💬", label:"予想AI"},
    {id:"history", icon:"📋", label:"履歴"},
    {id:"stats",   icon:"📊", label:"成績"},
    {id:"settings",icon:"⚙️", label:"設定"},
  ];

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#050e1e 0%,#081830 60%,#040c18 100%)",fontFamily:"'Noto Sans JP',sans-serif",color:S.text,display:"flex",flexDirection:"column",alignItems:"center",paddingBottom:90}}>

      {/* ===== 設定モーダル ===== */}
      {showSettings && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.82)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
          <div style={{background:"#0a1830",border:`1px solid ${S.border}`,borderRadius:18,padding:24,width:"100%",maxWidth:460,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{fontSize:16,fontWeight:700,marginBottom:18}}>⚙️ 予想傾向カスタマイズ</div>

            <div style={{marginBottom:18}}>
              <div style={{color:S.muted,fontSize:11,marginBottom:8}}>予想スタイル</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {STYLE_OPTIONS.map(s=>(
                  <button key={s.id} onClick={()=>setTempTend(p=>({...p,style:s.id}))}
                    style={{padding:"10px 8px",borderRadius:10,border:`2px solid ${tempTend.style===s.id?S.accent:"rgba(255,255,255,0.08)"}`,background:tempTend.style===s.id?"rgba(14,165,233,0.18)":"rgba(255,255,255,0.03)",color:tempTend.style===s.id?"#7dd3fc":S.muted,cursor:"pointer",fontSize:12,fontWeight:tempTend.style===s.id?700:400}}>
                    <div>{s.label}</div><div style={{fontSize:10,opacity:0.7,marginTop:2}}>{s.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {[
              {key:"gradeWeight",label:"選手級別・勝率"},
              {key:"motorWeight",label:"モーター評価"},
              {key:"weatherWeight",label:"気象・水面条件"},
              {key:"startWeight",label:"スタートタイム"},
            ].map(({key,label})=>(
              <div key={key} style={{marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                  <span style={{fontSize:12}}>{label}</span>
                  <span style={{color:S.accent,fontSize:12,fontWeight:700}}>{"★".repeat(tempTend[key])}{"☆".repeat(5-tempTend[key])}</span>
                </div>
                <input type="range" min={1} max={5} value={tempTend[key]}
                  onChange={e=>setTempTend(p=>({...p,[key]:+e.target.value}))}
                  style={{width:"100%",accentColor:S.accent}}/>
              </div>
            ))}

            <div style={{marginBottom:18}}>
              <div style={{color:S.muted,fontSize:11,marginBottom:6}}>独自ルール（自由記述）</div>
              <textarea value={tempTend.customRule} onChange={e=>setTempTend(p=>({...p,customRule:e.target.value}))}
                placeholder={"例：展示タイム最速艇を必ず軸にする\n例：前付けがある場合は荒れると判断"}
                rows={3} style={{width:"100%",background:"rgba(255,255,255,0.04)",border:`1px solid ${S.border}`,borderRadius:8,padding:"8px 10px",color:S.text,fontSize:12,resize:"none",outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
            </div>

            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowSettings(false)} style={{flex:1,padding:10,borderRadius:10,border:"1px solid rgba(255,255,255,0.12)",background:"transparent",color:S.muted,cursor:"pointer",fontSize:13}}>キャンセル</button>
              <button onClick={()=>{setTendency(tempTend);setShowSettings(false);}}
                style={{flex:2,padding:10,borderRadius:10,border:"none",background:`linear-gradient(90deg,#0055cc,${S.accent})`,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>適用</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== HEADER ===== */}
      <div style={{width:"100%",maxWidth:740,padding:"16px 14px 0",boxSizing:"border-box"}}>
        <div style={{background:"linear-gradient(90deg,#003ea8,#0077dd)",borderRadius:"14px 14px 0 0",padding:"13px 16px",display:"flex",alignItems:"center",gap:10,boxShadow:"0 4px 24px rgba(0,100,255,0.25)"}}>
          <span style={{fontSize:22}}>🚤</span>
          <div style={{flex:1}}>
            <div style={{fontSize:15,fontWeight:800,letterSpacing:"0.03em"}}>ボートレース予想AI</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.55)",marginTop:1}}>
              {STYLE_OPTIONS.find(s=>s.id===tendency.style)?.label}
              {selectedVenue ? ` ／ ${selectedVenue}競艇` : " ／ 場未選択"}
            </div>
          </div>
          <button onClick={()=>{setTempTend(tendency);setShowSettings(true);}}
            style={{padding:"5px 10px",borderRadius:8,border:"1px solid rgba(255,255,255,0.2)",background:"rgba(255,255,255,0.07)",color:"#fff",cursor:"pointer",fontSize:11}}>
            ⚙️ 設定
          </button>
        </div>

        {/* TABS */}
        <div style={{display:"flex",background:"rgba(5,12,32,0.98)",border:`1px solid ${S.border}`,borderTop:"none"}}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{flex:1,padding:"9px 2px",border:"none",background:tab===t.id?"rgba(14,165,233,0.14)":"transparent",color:tab===t.id?S.accent:S.muted,cursor:"pointer",fontSize:10,borderBottom:tab===t.id?`2px solid ${S.accent}`:"2px solid transparent",transition:"all 0.2s"}}>
              <div style={{fontSize:15}}>{t.icon}</div>
              <div>{t.label}</div>
            </button>
          ))}
        </div>

        {/* ==================== RACE TAB ==================== */}
        {tab==="race" && (
          <div style={{background:S.card,border:`1px solid ${S.border}`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:16,minHeight:460}}>

            {/* 日付選択 */}
            <div style={{marginBottom:14}}>
              <div style={{color:S.muted,fontSize:11,marginBottom:6}}>📅 日付</div>
              <input type="date" value={`${selectedDate.slice(0,4)}-${selectedDate.slice(4,6)}-${selectedDate.slice(6,8)}`}
                onChange={e=>setSelectedDate(e.target.value.replace(/-/g,''))}
                style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${S.border}`,borderRadius:8,padding:"7px 10px",color:S.text,fontSize:12,outline:"none"}}/>
            </div>

            {/* 開催場選択 */}
            <div style={{marginBottom:14}}>
              <div style={{color:S.muted,fontSize:11,marginBottom:6}}>🏟 開催場を選択 {schedule.length>0&&<span style={{color:S.accent}}>（本日{schedule.length}場開催）</span>}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {schedule.length>0 ? schedule.map(v=>(
                  <button key={v.name} onClick={()=>setSelectedVenue(v.name)}
                    style={{padding:"6px 10px",borderRadius:20,border:`1px solid ${selectedVenue===v.name?S.accent:"rgba(255,255,255,0.1)"}`,background:selectedVenue===v.name?"rgba(14,165,233,0.2)":"rgba(255,255,255,0.03)",color:selectedVenue===v.name?"#7dd3fc":S.muted,cursor:"pointer",fontSize:11,fontWeight:selectedVenue===v.name?700:400}}>
                    {v.name}
                    {v.currentRace&&<span style={{fontSize:9,marginLeft:3,opacity:0.7}}>R{v.currentRace}〜</span>}
                  </button>
                )) : ALL_VENUES.map(name=>(
                  <button key={name} onClick={()=>setSelectedVenue(name)}
                    style={{padding:"5px 8px",borderRadius:16,border:`1px solid ${selectedVenue===name?S.accent:"rgba(255,255,255,0.08)"}`,background:selectedVenue===name?"rgba(14,165,233,0.18)":"transparent",color:selectedVenue===name?"#7dd3fc":S.muted,cursor:"pointer",fontSize:10}}>
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* 場特性 */}
            {selectedVenue && VENUE_TRAITS[selectedVenue] && (
              <div style={{marginBottom:14,padding:"8px 12px",background:"rgba(14,165,233,0.07)",border:"1px solid rgba(14,165,233,0.2)",borderRadius:8}}>
                <span style={{fontSize:10,color:"rgba(100,180,255,0.8)"}}>💡 {selectedVenue}：{VENUE_TRAITS[selectedVenue]}</span>
              </div>
            )}

            {/* レース番号 */}
            <div style={{marginBottom:16}}>
              <div style={{color:S.muted,fontSize:11,marginBottom:6}}>🏁 レース番号</div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                {[...Array(12)].map((_,i)=>(
                  <button key={i+1} onClick={()=>setSelectedRace(i+1)}
                    style={{width:38,height:38,borderRadius:8,border:`1px solid ${selectedRace===i+1?S.accent:"rgba(255,255,255,0.1)"}`,background:selectedRace===i+1?"rgba(14,165,233,0.22)":"rgba(255,255,255,0.03)",color:selectedRace===i+1?"#7dd3fc":S.muted,cursor:"pointer",fontSize:13,fontWeight:selectedRace===i+1?700:400}}>
                    {i+1}R
                  </button>
                ))}
              </div>
            </div>

            {/* 取得・予想ボタン */}
            <button onClick={loadAndPredict} disabled={!selectedVenue||loadingRace}
              style={{width:"100%",padding:"13px",borderRadius:11,border:"none",background:!selectedVenue||loadingRace?"rgba(0,60,140,0.3)":`linear-gradient(90deg,#0050cc,${S.accent})`,color:!selectedVenue||loadingRace?"rgba(255,255,255,0.3)":"#fff",cursor:!selectedVenue||loadingRace?"not-allowed":"pointer",fontSize:14,fontWeight:700,boxShadow:!selectedVenue||loadingRace?"none":"0 2px 16px rgba(0,130,255,0.35)",marginBottom:12}}>
              {loadingRace ? statusMsg||"取得中…" : `📡 ${selectedVenue||"場を選択"}・第${selectedRace}R の出走表を取得してAI予想`}
            </button>

            {raceError && (
              <div style={{padding:"10px 12px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:8,fontSize:12,color:"#fca5a5"}}>
                ⚠️ {raceError}
              </div>
            )}

            {/* 取得済みデータプレビュー */}
            {raceData && (
              <div style={{marginTop:12}}>
                <div style={{fontSize:12,fontWeight:600,marginBottom:8,color:S.accent}}>✅ 取得済みデータ</div>
                {raceData.entries && (
                  <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${S.border}`,borderRadius:8,overflow:"hidden"}}>
                    <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
                      <thead>
                        <tr style={{background:"rgba(14,165,233,0.15)"}}>
                          {["艇","選手名","級","勝率","モーター","展示"].map(h=>(
                            <th key={h} style={{padding:"6px 4px",color:S.muted,fontWeight:600,textAlign:"center"}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {raceData.entries.map((e,i)=>{
                          const ex = raceData.exhibit?.find(x=>x.number===e.number);
                          return (
                            <tr key={i} style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
                              <td style={{padding:"6px 4px",textAlign:"center",fontWeight:700,color:["#ef4444","#1d4ed8","#dc2626","#4b5563","#facc15","#16a34a"][i]||S.text}}>{e.number}</td>
                              <td style={{padding:"6px 4px",textAlign:"center"}}>{e.name}</td>
                              <td style={{padding:"6px 4px",textAlign:"center",color:e.grade?.startsWith("A1")?"#f59e0b":S.muted}}>{e.grade}</td>
                              <td style={{padding:"6px 4px",textAlign:"center"}}>{e.winRate}</td>
                              <td style={{padding:"6px 4px",textAlign:"center"}}>{e.motorNo}</td>
                              <td style={{padding:"6px 4px",textAlign:"center",color:S.accent}}>{ex?.exhibitTime||"--"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ==================== CHAT TAB ==================== */}
        {tab==="chat" && (<>
          <div style={{background:S.card,border:`1px solid ${S.border}`,borderTop:"none",minHeight:400,maxHeight:450,overflowY:"auto",padding:"14px 12px",display:"flex",flexDirection:"column",gap:12}}>
            {messages.map((msg,i)=>(
              <div key={i} style={{display:"flex",flexDirection:msg.role==="user"?"row-reverse":"row",gap:8,alignItems:"flex-start"}}>
                <div style={{width:30,height:30,borderRadius:"50%",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,background:msg.role==="user"?"linear-gradient(135deg,#003a99,#0066ee)":"linear-gradient(135deg,#002d77,#004d99)",border:`2px solid ${msg.role==="user"?"rgba(0,120,255,0.4)":"rgba(0,160,255,0.25)"}`}}>
                  {msg.role==="user"?"👤":"🚤"}
                </div>
                <div style={{maxWidth:"80%",background:msg.role==="user"?"linear-gradient(135deg,#00287a,#003d99)":"rgba(255,255,255,0.04)",border:`1px solid ${msg.role==="user"?"rgba(0,100,255,0.35)":"rgba(0,140,255,0.1)"}`,borderRadius:msg.role==="user"?"12px 3px 12px 12px":"3px 12px 12px 12px",padding:"9px 12px",fontSize:12.5,lineHeight:1.8}}>
                  {fmtMsg(msg.content)}
                </div>
              </div>
            ))}
            {loadingChat&&(
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#002d77,#004d99)",border:"2px solid rgba(0,160,255,0.25)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🚤</div>
                <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(0,140,255,0.1)",borderRadius:"3px 12px 12px 12px",padding:"10px 14px",display:"flex",gap:4}}>
                  {[0,1,2].map(n=><div key={n} style={{width:6,height:6,borderRadius:"50%",background:S.accent,animation:`bounce 1.2s ${n*0.2}s infinite`}}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={{background:"rgba(4,10,28,0.98)",border:`1px solid ${S.border}`,borderTop:"none",padding:"6px 12px",display:"flex",gap:5,flexWrap:"wrap"}}>
            {["展示タイムを分析して","オッズから狙い目は？","荒れそうなレースは？","買い目を絞って"].map((s,i)=>(
              <button key={i} onClick={()=>setInput(s)}
                style={{background:"rgba(0,65,150,0.15)",border:"1px solid rgba(0,100,255,0.2)",borderRadius:20,padding:"3px 9px",color:"rgba(120,185,255,0.8)",fontSize:10,cursor:"pointer"}}>
                {s}
              </button>
            ))}
          </div>

          <div style={{background:"rgba(4,10,28,0.98)",border:`1px solid ${S.border}`,borderTop:"1px solid rgba(0,140,255,0.06)",borderRadius:"0 0 14px 14px",padding:"10px 12px 13px",display:"flex",gap:8,alignItems:"flex-end"}}>
            <textarea value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg();}}}
              placeholder="追加の質問・詳細分析…（Shift+Enterで改行）"
              rows={2}
              style={{flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${S.border}`,borderRadius:9,padding:"8px 11px",color:S.text,fontSize:12.5,resize:"none",outline:"none",fontFamily:"inherit",lineHeight:1.6}}/>
            <button onClick={sendMsg} disabled={loadingChat||!input.trim()}
              style={{width:40,height:40,borderRadius:"50%",background:loadingChat||!input.trim()?"rgba(0,50,130,0.25)":`linear-gradient(135deg,#004acc,${S.accent})`,border:"none",cursor:loadingChat||!input.trim()?"not-allowed":"pointer",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,flexShrink:0}}>
              {loadingChat?"⏳":"➤"}
            </button>
          </div>
        </>)}

        {/* ==================== HISTORY TAB ==================== */}
        {tab==="history" && (
          <div style={{background:S.card,border:`1px solid ${S.border}`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:14,minHeight:460}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:600}}>📋 予想履歴</div>
              {history.length>0&&<button onClick={()=>setHistory([])} style={{fontSize:10,padding:"4px 8px",borderRadius:6,border:"1px solid rgba(248,113,113,0.3)",background:"rgba(248,113,113,0.08)",color:"#fca5a5",cursor:"pointer"}}>🗑 全削除</button>}
            </div>
            {history.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",color:S.muted}}>
                <div style={{fontSize:36,marginBottom:10}}>📋</div>
                <div style={{fontSize:13}}>予想履歴がありません</div>
                <div style={{fontSize:11,marginTop:4}}>レースタブで予想すると自動保存されます</div>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:8,maxHeight:420,overflowY:"auto"}}>
                {history.map(h=>(
                  <div key={h.id} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${S.border}`,borderRadius:10,padding:"10px 12px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:10,color:S.muted}}>{h.date} ／ {h.venue} 第{h.race}R</span>
                      <button onClick={()=>setHistory(p=>p.filter(x=>x.id!==h.id))} style={{fontSize:10,color:"rgba(248,113,113,0.5)",background:"none",border:"none",cursor:"pointer"}}>✕</button>
                    </div>
                    <div style={{fontSize:11,color:S.muted,lineHeight:1.7}}>{h.reply}</div>
                    <button onClick={()=>{setMessages(p=>[...p,{role:"assistant",content:h.full}]);setTab("chat");}}
                      style={{marginTop:6,fontSize:10,padding:"3px 8px",borderRadius:6,border:`1px solid ${S.border}`,background:"transparent",color:S.accent,cursor:"pointer"}}>
                      チャットで続ける →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== STATS TAB ==================== */}
        {tab==="stats" && (
          <div style={{background:S.card,border:`1px solid ${S.border}`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:14,minHeight:460}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:14}}>
              {[
                {label:"総レース数",value:statsAll,unit:"R",color:"#7dd3fc"},
                {label:"的中数",value:statsHit,unit:"回",color:"#34d399"},
                {label:"的中率",value:statsRate,unit:"%",color:statsRate>=30?"#f59e0b":"#f87171"},
              ].map(({label,value,unit,color})=>(
                <div key={label} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${S.border}`,borderRadius:10,padding:"12px 8px",textAlign:"center"}}>
                  <div style={{color:S.muted,fontSize:10,marginBottom:4}}>{label}</div>
                  <div style={{fontSize:22,fontWeight:800,color}}>{value}<span style={{fontSize:11,marginLeft:2}}>{unit}</span></div>
                </div>
              ))}
            </div>

            <div style={{background:"rgba(14,165,233,0.06)",border:`1px solid rgba(14,165,233,0.2)`,borderRadius:10,padding:12,marginBottom:14}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10}}>➕ 結果を記録</div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:7}}>
                <input value={newRecord.date} onChange={e=>setNewRecord(p=>({...p,date:e.target.value}))}
                  placeholder="日付" style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${S.border}`,borderRadius:7,padding:"6px 9px",color:S.text,fontSize:11,outline:"none"}}/>
                <select value={newRecord.venue} onChange={e=>setNewRecord(p=>({...p,venue:e.target.value}))}
                  style={{background:"rgba(6,18,45,0.95)",border:`1px solid ${S.border}`,borderRadius:7,padding:"6px 9px",color:S.text,fontSize:11,outline:"none"}}>
                  <option value="">場を選択</option>
                  {ALL_VENUES.map(v=><option key={v} value={v}>{v}</option>)}
                </select>
                <input value={newRecord.race} onChange={e=>setNewRecord(p=>({...p,race:e.target.value}))}
                  placeholder="レース（例：第5R）" style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${S.border}`,borderRadius:7,padding:"6px 9px",color:S.text,fontSize:11,outline:"none"}}/>
                <input value={newRecord.payout} onChange={e=>setNewRecord(p=>({...p,payout:e.target.value}))}
                  placeholder="払戻金（円）" type="number" style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${S.border}`,borderRadius:7,padding:"6px 9px",color:S.text,fontSize:11,outline:"none"}}/>
              </div>
              <input value={newRecord.prediction} onChange={e=>setNewRecord(p=>({...p,prediction:e.target.value}))}
                placeholder="買い目（例：1-2-3）"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${S.border}`,borderRadius:7,padding:"6px 9px",color:S.text,fontSize:11,outline:"none",marginBottom:7,boxSizing:"border-box"}}/>
              <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5,marginBottom:7}}>
                {RESULT_OPTIONS.map(r=>(
                  <button key={r.id} onClick={()=>setNewRecord(p=>({...p,result:r.id}))}
                    style={{padding:"7px 4px",borderRadius:8,border:`2px solid ${newRecord.result===r.id?r.color:"rgba(255,255,255,0.08)"}`,background:newRecord.result===r.id?`${r.color}22`:"rgba(255,255,255,0.02)",color:newRecord.result===r.id?r.color:S.muted,cursor:"pointer",fontSize:10,fontWeight:newRecord.result===r.id?700:400}}>
                    {r.label}
                  </button>
                ))}
              </div>
              <input value={newRecord.memo} onChange={e=>setNewRecord(p=>({...p,memo:e.target.value}))}
                placeholder="メモ（任意）"
                style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${S.border}`,borderRadius:7,padding:"6px 9px",color:S.text,fontSize:11,outline:"none",marginBottom:7,boxSizing:"border-box"}}/>
              <button onClick={()=>{
                if(!newRecord.venue||!newRecord.race) return;
                setRecords(p=>[{...newRecord,id:genId()},...p]);
                setNewRecord({date:toDay(),venue:"",race:"",prediction:"",result:"miss",memo:"",payout:""});
              }} style={{width:"100%",padding:9,borderRadius:9,border:"none",background:`linear-gradient(90deg,#005fcc,${S.accent})`,color:"#fff",cursor:"pointer",fontSize:13,fontWeight:700}}>
                記録する
              </button>
            </div>

            {records.length>0&&(
              <div style={{display:"flex",flexDirection:"column",gap:6,maxHeight:250,overflowY:"auto"}}>
                {records.map(r=>{
                  const ro=RESULT_OPTIONS.find(o=>o.id===r.result);
                  return (
                    <div key={r.id} style={{background:"rgba(255,255,255,0.02)",border:`1px solid ${S.border}`,borderRadius:9,padding:"8px 10px",display:"flex",gap:8,alignItems:"center"}}>
                      <div style={{flex:1}}>
                        <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:2}}>
                          <span style={{fontSize:10,color:S.muted}}>{r.date}</span>
                          <span style={{fontSize:10,color:"#7dd3fc"}}>{r.venue} {r.race}</span>
                          {r.prediction&&<span style={{fontSize:10,color:S.muted}}>🎯{r.prediction}</span>}
                          {r.payout&&<span style={{fontSize:10,color:"#f59e0b"}}>💴{Number(r.payout).toLocaleString()}円</span>}
                        </div>
                        {r.memo&&<div style={{fontSize:10,color:S.muted}}>{r.memo}</div>}
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <span style={{fontSize:10,color:ro?.color,fontWeight:600,background:`${ro?.color}18`,padding:"2px 7px",borderRadius:10}}>{ro?.label}</span>
                        <button onClick={()=>setRecords(p=>p.filter(x=>x.id!==r.id))} style={{display:"block",marginTop:3,fontSize:9,color:"rgba(248,113,113,0.5)",background:"none",border:"none",cursor:"pointer",marginLeft:"auto"}}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================== SETTINGS TAB ==================== */}
        {tab==="settings" && (
          <div style={{background:S.card,border:`1px solid ${S.border}`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:16,minHeight:460}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:14}}>⚙️ 現在の設定</div>
            <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:16}}>
              <div style={{background:"rgba(14,165,233,0.06)",border:`1px solid rgba(14,165,233,0.18)`,borderRadius:10,padding:12}}>
                <div style={{fontSize:10,color:S.muted,marginBottom:4}}>予想スタイル</div>
                <div style={{fontSize:15,fontWeight:700,color:"#7dd3fc"}}>{STYLE_OPTIONS.find(s=>s.id===tendency.style)?.label}</div>
              </div>
              <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${S.border}`,borderRadius:10,padding:12}}>
                <div style={{fontSize:10,color:S.muted,marginBottom:8}}>重視度</div>
                {[{l:"選手級別",v:tendency.gradeWeight},{l:"モーター",v:tendency.motorWeight},{l:"気象",v:tendency.weatherWeight},{l:"スタート",v:tendency.startWeight}].map(({l,v})=>(
                  <div key={l} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:11}}>{l}</span>
                    <span style={{color:S.accent,fontSize:11}}>{"★".repeat(v)}{"☆".repeat(5-v)}</span>
                  </div>
                ))}
              </div>
            </div>
            <button onClick={()=>{setTempTend(tendency);setShowSettings(true);}}
              style={{width:"100%",padding:12,borderRadius:10,border:"none",background:`linear-gradient(90deg,#004fcc,${S.accent})`,color:"#fff",cursor:"pointer",fontSize:14,fontWeight:700,marginBottom:14}}>
              ✏️ 設定を変更する
            </button>

            {/* デプロイガイド */}
            <div style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${S.border}`,borderRadius:10,padding:14}}>
              <div style={{fontSize:12,fontWeight:600,marginBottom:10,color:"#7dd3fc"}}>🚀 Vercelへのデプロイ手順</div>
              {[
                "1. GitHubにこのプロジェクトをpush",
                "2. vercel.com でGitHubと連携",
                "3. 環境変数 ANTHROPIC_API_KEY を設定",
                "4. Deploy ボタンを押すだけ！",
              ].map((s,i)=>(
                <div key={i} style={{fontSize:11,color:S.muted,marginBottom:5,paddingLeft:4}}>{s}</div>
              ))}
            </div>

            <div style={{marginTop:12,padding:"10px 12px",background:"rgba(248,113,113,0.06)",border:"1px solid rgba(248,113,113,0.15)",borderRadius:10}}>
              <div style={{fontSize:11,color:"#fca5a5",fontWeight:600,marginBottom:3}}>⚠️ 免責事項</div>
              <div style={{fontSize:10,color:"rgba(252,165,165,0.7)",lineHeight:1.6}}>予想はAIによる参考情報です。的中を保証するものではありません。投票は自己責任でお楽しみください。</div>
            </div>
          </div>
        )}

        <div style={{textAlign:"center",color:"rgba(255,255,255,0.18)",fontSize:10,padding:"8px 0 0"}}>
          ⚠️ 予想はあくまで参考情報です。投票は自己責任でお願いします。
        </div>
      </div>

      <style>{`
        @keyframes bounce{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-5px)}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-track{background:rgba(0,10,40,0.5)}
        ::-webkit-scrollbar-thumb{background:rgba(0,80,200,0.35);border-radius:4px}
        select option{background:#0a1830;color:#e0f0ff}
      `}</style>
    </div>
  );
}
