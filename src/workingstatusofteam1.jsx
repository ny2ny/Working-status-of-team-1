import { useState, useMemo, useEffect } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import { getDatabase, ref, onValue, set } from 'firebase/database'

const DEF_MEMBERS = [
  { id:1, name:'강승구', color:'#6366f1' },
  { id:2, name:'최대하', color:'#f43f5e' },
  { id:3, name:'정호성', color:'#10b981' },
]
const DEF_HOLIDAYS = [
  '2025-01-01','2025-01-28','2025-01-29','2025-01-30','2025-03-01',
  '2025-05-05','2025-05-06','2025-06-06','2025-08-15','2025-10-03',
  '2025-10-06','2025-10-07','2025-10-08','2025-10-09','2025-12-25',
  '2026-01-01','2026-02-17','2026-02-18','2026-02-19','2026-03-01',
  '2026-05-05','2026-06-06','2026-08-15','2026-09-24','2026-09-25',
  '2026-09-26','2026-10-03','2026-10-09','2026-12-25',
]
const COLORS = ['#6366f1','#f43f5e','#10b981','#f59e0b','#3b82f6','#8b5cf6','#ec4899','#14b8a6']
const WD     = ['일','월','화','수','목','금','토']
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

const getDays = (y,m) => Array.from({length:new Date(y,m+1,0).getDate()},(_,i)=>i+1)
const getWD   = (y,m,d) => new Date(y,m,d).getDay()
const isWknd  = (y,m,d) => { const w=getWD(y,m,d); return w===0||w===6 }
const isHol   = (y,m,d,h) => h.includes(`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`)
const isSp    = (y,m,d,h) => isWknd(y,m,d)||isHol(y,m,d,h)
const getStd  = (y,m,h) => getDays(y,m).filter(d=>!isSp(y,m,d,h)).length
const isOn    = (mid,y,m,d,h,sch) => { const k=`${y}_${m}_${d}_${mid}`; return isSp(y,m,d,h)?!!sch[k]:!sch[k+'_off'] }

function loadCfg() { try { return JSON.parse(localStorage.getItem('t1_fbcfg')||'null') } catch { return null } }

function initFb(cfg) {
  if (getApps().length) return getDatabase()
  return getDatabase(initializeApp(cfg))
}

function FbSetup({ onDone }) {
  const [f,setF] = useState({apiKey:'',authDomain:'',databaseURL:'',projectId:''})
  const [err,setErr] = useState('')
  function connect() {
    if (!f.apiKey||!f.databaseURL||!f.projectId) { setErr('apiKey, databaseURL, projectId는 필수입니다.'); return }
    try { localStorage.setItem('t1_fbcfg',JSON.stringify(f)); onDone(f) } catch(e) { setErr('연결 실패: '+e.message) }
  }
  const I = {width:'100%',background:'#0f1117',border:'1px solid #334155',borderRadius:8,padding:'9px 12px',color:'#e2e8f0',fontSize:12,outline:'none',marginBottom:6,fontFamily:'inherit'}
  return (
    <div style={{minHeight:'100vh',background:'#0f1117',display:'flex',alignItems:'center',justifyContent:'center',padding:20,fontFamily:'sans-serif'}}>
      <div style={{background:'#1e293b',border:'1px solid #6366f1',borderRadius:16,padding:32,maxWidth:480,width:'100%'}}>
        <div style={{fontSize:28,marginBottom:10}}>🔥</div>
        <div style={{fontSize:17,fontWeight:700,color:'#e2e8f0',marginBottom:6}}>Firebase 초기 설정</div>
        <p style={{fontSize:13,color:'#94a3b8',lineHeight:1.8,marginBottom:16}}>팀 데이터 실시간 저장·공유를 위해 Firebase 연결이 필요합니다.</p>
        <ol style={{fontSize:13,color:'#94a3b8',paddingLeft:18,lineHeight:2.3,marginBottom:20}}>
          <li><b style={{color:'#e2e8f0'}}>console.firebase.google.com</b> 접속 → 구글 로그인</li>
          <li><b style={{color:'#e2e8f0'}}>프로젝트 추가</b> → 이름 입력 → 생성</li>
          <li>빌드 → <b style={{color:'#e2e8f0'}}>Realtime Database → 데이터베이스 만들기</b></li>
          <li>지역: <b style={{color:'#e2e8f0'}}>asia-southeast1</b> → <b style={{color:'#e2e8f0'}}>테스트 모드</b>로 시작</li>
          <li>⚙️ 프로젝트 설정 → 내 앱 → <b style={{color:'#e2e8f0'}}>웹앱(&lt;/&gt;) 추가</b> → firebaseConfig 복사</li>
        </ol>
        {[['apiKey','AIzaSy...'],['authDomain','your-app.firebaseapp.com'],['databaseURL','https://...asia-southeast1.firebasedatabase.app'],['projectId','your-app-12345']].map(([k,ph])=>(
          <div key={k}>
            <div style={{fontSize:11,color:'#64748b',marginBottom:3,marginTop:6}}>{k}</div>
            <input style={I} placeholder={ph} value={f[k]} onChange={e=>setF(p=>({...p,[k]:e.target.value}))}/>
          </div>
        ))}
        {err && <div style={{color:'#f87171',fontSize:12,background:'#7f1d1d33',padding:'7px 10px',borderRadius:7,marginBottom:8,marginTop:4}}>{err}</div>}
        <button onClick={connect} style={{width:'100%',padding:13,borderRadius:10,border:'none',background:'linear-gradient(135deg,#6366f1,#8b5cf6)',color:'#fff',fontSize:15,fontWeight:700,cursor:'pointer',marginTop:8,fontFamily:'inherit'}}>✅ 연결하기</button>
        <div style={{marginTop:10,fontSize:11,color:'#475569',textAlign:'center'}}>설정값은 이 기기의 브라우저에만 저장됩니다</div>
      </div>
    </div>
  )
}

function Toast({msg,type}) {
  if (!msg) return null
  return <div style={{position:'fixed',top:14,right:14,zIndex:9999,background:type==='ok'?'#064e3b':'#7f1d1d',border:`1px solid ${type==='ok'?'#10b981':'#f87171'}`,color:'#e2e8f0',padding:'9px 16px',borderRadius:8,fontSize:13}}>{msg}</div>
}

export default function App() {
  const [cfg,setCfg] = useState(loadCfg)
  const [db,setDb]   = useState(null)
  useEffect(()=>{ if(!cfg)return; try{setDb(initFb(cfg))}catch(e){console.error(e)} },[cfg])
  if (!cfg||!db) return <FbSetup onDone={c=>setCfg(c)}/>
  return <Main db={db} onReset={()=>{localStorage.removeItem('t1_fbcfg');setCfg(null);setDb(null)}}/>
}

function Main({db,onReset}) {
  const now=new Date()
  const [y,setY]=useState(now.getFullYear())
  const [m,setM]=useState(now.getMonth())
  const [tab,setTab]=useState(0)
  const [members,setMembers]=useState(DEF_MEMBERS)
  const [holidays,setHols]=useState(DEF_HOLIDAYS)
  const [sch,setSch]=useState({})
  const [loaded,setLoaded]=useState(false)
  const [saving,setSaving]=useState(false)
  const [toast,setToast]=useState(null)
  const [newHol,setNewHol]=useState('')
  const [newName,setNewName]=useState('')
  const [editId,setEditId]=useState(null)
  const [editNm,setEditNm]=useState('')

  useEffect(()=>{
    const r=ref(db,'t1')
    const unsub=onValue(r,snap=>{
      const d=snap.val()
      if(d){
        if(d.members)  setMembers(Array.isArray(d.members)?d.members:Object.values(d.members))
        if(d.holidays) setHols(d.holidays)
        setSch(d.schedule||{})
      } else {
        set(ref(db,'t1'),{members:DEF_MEMBERS,holidays:DEF_HOLIDAYS,schedule:{}})
      }
      setLoaded(true)
    })
    return ()=>unsub()
  },[db])

  const T=(msg,type='ok')=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2200) }
  const fbSet=async(path,val)=>{ setSaving(true); try{await set(ref(db,'t1/'+path),val)}catch{T('저장 실패','err')}; setSaving(false) }

  const days=useMemo(()=>getDays(y,m),[y,m])
  const std =useMemo(()=>getStd(y,m,holidays),[y,m,holidays])

  const toggle=async(mid,d)=>{
    const k=`${y}_${m}_${d}_${mid}`
    const next=isSp(y,m,d,holidays)?{...sch,[k]:!sch[k]}:{...sch,[k+'_off']:!sch[k+'_off']}
    setSch(next); await fbSet('schedule',next)
  }

  const monthStats=members.map(mb=>{
    const worked=days.filter(d=>isOn(mb.id,y,m,d,holidays,sch)).length
    const wk=days.filter(d=>isSp(y,m,d,holidays)&&isOn(mb.id,y,m,d,holidays,sch)).length
    const abs=days.filter(d=>!isSp(y,m,d,holidays)&&!isOn(mb.id,y,m,d,holidays,sch)).length
    return{...mb,worked,wk,abs,diff:worked-std}
  })

  const yearStats=useMemo(()=>members.map(mb=>{
    let tot=0,totStd=0,totWk=0,totAbs=0
    const monthly=Array.from({length:12},(_,mi)=>{
      const md=getDays(y,mi),mStd=md.filter(d=>!isSp(y,mi,d,holidays)).length
      const worked=md.filter(d=>isOn(mb.id,y,mi,d,holidays,sch)).length
      const wk=md.filter(d=>isSp(y,mi,d,holidays)&&isOn(mb.id,y,mi,d,holidays,sch)).length
      const abs=md.filter(d=>!isSp(y,mi,d,holidays)&&!isOn(mb.id,y,mi,d,holidays,sch)).length
      tot+=worked;totStd+=mStd;totWk+=wk;totAbs+=abs
      return{mi,worked,std:mStd,wk,abs,diff:worked-mStd}
    })
    return{...mb,tot,totStd,totWk,totAbs,totDiff:tot-totStd,monthly}
  }),[y,members,holidays,sch])

  const prevM=()=>m===0?(setY(a=>a-1),setM(11)):setM(a=>a-1)
  const nextM=()=>m===11?(setY(a=>a+1),setM(0)):setM(a=>a+1)

  const S={
    nb:{background:'#1e293b',border:'1px solid #334155',color:'#e2e8f0',borderRadius:6,padding:'4px 13px',cursor:'pointer',fontSize:17,fontFamily:'inherit'},
    TH:{padding:'7px 4px',background:'#111827',fontWeight:600,fontSize:10,color:'#94a3b8',border:'1px solid #1e293b',whiteSpace:'nowrap',textAlign:'center'},
    TD:{padding:'6px 4px',border:'1px solid #1e293b',fontSize:11},
    ab:c=>({background:`${c}18`,border:`1px solid ${c}44`,color:c,borderRadius:5,padding:'3px 8px',cursor:'pointer',fontSize:11,fontWeight:600,fontFamily:'inherit',whiteSpace:'nowrap'}),
    inp:{background:'#0f1117',border:'1px solid #334155',borderRadius:6,padding:'6px 8px',color:'#e2e8f0',fontSize:12,fontFamily:'inherit',outline:'none'},
  }

  if (!loaded) return (
    <div style={{minHeight:'100vh',background:'#0f1117',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:12,color:'#64748b',fontFamily:'sans-serif'}}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}}`}</style>
      <div style={{width:32,height:32,border:'3px solid #1e293b',borderTop:'3px solid #6366f1',borderRadius:'50%',animation:'sp .8s linear infinite'}}/>
      데이터 불러오는 중…
    </div>
  )

  return (
    <div style={{minHeight:'100vh',background:'#0f1117',color:'#e2e8f0',fontFamily:'sans-serif'}}>
      <style>{`@keyframes sp{to{transform:rotate(360deg)}} *{box-sizing:border-box} ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:#334155;border-radius:3px}`}</style>
      <Toast msg={toast?.msg} type={toast?.type}/>

      {/* 헤더 */}
      <div style={{background:'linear-gradient(135deg,#1e1b4b,#0f1117)',borderBottom:'1px solid #1e293b',padding:'12px 18px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
        <div style={{fontSize:14,fontWeight:700}}>📋 Working Status of Team 1</div>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <button style={S.nb} onClick={prevM}>‹</button>
          <span style={{fontWeight:700,minWidth:105,textAlign:'center',fontSize:14}}>{y}년 {m+1}월</span>
          <button style={S.nb} onClick={nextM}>›</button>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <span style={{fontSize:11,color:'#94a3b8'}}>정규 <b style={{color:'#e2e8f0'}}>{std}일</b></span>
          <span style={{fontSize:11,color:'#94a3b8'}}>팀원 <b style={{color:'#e2e8f0'}}>{members.length}명</b></span>
          <div style={{display:'flex',alignItems:'center',gap:5,fontSize:11,padding:'4px 9px',borderRadius:7,border:`1px solid ${saving?'#f59e0b33':'#10b98133'}`}}>
            {saving
              ? <div style={{width:8,height:8,border:'2px solid #f59e0b44',borderTop:'2px solid #f59e0b',borderRadius:'50%',animation:'sp .7s linear infinite'}}/>
              : <div style={{width:7,height:7,borderRadius:'50%',background:'#10b981'}}/>}
            <span style={{color:'#94a3b8'}}>{saving?'저장 중…':'실시간 연결'}</span>
          </div>
          <button onClick={onReset} style={{background:'none',border:'1px solid #334155',borderRadius:6,color:'#64748b',padding:'3px 8px',fontSize:10,cursor:'pointer',fontFamily:'inherit'}}>⚙️ DB재설정</button>
        </div>
      </div>

      {/* 탭 */}
      <div style={{display:'flex',borderBottom:'1px solid #1e293b',padding:'0 16px',background:'#0a0d14',overflowX:'auto'}}>
        {['📅 근무표','📊 월간현황','📈 연간현황','⚙️ 설정'].map((t,i)=>(
          <button key={i} onClick={()=>setTab(i)} style={{background:'none',border:'none',color:tab===i?'#6366f1':'#64748b',borderBottom:tab===i?'2px solid #6366f1':'2px solid transparent',padding:'10px 13px',cursor:'pointer',fontSize:12,fontWeight:tab===i?700:400,whiteSpace:'nowrap',fontFamily:'inherit'}}>{t}</button>
        ))}
      </div>

      <div style={{padding:16}}>

        {/* 근무표 */}
        {tab===0&&(<div>
          <div style={{overflowX:'auto',borderRadius:8,border:'1px solid #1e293b'}}>
            <table style={{width:'100%',borderCollapse:'collapse'}}>
              <thead><tr>
                <th style={{...S.TH,textAlign:'left',paddingLeft:10,minWidth:75}}>팀원</th>
                {days.map(d=>{const wd=getWD(y,m,d),hol=isHol(y,m,d,holidays),wk=isWknd(y,m,d);return(
                  <th key={d} style={{...S.TH,background:hol?'#3b1c1c':wk?'#1a1a2e':'#111827',color:hol?'#f87171':wd===6?'#93c5fd':wd===0?'#fca5a5':'#94a3b8',minWidth:28}}>
                    <div style={{fontSize:8}}>{WD[wd]}</div><div style={{fontWeight:700,fontSize:11}}>{d}</div>{hol&&<div style={{fontSize:7,color:'#f87171'}}>휴</div>}
                  </th>);})}
                <th style={S.TH}>근무</th><th style={S.TH}>차이</th>
              </tr></thead>
              <tbody>{members.map((mb,ri)=>{const st=monthStats.find(s=>s.id===mb.id);return(
                <tr key={mb.id} style={{background:ri%2===0?'#0f1117':'#0a0d14'}}>
                  <td style={{...S.TD,paddingLeft:10,fontWeight:600,whiteSpace:'nowrap'}}>
                    <div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:7,height:7,borderRadius:'50%',background:mb.color,flexShrink:0}}/>{mb.name}</div>
                  </td>
                  {days.map(d=>{const on=isOn(mb.id,y,m,d,holidays,sch),sp=isSp(y,m,d,holidays);return(
                    <td key={d} onClick={()=>toggle(mb.id,d)} style={{...S.TD,cursor:'pointer',textAlign:'center',userSelect:'none',background:on?(sp?mb.color+'30':mb.color+'18'):(sp?'#111':'transparent'),border:`1px solid ${on?mb.color+'55':'#1e293b'}`}}>
                      {on?<span style={{color:sp?mb.color:'#a5b4fc',fontSize:12}}>{sp?'⚡':'✓'}</span>:<span style={{color:'#222',fontSize:9}}>—</span>}
                    </td>);})}
                  <td style={{...S.TD,textAlign:'center',fontWeight:700,fontSize:13}}>{st.worked}</td>
                  <td style={{...S.TD,textAlign:'center',fontWeight:700,color:st.diff>0?'#34d399':st.diff<0?'#f87171':'#64748b'}}>{st.diff>0?`+${st.diff}`:st.diff}</td>
                </tr>);})}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:7,fontSize:10,color:'#475569'}}>✓ 정규 · ⚡ 주말/공휴일 · — 휴무 | 셀 클릭으로 토글 · Firebase 자동 저장</div>
        </div>)}

        {/* 월간현황 */}
        {tab===1&&(<div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(185px,1fr))',gap:11,marginBottom:16}}>
            {monthStats.map(mb=>{const pct=std>0?Math.min(100,Math.round((mb.worked/std)*100)):0;const dc=mb.diff>0?'#34d399':mb.diff<0?'#f87171':'#64748b';return(
              <div key={mb.id} style={{background:'#1e293b',borderRadius:11,padding:14,border:`1px solid ${mb.color}33`}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:9}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:`${mb.color}25`,border:`2px solid ${mb.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:mb.color,fontSize:13}}>{mb.name[0]}</div>
                  <div><div style={{fontWeight:700,fontSize:13}}>{mb.name}</div><div style={{fontSize:10,color:'#64748b'}}>{m+1}월</div></div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:10,marginBottom:3}}><span style={{color:'#94a3b8'}}>달성률</span><span style={{color:mb.color,fontWeight:700}}>{pct}%</span></div>
                <div style={{background:'#0f1117',borderRadius:3,height:4,overflow:'hidden',marginBottom:9}}><div style={{height:'100%',background:`linear-gradient(90deg,${mb.color},${mb.color}88)`,width:`${pct}%`}}/></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:4,marginBottom:8}}>
                  {[['총근무',mb.worked,'#e2e8f0'],['주말출근',mb.wk,'#fbbf24'],['결근',mb.abs,'#f87171']].map(([l,v,c])=>(
                    <div key={l} style={{background:'#0f1117',borderRadius:5,padding:'5px 2px',textAlign:'center'}}>
                      <div style={{fontSize:15,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:8,color:'#64748b'}}>{l}</div>
                    </div>))}
                </div>
                <div style={{textAlign:'center',padding:5,borderRadius:5,fontSize:10,fontWeight:700,background:mb.diff>0?'#064e3b':mb.diff<0?'#7f1d1d':'#1e293b',color:dc}}>
                  {mb.diff>0?`+${mb.diff}일 초과`:mb.diff<0?`${mb.diff}일 부족`:'기준 충족 ✓'}
                </div>
              </div>);})}
          </div>
          <div style={{background:'#1e293b',borderRadius:11,padding:14,border:'1px solid #334155',overflowX:'auto'}}>
            <div style={{fontWeight:700,marginBottom:10,fontSize:13}}>📋 {y}년 {m+1}월 종합</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead><tr>{['팀원','총근무','정규','주말출근','결근','차이'].map((h,i)=>(
                <th key={h} style={{...S.TH,background:'#0f1117',textAlign:i===0?'left':'center',paddingLeft:i===0?8:4}}>{h}</th>
              ))}</tr></thead>
              <tbody>{monthStats.map((mb,i)=>{const dc=mb.diff>0?'#34d399':mb.diff<0?'#f87171':'#64748b';return(
                <tr key={mb.id} style={{background:i%2===0?'transparent':'#0f1117',borderBottom:'1px solid #1e293b'}}>
                  <td style={{...S.TD,paddingLeft:8,fontWeight:600}}><div style={{display:'flex',alignItems:'center',gap:5}}><div style={{width:6,height:6,borderRadius:'50%',background:mb.color}}/>{mb.name}</div></td>
                  <td style={{...S.TD,textAlign:'center',fontWeight:700}}>{mb.worked}</td>
                  <td style={{...S.TD,textAlign:'center'}}>{mb.worked-mb.wk}</td>
                  <td style={{...S.TD,textAlign:'center',color:'#fbbf24'}}>{mb.wk}</td>
                  <td style={{...S.TD,textAlign:'center',color:'#f87171'}}>{mb.abs}</td>
                  <td style={{...S.TD,textAlign:'center',fontWeight:700,color:dc}}>{mb.diff>0?`+${mb.diff}`:mb.diff}</td>
                </tr>);})}
              </tbody>
            </table>
          </div>
        </div>)}

        {/* 연간현황 */}
        {tab===2&&(<div>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}>
            <button style={S.nb} onClick={()=>setY(a=>a-1)}>‹</button>
            <span style={{fontWeight:700,fontSize:15}}>{y}년 연간 근무 현황</span>
            <button style={S.nb} onClick={()=>setY(a=>a+1)}>›</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12,marginBottom:18}}>
            {yearStats.map(mb=>{const pct=mb.totStd>0?Math.min(100,Math.round((mb.tot/mb.totStd)*100)):0;const dc=mb.totDiff>0?'#34d399':mb.totDiff<0?'#f87171':'#64748b';return(
              <div key={mb.id} style={{background:'#1e293b',borderRadius:12,padding:16,border:`1px solid ${mb.color}44`}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:11}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:`${mb.color}25`,border:`2px solid ${mb.color}`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,color:mb.color,fontSize:14}}>{mb.name[0]}</div>
                  <div><div style={{fontWeight:700,fontSize:14}}>{mb.name}</div><div style={{fontSize:10,color:'#64748b'}}>{y}년 전체</div></div>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:4}}><span style={{color:'#94a3b8'}}>연간 달성률</span><span style={{color:mb.color,fontWeight:700}}>{pct}%</span></div>
                <div style={{background:'#0f1117',borderRadius:3,height:5,overflow:'hidden',marginBottom:11}}><div style={{height:'100%',background:`linear-gradient(90deg,${mb.color},${mb.color}66)`,width:`${pct}%`}}/></div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:5,marginBottom:9}}>
                  {[['연간 근무',mb.tot,'#e2e8f0'],['정규일수',mb.totStd,'#94a3b8'],['주말출근',mb.totWk,'#fbbf24'],['총 결근',mb.totAbs,'#f87171']].map(([l,v,c])=>(
                    <div key={l} style={{background:'#0f1117',borderRadius:7,padding:'7px 4px',textAlign:'center'}}>
                      <div style={{fontSize:17,fontWeight:700,color:c}}>{v}</div><div style={{fontSize:9,color:'#64748b',marginTop:2}}>{l}</div>
                    </div>))}
                </div>
                <div style={{textAlign:'center',padding:6,borderRadius:7,fontSize:11,fontWeight:700,background:mb.totDiff>0?'#064e3b':mb.totDiff<0?'#7f1d1d':'#1e293b',color:dc}}>
                  {mb.totDiff>0?`+${mb.totDiff}일 초과`:mb.totDiff<0?`${mb.totDiff}일 부족`:'연간 기준 충족 ✓'}
                </div>
              </div>);})}
          </div>
          <div style={{background:'#1e293b',borderRadius:12,padding:15,border:'1px solid #334155',overflowX:'auto',marginBottom:16}}>
            <div style={{fontWeight:700,marginBottom:11,fontSize:13}}>📅 {y}년 월별 근무일수 상세</div>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:11}}>
              <thead><tr>
                <th style={{...S.TH,background:'#0f1117',textAlign:'left',paddingLeft:8,minWidth:45}}>월</th>
                <th style={{...S.TH,background:'#0f1117'}}>정규</th>
                {members.map(mb=><th key={mb.id} style={{...S.TH,background:'#0f1117',color:mb.color,minWidth:70}}>{mb.name}</th>)}
              </tr></thead>
              <tbody>
                {Array.from({length:12},(_,mi)=>{const mStd=getDays(y,mi).filter(d=>!isSp(y,mi,d,holidays)).length;const isCur=mi===m;return(
                  <tr key={mi} style={{background:isCur?'#6366f108':mi%2===0?'transparent':'#0a0d14',borderBottom:'1px solid #1e293b'}}>
                    <td style={{...S.TD,paddingLeft:8,fontWeight:isCur?700:500,color:isCur?'#818cf8':'#e2e8f0'}}>
                      {MONTHS[mi]}{isCur&&<span style={{fontSize:9,color:'#6366f1',marginLeft:4}}>◀</span>}
                    </td>
                    <td style={{...S.TD,textAlign:'center',color:'#64748b'}}>{mStd}</td>
                    {yearStats.map(mb=>{const mm=mb.monthly[mi];const dc=mm.diff>0?'#34d399':mm.diff<0?'#f87171':'#64748b';return(
                      <td key={mb.id} style={{...S.TD,textAlign:'center'}}>
                        <span style={{fontWeight:600,color:'#e2e8f0'}}>{mm.worked}</span>
                        <span style={{fontSize:9,marginLeft:3,color:dc}}>({mm.diff>0?`+${mm.diff}`:mm.diff})</span>
                      </td>);})}
                  </tr>);})}
                <tr style={{borderTop:'2px solid #334155',background:'#111827'}}>
                  <td style={{...S.TD,paddingLeft:8,fontWeight:700}}>합계</td>
                  <td style={{...S.TD,textAlign:'center',fontWeight:700,color:'#94a3b8'}}>{Array.from({length:12},(_,mi)=>getDays(y,mi).filter(d=>!isSp(y,mi,d,holidays)).length).reduce((a,b)=>a+b,0)}</td>
                  {yearStats.map(mb=>{const dc=mb.totDiff>0?'#34d399':mb.totDiff<0?'#f87171':'#64748b';return(
                    <td key={mb.id} style={{...S.TD,textAlign:'center'}}>
                      <span style={{fontWeight:700,fontSize:13,color:'#e2e8f0'}}>{mb.tot}</span>
                      <span style={{fontSize:9,marginLeft:3,color:dc}}>({mb.totDiff>0?`+${mb.totDiff}`:mb.totDiff})</span>
                    </td>);})}
                </tr>
              </tbody>
            </table>
          </div>
          <div style={{background:'#1e293b',borderRadius:12,padding:15,border:'1px solid #334155'}}>
            <div style={{fontWeight:700,marginBottom:14,fontSize:13}}>📊 팀원별 월간 근무 추이</div>
            {yearStats.map(mb=>{const maxV=Math.max(...mb.monthly.map(mm=>mm.worked),1);return(
              <div key={mb.id} style={{marginBottom:18}}>
                <div style={{display:'flex',alignItems:'center',gap:7,marginBottom:6}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:mb.color}}/>
                  <span style={{fontSize:12,fontWeight:600}}>{mb.name}</span>
                  <span style={{fontSize:11,color:'#64748b'}}>연간 {mb.tot}일</span>
                </div>
                <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:3}}>
                  {mb.monthly.map(mm=>{const h=maxV>0?Math.max(4,Math.round((mm.worked/maxV)*56)):4;const dc=mm.diff>0?'#34d399':mm.diff<0?'#f87171':mb.color;const isCur=mm.mi===m;return(
                    <div key={mm.mi} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:2}}>
                      <div style={{fontSize:8,color:isCur?'#818cf8':'#475569',fontWeight:isCur?700:400}}>{mm.mi+1}월</div>
                      <div style={{display:'flex',flexDirection:'column',justifyContent:'flex-end',height:60,width:'100%'}}>
                        <div title={`${mm.worked}일`} style={{width:'100%',height:h,background:isCur?mb.color:`${mb.color}88`,borderRadius:'3px 3px 0 0',border:`1px solid ${isCur?mb.color:`${mb.color}44`}`}}/>
                      </div>
                      <div style={{fontSize:8,fontWeight:600,color:dc}}>{mm.worked}</div>
                    </div>);})}
                </div>
              </div>);})}
          </div>
        </div>)}

        {/* 설정 */}
        {tab===3&&(<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))',gap:14}}>
          <div style={{background:'#1e293b',borderRadius:11,padding:16,border:'1px solid #334155'}}>
            <div style={{fontWeight:700,marginBottom:11,fontSize:13}}>👥 팀원 관리</div>
            {members.map(mb=>(
              <div key={mb.id} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 0',borderBottom:'1px solid #0f1117'}}>
                <div style={{width:7,height:7,borderRadius:'50%',background:mb.color,flexShrink:0}}/>
                {editId===mb.id?(
                  <><input value={editNm} onChange={e=>setEditNm(e.target.value)} autoFocus
                    onKeyDown={async e=>{if(e.key==='Enter'){const u=members.map(x=>x.id===mb.id?{...x,name:editNm}:x);setMembers(u);await fbSet('members',u);setEditId(null);T('저장됨')}}}
                    style={{...S.inp,flex:1,border:'1px solid #6366f1'}}/>
                  <button onClick={async()=>{const u=members.map(x=>x.id===mb.id?{...x,name:editNm}:x);setMembers(u);await fbSet('members',u);setEditId(null);T('저장됨')}} style={S.ab('#10b981')}>저장</button>
                  <button onClick={()=>setEditId(null)} style={S.ab('#64748b')}>취소</button></>
                ):(
                  <><span style={{flex:1,fontSize:12,fontWeight:500}}>{mb.name}</span>
                  <button onClick={()=>{setEditId(mb.id);setEditNm(mb.name)}} style={S.ab('#6366f1')}>수정</button>
                  <button onClick={async()=>{if(!confirm('삭제할까요?'))return;const u=members.filter(x=>x.id!==mb.id);setMembers(u);await fbSet('members',u);T(`${mb.name} 삭제됨`,'err')}} style={S.ab('#f43f5e')}>삭제</button></>
                )}
              </div>
            ))}
            <div style={{display:'flex',gap:7,marginTop:9}}>
              <input placeholder="새 팀원 이름" value={newName} onChange={e=>setNewName(e.target.value)}
                onKeyDown={async e=>{if(e.key==='Enter'&&newName.trim()){const nid=Math.max(0,...members.map(x=>x.id))+1;const u=[...members,{id:nid,name:newName.trim(),color:COLORS[nid%COLORS.length]}];setMembers(u);await fbSet('members',u);setNewName('');T(newName.trim()+' 추가됨')}}}
                style={{...S.inp,flex:1}}/>
              <button onClick={async()=>{if(!newName.trim())return;const nid=Math.max(0,...members.map(x=>x.id))+1;const u=[...members,{id:nid,name:newName.trim(),color:COLORS[nid%COLORS.length]}];setMembers(u);await fbSet('members',u);setNewName('');T(newName.trim()+' 추가됨')}} style={{...S.ab('#6366f1'),padding:'6px 10px'}}>+ 추가</button>
            </div>
          </div>
          <div style={{background:'#1e293b',borderRadius:11,padding:16,border:'1px solid #334155'}}>
            <div style={{fontWeight:700,marginBottom:11,fontSize:13}}>🏖️ 공휴일 관리</div>
            <div style={{display:'flex',gap:7,marginBottom:9}}>
              <input type="date" value={newHol} onChange={e=>setNewHol(e.target.value)} style={{...S.inp,flex:1}}/>
              <button onClick={async()=>{if(!newHol||holidays.includes(newHol))return;const h=[...holidays,newHol].sort();setHols(h);await fbSet('holidays',h);setNewHol('');T('공휴일 추가됨')}} style={{...S.ab('#6366f1'),padding:'6px 10px'}}>추가</button>
            </div>
            <div style={{maxHeight:230,overflowY:'auto',display:'flex',flexDirection:'column',gap:4}}>
              {holidays.map(h=>(
                <div key={h} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 8px',background:'#0f1117',borderRadius:5,border:'1px solid #7f1d1d'}}>
                  <span style={{color:'#fca5a5',fontSize:11}}>{h} ({WD[new Date(h).getDay()]})</span>
                  <button onClick={async()=>{const hs=holidays.filter(x=>x!==h);setHols(hs);await fbSet('holidays',hs);T('삭제됨','err')}} style={{...S.ab('#f43f5e'),padding:'2px 7px',fontSize:10}}>삭제</button>
                </div>
              ))}
            </div>
          </div>
        </div>)}

      </div>
    </div>
  )
}