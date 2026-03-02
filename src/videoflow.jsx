import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import * as XLSX from "xlsx";

// ───── FIREBASE SETUP ─────
const firebaseConfig = {
  apiKey: "AIzaSyDJJGMaCGdIG0tuqI5t7wES8N6QH7Vv278",
  authDomain: "video-production-df746.firebaseapp.com",
  projectId: "video-production-df746",
  storageBucket: "video-production-df746.firebasestorage.app",
  messagingSenderId: "218260852391",
  appId: "1:218260852391:web:080a30620a14a52bb29582"
};
const fbApp = initializeApp(firebaseConfig);
const db = getFirestore(fbApp);
const auth = getAuth(fbApp);
const provider = new GoogleAuthProvider();
const DATA_DOC = doc(db, "videoflow", "data");

// ───── RESPONSIVE HOOK ─────
function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1200);
  useEffect(() => {
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return width;
}

// ───── DATA SETUP ─────
const VIDEO_TEAMS = {
  "영상기획1팀": ["강승구", "최대하", "정호성"],
  "영상기획2팀": ["김형민", "송수빈", "공민준"],
};

const INIT_CLIENT_DEPTS = {
  "영상사업부": {
    color: "#3B82F6",
    teams: {
      "영상기획1팀": ["강승구", "최대하", "정호성"],
      "영상기획2팀": ["김형민", "송수빈", "공민준"],
    }
  },
  "콘텐츠사업부": {
    color: "#A855F7",
    teams: {
      "마케팅팀": ["이지수", "박민서", "한예준"],
      "콘텐츠기획팀": ["윤재원", "서하은", "노태양"],
      "원격기획팀": ["임나은", "조현우", "배성민"],
      "서비스운영팀": ["신지아", "류승민", "오세진"],
    }
  },
  "출판사업부": {
    color: "#10B981",
    teams: {
      "출판기획팀": ["홍미경", "전재훈", "양수빈"],
      "출판사업팀": ["장우진", "서혜린", "마지원"],
    }
  },
  "교육사업부": {
    color: "#F59E0B",
    teams: {
      "행정팀": ["길나래", "피재현", "방수아", "탁소희"],
    }
  },
};

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
const addDays = (str, n) => { const d = new Date(str); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; };
const diffDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const fmtDate = (s) => { if (!s) return ""; const d = new Date(s); return `${d.getMonth()+1}/${d.getDate()}`; };
const fmtFull = (s) => { if (!s) return ""; const d = new Date(s); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`; };
const getYM = (s) => s ? s.slice(0,7) : "";

const mkLog = (start, count, targetPct, done) => {
  const log = [];
  for (let i = 0; i < count; i++) {
    const base = Math.round(((i+1)/count)*targetPct);
    const noise = Math.round((Math.random()-0.5)*6);
    const pct = done && i===count-1 ? 100 : Math.min(Math.max(base+noise, log[i-1]?.progress||0, i===0?5:0), done?100:targetPct);
    log.push({ date: addDays(start, i), progress: pct, note: ["자료 수집 및 기획", "초안 작성", "1차 검토", "수정 및 보완", "최종 확인 및 납품"][Math.min(i,4)] });
  }
  return log;
};

const INIT_TASKS = [
  { id:1, name:"3월 신제품 론칭 홍보영상", clientDept:"콘텐츠사업부", clientTeam:"마케팅팀", pm:"이지수", videoTeam:"영상기획1팀", assignees:["강승구","최대하"], startDate:"2026-02-24", endDate:"2026-02-28", status:"active", progressLog: mkLog("2026-02-24",4,80,false) },
  { id:2, name:"원격 강의 촬영본 편집", clientDept:"콘텐츠사업부", clientTeam:"원격기획팀", pm:"임나은", videoTeam:"영상기획2팀", assignees:["김형민","송수빈"], startDate:"2026-02-26", endDate:"2026-03-04", status:"active", progressLog: mkLog("2026-02-26",2,30,false) },
  { id:3, name:"출판 도서 소개 영상 제작", clientDept:"출판사업부", clientTeam:"출판기획팀", pm:"홍미경", videoTeam:"영상기획1팀", assignees:["정호성"], startDate:"2026-02-20", endDate:"2026-02-25", status:"completed", progressLog: mkLog("2026-02-20",4,100,true) },
  { id:4, name:"교육 행사 기록 영상", clientDept:"교육사업부", clientTeam:"행정팀", pm:"길나래", videoTeam:"영상기획2팀", assignees:["공민준","송수빈"], startDate:"2026-02-25", endDate:"2026-02-28", status:"active", progressLog: mkLog("2026-02-25",3,65,false) },
  { id:5, name:"사내 브랜드 홍보 영상", clientDept:"영상사업부", clientTeam:"영상기획1팀", pm:"강승구", videoTeam:"영상기획2팀", assignees:["김형민"], startDate:"2026-02-26", endDate:"2026-02-28", status:"delayed", progressLog: mkLog("2026-02-26",2,40,false) },
  { id:6, name:"서비스 앱 튜토리얼 영상", clientDept:"콘텐츠사업부", clientTeam:"서비스운영팀", pm:"신지아", videoTeam:"영상기획1팀", assignees:["강승구","최대하","정호성"], startDate:"2026-02-10", endDate:"2026-02-14", status:"completed", progressLog: mkLog("2026-02-10",5,100,true) },
  { id:7, name:"출판사업팀 북트레일러", clientDept:"출판사업부", clientTeam:"출판사업팀", pm:"장우진", videoTeam:"영상기획2팀", assignees:["공민준"], startDate:"2026-01-20", endDate:"2026-01-25", status:"completed", progressLog: mkLog("2026-01-20",5,100,true) },
  { id:8, name:"콘텐츠기획팀 인터뷰 영상", clientDept:"콘텐츠사업부", clientTeam:"콘텐츠기획팀", pm:"윤재원", videoTeam:"영상기획1팀", assignees:["최대하"], startDate:"2026-01-15", endDate:"2026-01-18", status:"completed", progressLog: mkLog("2026-01-15",3,100,true) },
];

const STATUS_META = {
  active:    { label:"진행중",   bg:"#0c1a2e", border:"#1d4ed8", text:"#60a5fa" },
  delayed:   { label:"지연",     bg:"#450a0a", border:"#991b1b", text:"#f87171" },
  completed: { label:"완료",     bg:"#052e16", border:"#166534", text:"#4ade80" },
  overdue:   { label:"마감초과", bg:"#450a0a", border:"#991b1b", text:"#f87171" },
  today_due: { label:"오늘마감", bg:"#422006", border:"#b45309", text:"#fbbf24" },
};

const getStatusMeta = (task) => {
  if (task.status === "completed") return STATUS_META.completed;
  if (task.status === "delayed") return STATUS_META.delayed;
  const dLeft = diffDays(todayStr, task.endDate);
  if (dLeft < 0) return STATUS_META.overdue;
  if (dLeft === 0) return STATUS_META.today_due;
  return STATUS_META.active;
};
const getProgress = (t) => t.progressLog.length > 0 ? t.progressLog[t.progressLog.length-1].progress : 0;

// ───── MAIN COMPONENT ─────
export default function VideoFlow() {
  const W = useWindowWidth();
  const isMobile = W < 560;
  const isTablet = W >= 560 && W < 900;
  const isPC = W >= 900;

  // ── Auth 상태 ──
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (e) { console.error("로그인 실패:", e); }
  };

  const handleLogout = async () => {
    try { await signOut(auth); }
    catch (e) { console.error("로그아웃 실패:", e); }
  };

  // ── 반응형 그리드 - 명시적 열 수로 직접 지정 ──
  const col = (sm, md, lg, xl) => {
    if (W < 560) return sm;
    if (W < 900) return md;
    if (W < 1200) return lg;
    return xl;
  };

  const gridStats        = { display:"grid", gap:10,  gridTemplateColumns:`repeat(${col(2,2,4,4)},1fr)` };
  const gridCards        = { display:"grid", gap:14,  gridTemplateColumns:`repeat(${col(1,2,3,4)},1fr)` };
  const gridMonths       = { display:"grid", gap:14,  gridTemplateColumns:`repeat(${col(1,2,3,6)},1fr)` };
  const gridMembers      = { display:"grid", gap:12,  gridTemplateColumns:`repeat(${col(2,3,4,5)},1fr)` };
  const gridMemberTasks  = { display:"grid", gap:12,  gridTemplateColumns:`repeat(${col(1,2,3,4)},1fr)` };
  const gridCompleted    = { display:"grid", gap:16,  gridTemplateColumns:`repeat(${col(1,2,3,4)},1fr)` };
  const gridSettings     = { display:"grid", gap:20,  gridTemplateColumns:`repeat(${col(1,1,2,2)},1fr)` };
  const [tasks, setTasks] = useState(INIT_TASKS);
  const [clientDepts, setClientDepts] = useState(INIT_CLIENT_DEPTS);
  const [videoTeamMembers, setVideoTeamMembers] = useState(VIDEO_TEAMS);

  // ── Firebase Storage ──
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState("saved");
  const saveTimerRef = useRef(null);
  const loadedRef = useRef(false);
  const remoteUpdateRef = useRef(false);

  // 실시간 리스너 (다른 사용자 변경사항 자동 반영)
  useEffect(() => {
    const unsubscribe = onSnapshot(DATA_DOC, (snapshot) => {
      if (snapshot.exists()) {
        remoteUpdateRef.current = true;
        const data = snapshot.data();
        if (data.tasks) setTasks(data.tasks);
        if (data.clientDepts) setClientDepts(data.clientDepts);
        if (data.videoTeams) setVideoTeamMembers(data.videoTeams);
        setTimeout(() => { remoteUpdateRef.current = false; }, 200);
      }
      setIsLoading(false);
      setTimeout(() => { loadedRef.current = true; }, 50);
    }, (error) => {
      console.warn("Firestore 연결 오류:", error);
      setIsLoading(false);
      setTimeout(() => { loadedRef.current = true; }, 50);
    });
    return () => unsubscribe();
  }, []);

  // Auto-save (debounced 800ms)
  useEffect(() => {
    if (!loadedRef.current || remoteUpdateRef.current) return;
    setSaveStatus("saving");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        await setDoc(DATA_DOC, { tasks, clientDepts, videoTeams: videoTeamMembers });
        setSaveStatus("saved");
      } catch (e) {
        console.warn("저장 오류:", e);
        setSaveStatus("error");
      }
    }, 800);
  }, [tasks, clientDepts, videoTeamMembers]);



  const [view, setView] = useState("board"); // board | monthly | annual | members | completed | settings
  const [filterDept, setFilterDept] = useState("전체");
  const [filterStatus, setFilterStatus] = useState("전체");
  const [filterMonth, setFilterMonth] = useState(getYM(todayStr));
  const [filterYear, setFilterYear] = useState(String(today.getFullYear()));
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberStatusFilter, setMemberStatusFilter] = useState("전체");

  const [checkInModal, setCheckInModal] = useState(null);
  const [checkInPct, setCheckInPct] = useState(0);
  const [checkInNote, setCheckInNote] = useState("");
  const [taskModal, setTaskModal] = useState(null); // null | "add" | task(for edit)
  const [detailModal, setDetailModal] = useState(null);

  // Settings state
  const [settingsDept, setSettingsDept] = useState("콘텐츠사업부");
  const [settingsTeam, setSettingsTeam] = useState("마케팅팀");
  const [newMemberName, setNewMemberName] = useState("");
  const [newVTMember, setNewVTMember] = useState("");
  const [newVTTeam, setNewVTTeam] = useState("영상기획1팀");


  // Form state
  const emptyForm = { name:"", clientDept:"콘텐츠사업부", clientTeam:"마케팅팀", pm:"", videoTeam:"영상기획1팀", assignees:[], startDate:todayStr, endDate:addDays(todayStr,4) };
  const [form, setForm] = useState(emptyForm);

  // ── derived data ──
  const allMonths = useMemo(() => {
    const ym = new Set(tasks.map(t => getYM(t.startDate)));
    return [...ym].sort().reverse();
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filterDept !== "전체" && t.clientDept !== filterDept) return false;
      if (filterStatus !== "전체") {
        const sm = getStatusMeta(t);
        if (filterStatus === "진행중" && sm.label !== "진행중" && sm.label !== "오늘마감") return false;
        if (filterStatus === "지연" && sm.label !== "지연" && sm.label !== "마감초과") return false;
        if (filterStatus === "완료" && t.status !== "completed") return false;
      }
      return true;
    });
  }, [tasks, filterDept, filterStatus]);

  const monthTasks = useMemo(() => tasks.filter(t => getYM(t.startDate) === filterMonth || getYM(t.endDate) === filterMonth), [tasks, filterMonth]);

  // all members from client depts (for PM selection)
  const allClientMembers = useMemo(() => {
    const list = [];
    Object.entries(clientDepts).forEach(([dept, ddata]) => {
      Object.entries(ddata.teams).forEach(([team, members]) => {
        members.forEach(m => list.push({ name: m, dept, team }));
      });
    });
    return list;
  }, [clientDepts]);

  // ── actions ──
  const saveCheckIn = () => {
    if (!checkInModal) return;
    setTasks(prev => prev.map(t => {
      if (t.id !== checkInModal.id) return t;
      const entry = { date: todayStr, progress: checkInPct, note: checkInNote || "일일 체크인" };
      const log = t.progressLog.find(l => l.date === todayStr)
        ? t.progressLog.map(l => l.date === todayStr ? entry : l)
        : [...t.progressLog, entry];
      const status = checkInPct >= 100 ? "completed" : t.status;
      return { ...t, progressLog: log, status };
    }));
    setCheckInModal(null);
  };

  const saveTask = () => {
    if (!form.name.trim()) return;
    if (taskModal === "add") {
      setTasks(prev => [{ ...form, id: Date.now(), status: "active", progressLog: [] }, ...prev]);
    } else {
      setTasks(prev => prev.map(t => t.id === taskModal.id ? { ...t, ...form } : t));
    }
    setTaskModal(null);
    setForm(emptyForm);
  };

  const openEdit = (task) => {
    setForm({ name: task.name, clientDept: task.clientDept, clientTeam: task.clientTeam, pm: task.pm, videoTeam: task.videoTeam, assignees: task.assignees, startDate: task.startDate, endDate: task.endDate });
    setTaskModal(task);
  };

  const openAdd = () => { setForm(emptyForm); setTaskModal("add"); };
  const deleteTask = (id) => setTasks(prev => prev.filter(t => t.id !== id));

  // Member management
  const addClientMember = (teamOverride) => {
    if (!newMemberName.trim()) return;
    const targetTeam = teamOverride || settingsTeam;
    setClientDepts(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (!copy[settingsDept]?.teams[targetTeam]) return prev;
      if (!copy[settingsDept].teams[targetTeam].includes(newMemberName.trim())) {
        copy[settingsDept].teams[targetTeam].push(newMemberName.trim());
      }
      return copy;
    });
    setNewMemberName("");
  };

  const removeClientMember = (dept, team, name) => {
    setClientDepts(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      copy[dept].teams[team] = copy[dept].teams[team].filter(m => m !== name);
      return copy;
    });
  };

  const addVideoMember = () => {
    if (!newVTMember.trim()) return;
    setVideoTeamMembers(prev => {
      const copy = { ...prev };
      if (!copy[newVTTeam].includes(newVTMember.trim())) {
        copy[newVTTeam] = [...copy[newVTTeam], newVTMember.trim()];
      }
      return copy;
    });
    setNewVTMember("");
  };

  const removeVideoMember = (team, name) => {
    setVideoTeamMembers(prev => ({ ...prev, [team]: prev[team].filter(m => m !== name) }));
  };

  // ── UI helpers ──
  const getDeptColor = (dept) => clientDepts[dept]?.color || "#6B7280";

  const inp = { background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"9px 12px", color:"#f1f5f9", fontSize:13, outline:"none", width:"100%", boxSizing:"border-box", fontFamily:"inherit" };
  const lbl = { display:"block", fontSize:11, fontWeight:600, color:"#64748b", marginBottom:5, textTransform:"uppercase", letterSpacing:"0.05em" };

  // ── Sparkline ──
  const Sparkline = ({ log, color }) => {
    if (log.length < 2) return <div style={{ width:72, height:24 }} />;
    const W=72, H=24;
    const mx = log.length-1;
    const path = log.map((l,i)=>`${i===0?"M":"L"}${mx===0?W/2:(i/mx)*W},${H-(l.progress/100)*H}`).join(" ");
    return (
      <svg width={W} height={H}>
        <path d={path} fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" opacity={0.85}/>
        {log.map((l,i)=>{ const px=mx===0?W/2:(i/mx)*W, py=H-(l.progress/100)*H; return <circle key={i} cx={px} cy={py} r={i===log.length-1?3:1.5} fill={color} opacity={i===log.length-1?1:0.5}/> })}
      </svg>
    );
  };

  // ── Task Card ──
  const TaskCard = ({ task }) => {
    const pct = getProgress(task);
    const sm = getStatusMeta(task);
    const dc = getDeptColor(task.clientDept);
    const total = diffDays(task.startDate, task.endDate)+1;
    const elapsed = Math.min(Math.max(diffDays(task.startDate, todayStr)+1,0), total);
    const timePct = Math.round((elapsed/total)*100);
    const behind = timePct > pct + 12 && task.status !== "completed";

    return (
      <div style={{ background:"#0b1120", border:`1px solid #1a2540`, borderRadius:14, padding:18, position:"relative", overflow:"hidden", cursor:"pointer", transition:"all 0.18s" }}
        onClick={()=>setDetailModal(task)}
        onMouseEnter={e=>{e.currentTarget.style.borderColor=`${dc}55`;e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=`0 8px 24px rgba(0,0,0,0.4)`;}}
        onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a2540";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
        <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background: task.status==="completed"?"#4ade80": behind?"#f87171":dc, borderRadius:"14px 0 0 14px" }}/>

        {/* Header */}
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
          <div style={{ flex:1, paddingRight:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:6, flexWrap:"wrap" }}>
              <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:20, background:sm.bg, border:`1px solid ${sm.border}`, color:sm.text }}>{sm.label}</span>
              <span style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:`${dc}18`, border:`1px solid ${dc}40`, color:dc, fontWeight:600 }}>{task.clientDept}</span>
              <span style={{ fontSize:10, color:"#475569" }}>{task.clientTeam}</span>
            </div>
            <div style={{ fontSize:15, fontWeight:700, color:"#f1f5f9", lineHeight:1.35, marginBottom:8 }}>{task.name}</div>

            {/* Assignees */}
            <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize:10, color:"#334155" }}>제작팀</span>
              <span style={{ fontSize:11, color:"#64748b", fontWeight:600 }}>{task.videoTeam}</span>
              <div style={{ display:"flex", gap:4 }}>
                {task.assignees.map(a=>(
                  <div key={a} title={a} style={{ width:22, height:22, borderRadius:"50%", background:"#1e3a5f", border:`1.5px solid ${dc}88`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:dc }}>{a[0]}</div>
                ))}
              </div>
              {task.pm && <span style={{ fontSize:10, color:"#64748b" }}>PM <span style={{ color:"#94a3b8", fontWeight:600 }}>{task.pm}</span></span>}
            </div>
          </div>

          {/* Progress number + sparkline */}
          <div style={{ textAlign:"right", flexShrink:0 }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:30, fontWeight:800, lineHeight:1, color: task.status==="completed"?"#4ade80": behind?"#f87171":dc }}>
              {pct}<span style={{ fontSize:12, fontWeight:400 }}>%</span>
            </div>
            <Sparkline log={task.progressLog} color={task.status==="completed"?"#4ade80":behind?"#f87171":dc}/>
          </div>
        </div>

        {/* Progress bars */}
        <div style={{ marginBottom:10 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4, fontSize:10, color:"#334155" }}>
            <span>업무 진척도</span>
            {behind && <span style={{ color:"#f87171" }}>⚠ 일정 {timePct-pct}% 지연</span>}
          </div>
          <div style={{ background:"#1e293b", borderRadius:6, height:7, overflow:"hidden", marginBottom:3 }}>
            <div style={{ height:"100%", borderRadius:6, background: task.status==="completed"?"#4ade80":behind?"#ef4444":dc, width:`${pct}%`, transition:"width 0.7s ease", boxShadow:`0 0 6px ${dc}66` }}/>
          </div>
          <div style={{ background:"#1a2540", borderRadius:6, height:3, overflow:"hidden" }}>
            <div style={{ height:"100%", borderRadius:6, background:"#334155", width:`${timePct}%` }}/>
          </div>
          <div style={{ display:"flex", justifyContent:"space-between", marginTop:4, fontSize:10, color:"#1e3a5f" }}>
            <span>⏳ 경과 {timePct}%</span>
            <span>{fmtDate(task.startDate)} → {fmtDate(task.endDate)} ({total}일)</span>
          </div>
        </div>

        {/* Latest note */}
        {task.progressLog.length > 0 && (
          <div style={{ fontSize:11, color:"#475569", background:"#070e1a", borderRadius:6, padding:"5px 10px", marginBottom:12 }}>
            <span style={{ color:"#334155" }}>최근 ▸ </span>{task.progressLog[task.progressLog.length-1].note}
          </div>
        )}

        {/* Actions */}
        <div style={{ display:"flex", gap:6, justifyContent:"flex-end" }} onClick={e=>e.stopPropagation()}>
          {task.status !== "completed" && (
            <button onClick={()=>{setCheckInModal(task);setCheckInPct(getProgress(task));setCheckInNote("");}}
              style={{ fontSize:11, fontWeight:700, padding:"5px 11px", borderRadius:7, border:`1px solid ${dc}55`, background:`${dc}18`, color:dc, cursor:"pointer", fontFamily:"inherit" }}>
              퇴근체크 ✓
            </button>
          )}
          <button onClick={()=>openEdit(task)} style={{ fontSize:11, padding:"5px 9px", borderRadius:7, border:"1px solid #1e293b", background:"none", color:"#475569", cursor:"pointer" }}>수정</button>
          <button onClick={()=>deleteTask(task.id)} style={{ fontSize:11, padding:"5px 9px", borderRadius:7, border:"1px solid #450a0a", background:"none", color:"#7f1d1d", cursor:"pointer" }}>삭제</button>
        </div>
      </div>
    );
  };

  // ── Task Form ──
  const TaskForm = () => {
    const clientTeams = Object.keys(clientDepts[form.clientDept]?.teams || {});
    const vtMembers = videoTeamMembers[form.videoTeam] || [];
    const pmList = allClientMembers.filter(m => !(form.videoTeam && vtMembers.includes(m.name)));

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
        <div>
          <label style={lbl}>업무명</label>
          <input style={inp} value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} placeholder="예: 3월 신제품 홍보영상"/>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label style={lbl}>의뢰부서</label>
            <select style={inp} value={form.clientDept} onChange={e=>{const t=Object.keys(clientDepts[e.target.value]?.teams||{})[0]||""; setForm(p=>({...p,clientDept:e.target.value,clientTeam:t,pm:""}));}}>
              {Object.keys(clientDepts).map(d=><option key={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>의뢰팀</label>
            <select style={inp} value={form.clientTeam} onChange={e=>setForm(p=>({...p,clientTeam:e.target.value,pm:""}))}>
              {clientTeams.map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label style={lbl}>PM (의뢰측 담당자)</label>
          <select style={inp} value={form.pm} onChange={e=>setForm(p=>({...p,pm:e.target.value}))}>
            <option value="">선택 안함</option>
            {(clientDepts[form.clientDept]?.teams[form.clientTeam]||[]).map(m=><option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div>
            <label style={lbl}>제작팀</label>
            <select style={inp} value={form.videoTeam} onChange={e=>setForm(p=>({...p,videoTeam:e.target.value,assignees:[]}))}>
              {Object.keys(videoTeamMembers).map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={lbl}>담당자 배정</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:5, minHeight:38, background:"#0f172a", border:"1px solid #334155", borderRadius:8, padding:"6px 8px" }}>
              {(videoTeamMembers[form.videoTeam]||[]).map(m=>{
                const sel=form.assignees.includes(m);
                const dc=getDeptColor(form.clientDept);
                return <button key={m} onClick={()=>setForm(p=>({...p,assignees:sel?p.assignees.filter(a=>a!==m):[...p.assignees,m]}))}
                  style={{ padding:"3px 9px", borderRadius:14, border:`1px solid ${sel?dc:"#334155"}`, background:sel?`${dc}25`:"none", color:sel?dc:"#64748b", fontSize:11, fontWeight:sel?700:400, cursor:"pointer" }}>{m}</button>;
              })}
            </div>
          </div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><label style={lbl}>시작일</label><input type="date" style={inp} value={form.startDate} onChange={e=>setForm(p=>({...p,startDate:e.target.value}))}/></div>
          <div><label style={lbl}>종료일</label><input type="date" style={inp} value={form.endDate} onChange={e=>setForm(p=>({...p,endDate:e.target.value}))}/></div>
        </div>
      </div>
    );
  };

  const MonthlyView = () => {
    const grouped = {};
    monthTasks.forEach(t => {
      const k = t.clientDept;
      if (!grouped[k]) grouped[k] = [];
      grouped[k].push(t);
    });

    const daysInMonth = new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1]), 0).getDate();
    const days = Array.from({length: daysInMonth}, (_,i) => i+1);
    const monthStr = `${filterMonth.split('-')[0]}년 ${parseInt(filterMonth.split('-')[1])}월`;

    // 날짜 셀 너비 - 화면에 따라 조정
    const dayW = isMobile ? 24 : isTablet ? 30 : 36;
    const labelW = isMobile ? 130 : isTablet ? 160 : 220;
    const totalW = labelW + (dayW * daysInMonth);

    return (
      <div style={{ maxWidth:1200, margin:"0 auto" }}>
        <div style={{ fontWeight:700, fontSize:18, color:"#f1f5f9", marginBottom:20 }}>{monthStr} 업무 타임라인</div>
        <div style={{ background:"#0b1120", borderRadius:14, padding:isMobile?12:24, border:"1px solid #1a2540", overflowX:"auto" }}>
          <div style={{ minWidth: totalW }}>
            {/* Day header */}
            <div style={{ display:"grid", gridTemplateColumns:`${labelW}px repeat(${daysInMonth}, ${dayW}px)`, marginBottom:10, alignItems:"center" }}>
              <div style={{ fontSize:11, color:"#334155", fontWeight:600 }}>업무명</div>
              {days.map(d=>{
                const wd = new Date(parseInt(filterMonth.split('-')[0]), parseInt(filterMonth.split('-')[1])-1, d).getDay();
                const isTd = `${filterMonth}-${String(d).padStart(2,'0')}` === todayStr;
                return (
                  <div key={d} style={{ textAlign:"center", fontSize:isMobile?10:12,
                    color: isTd?"#60a5fa": wd===0||wd===6?"#334155":"#475569",
                    fontWeight:isTd?800:400,
                    background:isTd?"#1d3461":wd===0||wd===6?"#0a1020":undefined,
                    borderRadius:3, padding:"2px 0" }}>
                    {d}
                  </div>
                );
              })}
            </div>
            {/* Tasks */}
            {monthTasks.map(task => {
              const dc = getDeptColor(task.clientDept);
              const pct = getProgress(task);
              const sm = getStatusMeta(task);
              const sDay = parseInt(task.startDate.split('-')[2]);
              const eDay = Math.min(parseInt(task.endDate.split('-')[2]), daysInMonth);
              const sM = task.startDate.slice(0,7), eM = task.endDate.slice(0,7);
              const startCol = sM <= filterMonth ? sDay : 1;
              const endCol = eM >= filterMonth ? eDay : daysInMonth;
              return (
                <div key={task.id} style={{ display:"grid", gridTemplateColumns:`${labelW}px repeat(${daysInMonth}, ${dayW}px)`, marginBottom:8, alignItems:"center" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, paddingRight:10 }}>
                    <div style={{ width:3, height:32, borderRadius:4, background:dc, flexShrink:0 }}/>
                    <div style={{ minWidth:0 }}>
                      <div style={{ fontSize:isMobile?11:14, fontWeight:600, color:"#cbd5e1", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{task.name}</div>
                      <div style={{ fontSize:isMobile?10:12, color:"#475569" }}>{task.assignees.join("·")}</div>
                    </div>
                  </div>
                  {days.map(d => {
                    const inRange = d >= startCol && d <= endCol;
                    const isStart = d === startCol;
                    const isEnd = d === endCol;
                    const dateStr = `${filterMonth}-${String(d).padStart(2,'0')}`;
                    const logEntry = task.progressLog.find(l=>l.date===dateStr);
                    return (
                      <div key={d} style={{ height:32, position:"relative" }}>
                        {inRange && (
                          <div style={{ position:"absolute", top:8, left:isStart?3:0, right:isEnd?3:0, height:16,
                            background: task.status==="completed"?"#166534":`${dc}33`,
                            borderRadius: isStart&&isEnd?6: isStart?"6px 0 0 6px": isEnd?"0 6px 6px 0":"0",
                            border:`1px solid ${task.status==="completed"?"#22c55e":dc}55`, overflow:"hidden" }}>
                            <div style={{ height:"100%", background: task.status==="completed"?"#22c55e":dc, width:`${pct}%`, borderRadius:"inherit", opacity:0.75 }}/>
                            {logEntry && <div style={{ position:"absolute", top:"50%", left:"50%", transform:"translate(-50%,-50%)", fontSize:8, fontWeight:700, color:"#fff", whiteSpace:"nowrap" }}>{logEntry.progress}%</div>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            {monthTasks.length === 0 && <div style={{ textAlign:"center", padding:40, color:"#334155" }}>해당 월에 업무가 없습니다.</div>}
          </div>
        </div>
      </div>
    );
  };

  // ── Completed View ──
  const CompletedView = () => {
    const byTeam = {};
    tasks.filter(t=>t.status==="completed").forEach(t=>{
      const k=t.videoTeam;
      if(!byTeam[k]) byTeam[k]=[];
      byTeam[k].push(t);
    });
    return (
      <div>
        <div style={{ ...gridCompleted, marginBottom:24 }}>
          {Object.entries(byTeam).map(([team, list])=>(
            <div key={team} style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:14, padding:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                <div style={{ fontWeight:700, fontSize:17, color:"#f1f5f9" }}>{team}</div>
                <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:40, fontWeight:900, color:"#4ade80", lineHeight:1 }}>{list.length}<span style={{ fontSize:14, color:"#166534" }}>건</span></div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {list.map(t=>(
                  <div key={t.id} style={{ background:"#052e16", border:"1px solid #166534", borderRadius:9, padding:"10px 14px", cursor:"pointer" }} onClick={()=>setDetailModal(t)}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:"#86efac", marginBottom:2 }}>{t.name}</div>
                        <div style={{ fontSize:11, color:"#166534" }}>{t.clientDept} · {t.clientTeam} {t.pm&&`· PM: ${t.pm}`}</div>
                      </div>
                      <div style={{ display:"flex", gap:3 }}>
                        {t.assignees.map(a=>(
                          <div key={a} style={{ width:22, height:22, borderRadius:"50%", background:"#166534", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:800, color:"#4ade80" }}>{a[0]}</div>
                        ))}
                      </div>
                    </div>
                    <div style={{ fontSize:10, color:"#166534", marginTop:6 }}>{fmtFull(t.startDate)} ~ {fmtFull(t.endDate)}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        {Object.keys(byTeam).length === 0 && <div style={{ textAlign:"center", padding:48, color:"#334155" }}>완료된 업무가 없습니다.</div>}
      </div>
    );
  };

  // ── Settings View ──
  const SettingsView = () => {
    const clientTeams = Object.keys(clientDepts[settingsDept]?.teams || {});
    const validTeam = clientTeams.includes(settingsTeam) ? settingsTeam : clientTeams[0] || "";

    // ── 엑셀 백업 ──
    const exportExcel = () => {
      const statusLabel = { active:"진행중", delayed:"지연", completed:"완료" };

      // 시트1: 업무 목록
      const taskRows = tasks.map(t => ({
        "업무명": t.name,
        "의뢰부서": t.clientDept,
        "의뢰팀": t.clientTeam,
        "PM": t.pm || "",
        "제작팀": t.videoTeam,
        "담당자": t.assignees.join(", "),
        "시작일": t.startDate,
        "종료일": t.endDate,
        "상태": statusLabel[t.status] || t.status,
        "진척도(%)": t.progressLog.length > 0 ? t.progressLog[t.progressLog.length-1].progress : 0,
        "최근메모": t.progressLog.length > 0 ? t.progressLog[t.progressLog.length-1].note : "",
      }));

      // 시트2: 퇴근 체크 로그
      const logRows = [];
      tasks.forEach(t => {
        t.progressLog.forEach(l => {
          logRows.push({
            "업무명": t.name,
            "의뢰부서": t.clientDept,
            "제작팀": t.videoTeam,
            "담당자": t.assignees.join(", "),
            "날짜": l.date,
            "진척도(%)": l.progress,
            "메모": l.note,
          });
        });
      });
      logRows.sort((a,b) => b["날짜"].localeCompare(a["날짜"]));

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(taskRows), "업무목록");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(logRows), "체크인로그");

      const date = new Date();
      const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      XLSX.writeFile(wb, `VideoFlow_백업_${dateStr}.xlsx`);
    };

    const exportCSV = () => {
      const statusLabel = { active:"진행중", delayed:"지연", completed:"완료" };
      const rows = [
        ["업무명","의뢰부서","의뢰팀","PM","제작팀","담당자","시작일","종료일","상태","진척도(%)","최근메모"],
        ...tasks.map(t => [
          t.name, t.clientDept, t.clientTeam, t.pm||"", t.videoTeam,
          t.assignees.join("/"), t.startDate, t.endDate,
          statusLabel[t.status]||t.status,
          t.progressLog.length>0 ? t.progressLog[t.progressLog.length-1].progress : 0,
          t.progressLog.length>0 ? t.progressLog[t.progressLog.length-1].note : "",
        ])
      ];
      const csv = "\uFEFF" + rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(",")).join("\n");
      const blob = new Blob([csv], { type:"text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const date = new Date();
      const dateStr = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
      a.href = url; a.download = `VideoFlow_백업_${dateStr}.csv`; a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:20 }}>

        {/* ── 백업 카드 ── */}
        <div style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:14, padding:22 }}>
          <div style={{ fontWeight:700, fontSize:16, color:"#f1f5f9", marginBottom:6 }}>📥 데이터 백업</div>
          <div style={{ fontSize:12, color:"#475569", marginBottom:18 }}>
            현재 등록된 <span style={{ color:"#60a5fa", fontWeight:700 }}>{tasks.length}개</span> 업무와 체크인 기록을 파일로 내보냅니다.
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <button onClick={exportExcel}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 20px", borderRadius:10,
                border:"1px solid #166534", background:"#052e16", color:"#4ade80",
                fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              <span style={{ fontSize:18 }}>📊</span> 엑셀로 내보내기 (.xlsx)
            </button>
            <button onClick={exportCSV}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"11px 20px", borderRadius:10,
                border:"1px solid #1d4ed8", background:"#0c1a2e", color:"#60a5fa",
                fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
              <span style={{ fontSize:18 }}>📄</span> CSV로 내보내기 (.csv)
            </button>
          </div>
          <div style={{ marginTop:14, fontSize:11, color:"#334155" }}>
            ✓ 업무목록 시트 &nbsp;·&nbsp; ✓ 퇴근체크 로그 시트 &nbsp;·&nbsp; ✓ 날짜 자동 파일명
          </div>
        </div>

        <div style={gridSettings}>
        {/* Client dept members */}
        <div style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:14, padding:22 }}>
          <div style={{ fontWeight:700, fontSize:16, color:"#f1f5f9", marginBottom:16 }}>의뢰부서 팀원 관리</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
            <div>
              <label style={lbl}>부서</label>
              <select style={inp} value={settingsDept} onChange={e=>{setSettingsDept(e.target.value);setSettingsTeam(Object.keys(clientDepts[e.target.value]?.teams||{})[0]||"");}}>
                {Object.keys(clientDepts).map(d=><option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>팀</label>
              <select style={inp} value={validTeam} onChange={e=>setSettingsTeam(e.target.value)}>
                {clientTeams.map(t=><option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>현재 팀원</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
              {(clientDepts[settingsDept]?.teams[validTeam]||[]).map(m=>(
                <div key={m} style={{ display:"flex", alignItems:"center", gap:4, background:"#1e293b", borderRadius:18, padding:"4px 10px" }}>
                  <span style={{ fontSize:12, color:"#94a3b8" }}>{m}</span>
                  <button onClick={()=>removeClientMember(settingsDept,validTeam,m)} style={{ background:"none", border:"none", color:"#7f1d1d", cursor:"pointer", fontSize:13, lineHeight:1, padding:"0 2px" }}>×</button>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input style={{ ...inp, flex:1 }} placeholder="이름 입력" value={newMemberName} onChange={e=>setNewMemberName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addClientMember(validTeam)}/>
            <button onClick={()=>addClientMember(validTeam)} style={{ padding:"9px 14px", borderRadius:8, border:"none", background:"#1d4ed8", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"inherit", whiteSpace:"nowrap" }}>+ 추가</button>
          </div>
        </div>

        {/* Video team members */}
        <div style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:14, padding:22 }}>
          <div style={{ fontWeight:700, fontSize:16, color:"#f1f5f9", marginBottom:16 }}>영상기획팀 팀원 관리</div>
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>팀 선택</label>
            <select style={inp} value={newVTTeam} onChange={e=>setNewVTTeam(e.target.value)}>
              {Object.keys(videoTeamMembers).map(t=><option key={t}>{t}</option>)}
            </select>
          </div>
          {Object.entries(videoTeamMembers).map(([team, members])=>(
            <div key={team} style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#3B82F6", marginBottom:7 }}>{team}</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                {members.map(m=>(
                  <div key={m} style={{ display:"flex", alignItems:"center", gap:4, background:"#0c1a2e", border:"1px solid #1d4ed8", borderRadius:18, padding:"4px 10px" }}>
                    <div style={{ width:16, height:16, borderRadius:"50%", background:"#1d4ed8", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, fontWeight:800, color:"#fff" }}>{m[0]}</div>
                    <span style={{ fontSize:12, color:"#60a5fa" }}>{m}</span>
                    <button onClick={()=>removeVideoMember(team,m)} style={{ background:"none", border:"none", color:"#7f1d1d", cursor:"pointer", fontSize:13, lineHeight:1, padding:"0 2px" }}>×</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div style={{ display:"flex", gap:8, marginTop:10 }}>
            <input style={{ ...inp, flex:1 }} placeholder="이름 입력" value={newVTMember} onChange={e=>setNewVTMember(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addVideoMember()}/>
            <button onClick={addVideoMember} style={{ padding:"9px 14px", borderRadius:8, border:"none", background:"#1d4ed8", color:"#fff", fontWeight:700, cursor:"pointer", fontSize:12, fontFamily:"inherit", whiteSpace:"nowrap" }}>+ 추가</button>
          </div>
        </div>
      </div>
    </div>
    );
  };

  // ── Annual View ──
  const AnnualView = () => {
    const MONTHS = ["1월","2월","3월","4월","5월","6월","7월","8월","9월","10월","11월","12월"];
    const yearTasks = tasks.filter(t => t.startDate.startsWith(filterYear) || t.endDate.startsWith(filterYear));
    const allYears = [...new Set(tasks.flatMap(t => [t.startDate.slice(0,4), t.endDate.slice(0,4)]))].sort().reverse();
    const byMonth = {};
    MONTHS.forEach((_,i) => { byMonth[i+1] = []; });
    yearTasks.forEach(t => {
      for (let m = 1; m <= 12; m++) {
        const mStr = `${filterYear}-${String(m).padStart(2,'0')}`;
        const sM = t.startDate.slice(0,7), eM = t.endDate.slice(0,7);
        if (mStr >= sM && mStr <= eM && !byMonth[m].find(x => x.id === t.id)) byMonth[m].push(t);
      }
    });
    const yCompleted = yearTasks.filter(t=>t.status==="completed").length;
    const yActive = yearTasks.filter(t=>t.status==="active").length;
    const yDelayed = yearTasks.filter(t=>t.status==="delayed").length;
    const yTotal = yearTasks.length;
    return (
      <div>
        <div style={{ display:"flex", gap:8, marginBottom:24, alignItems:"center", flexWrap:"wrap" }}>
          <span style={{ fontSize:12, color:"#334155" }}>연도</span>
          {allYears.map(y => (
            <button key={y} onClick={()=>setFilterYear(y)}
              style={{ padding:"6px 18px", borderRadius:20, border:`1px solid ${filterYear===y?"#3B82F6":"#1a2540"}`,
                background:filterYear===y?"#0d2348":"none", color:filterYear===y?"#60a5fa":"#475569",
                fontWeight:filterYear===y?700:400, fontSize:13, cursor:"pointer" }}>
              {y}년
            </button>
          ))}
        </div>
        <div style={{ ...gridStats, marginBottom:24 }}>
          {[{label:"전체 업무", val:yTotal, color:"#60a5fa"},{label:"진행중", val:yActive, color:"#3B82F6"},{label:"지연", val:yDelayed, color:"#EF4444"},{label:"완료", val:yCompleted, color:"#4ade80"}].map(s=>(
            <div key={s.label} style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:12, padding:"16px 18px" }}>
              <div style={{ fontSize:10, color:"#334155", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:32, fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</div>
              {yTotal > 0 && <div style={{ fontSize:10, color:"#1e3a5f", marginTop:4 }}>{Math.round((s.val/yTotal)*100)}%</div>}
            </div>
          ))}
        </div>
        <div style={gridMonths}>
          {MONTHS.map((mName, mi) => {
            const mNum = mi+1;
            const mTasks = byMonth[mNum];
            const mCompleted = mTasks.filter(t=>t.status==="completed").length;
            const mActive = mTasks.filter(t=>t.status!=="completed").length;
            const mStr = `${filterYear}-${String(mNum).padStart(2,'0')}`;
            const isCurrent = mStr === getYM(todayStr);
            const isPast = mStr < getYM(todayStr);
            return (
              <div key={mName} style={{ background:"#0b1120", border:`1px solid ${isCurrent?"#1d4ed8":"#1a2540"}`,
                borderRadius:16, padding:isPC?22:16, opacity:!isPast&&!isCurrent&&mTasks.length===0?0.4:1,
                minHeight: isPC?220:160 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontWeight:800, fontSize:isPC?18:15, color:isCurrent?"#60a5fa":"#cbd5e1" }}>{mName}</span>
                    {isCurrent && <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:10, background:"#0d2348", border:"1px solid #1d4ed8", color:"#60a5fa" }}>이번달</span>}
                  </div>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:isPC?26:20, fontWeight:800, color:mTasks.length===0?"#1e3a5f":mCompleted===mTasks.length&&mTasks.length>0?"#4ade80":"#f1f5f9" }}>{mTasks.length}</span>
                </div>
                {mTasks.length > 0 && (
                  <>
                    <div style={{ display:"flex", gap:3, marginBottom:12, height:5, borderRadius:4, overflow:"hidden", background:"#1a2540" }}>
                      <div style={{ flex:mCompleted, background:"#22c55e", borderRadius:4 }}/>
                      <div style={{ flex:mActive, background:"#3B82F6", borderRadius:4 }}/>
                    </div>
                    <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
                      {mTasks.slice(0, isPC?5:3).map(t => {
                        const pct = getProgress(t);
                        const dc = getDeptColor(t.clientDept);
                        const sm = getStatusMeta(t);
                        return (
                          <div key={t.id} onClick={()=>setDetailModal(t)} style={{ cursor:"pointer", padding:isPC?"9px 12px":"7px 10px", background:"#070e1a", borderRadius:9, borderLeft:`3px solid ${t.status==="completed"?"#22c55e":dc}` }}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                              <span style={{ fontSize:isPC?12:11, fontWeight:600, color:"#cbd5e1", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"70%" }}>{t.name}</span>
                              <span style={{ fontSize:isPC?11:10, fontWeight:700, color:sm.text, flexShrink:0 }}>{pct}%</span>
                            </div>
                            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                              <div style={{ flex:1, background:"#1a2540", borderRadius:4, height:4, overflow:"hidden" }}>
                                <div style={{ height:"100%", background:t.status==="completed"?"#22c55e":dc, width:`${pct}%`, borderRadius:4 }}/>
                              </div>
                              <span style={{ fontSize:9, color:"#475569", flexShrink:0 }}>{t.assignees[0]}{t.assignees.length>1&&`+${t.assignees.length-1}`}</span>
                            </div>
                          </div>
                        );
                      })}
                      {mTasks.length > (isPC?5:3) && <div style={{ textAlign:"center", fontSize:11, color:"#334155", padding:"4px 0" }}>+{mTasks.length-(isPC?5:3)}개 더</div>}
                    </div>
                    <div style={{ display:"flex", gap:10, marginTop:12, fontSize:isPC?11:10 }}>
                      <span style={{ color:"#4ade80" }}>✓ {mCompleted}완료</span>
                      <span style={{ color:"#60a5fa" }}>▶ {mActive}진행</span>
                    </div>
                  </>
                )}
                {mTasks.length === 0 && <div style={{ textAlign:"center", padding:"20px 0", fontSize:12, color:"#1e3a5f" }}>{isPast?"업무 없음":"예정 없음"}</div>}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Member Board ──
  const MemberBoard = () => {
    const member = selectedMember;
    const memberTasks = tasks.filter(t => t.assignees.includes(member));
    const filtered = memberTasks.filter(t => {
      if (memberStatusFilter === "전체") return true;
      const sm = getStatusMeta(t);
      if (memberStatusFilter === "진행중") return sm.label === "진행중" || sm.label === "오늘마감";
      if (memberStatusFilter === "지연") return sm.label === "지연" || sm.label === "마감초과";
      if (memberStatusFilter === "완료") return t.status === "completed";
      return true;
    });
    const byMonth = {};
    filtered.forEach(t => {
      const ym = getYM(t.startDate);
      if (!byMonth[ym]) byMonth[ym] = [];
      byMonth[ym].push(t);
    });
    const sortedMonths = Object.keys(byMonth).sort().reverse();
    const totalDone = memberTasks.filter(t=>t.status==="completed").length;
    const totalActive = memberTasks.filter(t=>t.status==="active").length;
    const avgPct = memberTasks.length > 0 ? Math.round(memberTasks.reduce((a,t)=>a+getProgress(t),0)/memberTasks.length) : 0;
    const memberTeam = Object.entries(videoTeamMembers).find(([,members])=>members.includes(member))?.[0] || "";
    return (
      <div>
        <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:28 }}>
          <button onClick={()=>setSelectedMember(null)}
            style={{ padding:"7px 14px", borderRadius:8, border:"1px solid #1a2540", background:"none", color:"#60a5fa", fontWeight:600, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            ← 팀원 목록
          </button>
          <div style={{ display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#3B82F6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#fff" }}>{member[0]}</div>
            <div>
              <div style={{ fontSize:22, fontWeight:900, color:"#f1f5f9" }}>{member}</div>
              <div style={{ fontSize:13, color:"#475569" }}>영상사업부 · {memberTeam}</div>
            </div>
          </div>
        </div>
        <div style={{ ...gridStats, marginBottom:24 }}>
          {[{label:"전체 업무", val:memberTasks.length, color:"#60a5fa"},{label:"완료", val:totalDone, color:"#4ade80"},{label:"진행중", val:totalActive, color:"#3B82F6"},{label:"평균 진척도", val:`${avgPct}%`, color:"#f59e0b"}].map(s=>(
            <div key={s.label} style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:12, padding:"14px 18px" }}>
              <div style={{ fontSize:10, color:"#334155", marginBottom:4, textTransform:"uppercase", letterSpacing:"0.06em" }}>{s.label}</div>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:28, fontWeight:800, color:s.color, lineHeight:1 }}>{s.val}</div>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", gap:6, marginBottom:24 }}>
          {["전체","진행중","지연","완료"].map(s => {
            const colors = {전체:"#94a3b8", 진행중:"#60a5fa", 지연:"#f87171", 완료:"#4ade80"};
            const isActive = memberStatusFilter === s;
            const cnt = s==="전체"?memberTasks.length:s==="완료"?memberTasks.filter(t=>t.status==="completed").length:s==="진행중"?memberTasks.filter(t=>t.status==="active").length:memberTasks.filter(t=>t.status==="delayed").length;
            return (
              <button key={s} onClick={()=>setMemberStatusFilter(s)}
                style={{ padding:"7px 18px", borderRadius:22, border:`1px solid ${isActive?colors[s]:"#1a2540"}`,
                  background:isActive?`${colors[s]}18`:"none", color:isActive?colors[s]:"#475569",
                  fontWeight:isActive?700:400, fontSize:13, cursor:"pointer" }}>
                {s} <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, opacity:0.8 }}>{cnt}</span>
              </button>
            );
          })}
        </div>
        {sortedMonths.length === 0 && <div style={{ textAlign:"center", padding:60, color:"#1e3a5f", fontSize:14 }}>해당 조건의 업무가 없습니다.</div>}
        {sortedMonths.map(ym => {
          const [y, m] = ym.split('-');
          const mTasks = byMonth[ym];
          const mDone = mTasks.filter(t=>t.status==="completed").length;
          return (
            <div key={ym} style={{ marginBottom:28 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ fontWeight:800, fontSize:16, color:"#f1f5f9" }}>{y}년 {parseInt(m)}월</div>
                <div style={{ height:1, flex:1, background:"#1a2540" }}/>
                <div style={{ fontSize:12, color:"#334155" }}>{mDone}/{mTasks.length} 완료</div>
              </div>
              <div style={gridMemberTasks}>
                {mTasks.map(task => {
                  const pct = getProgress(task);
                  const sm = getStatusMeta(task);
                  const dc = getDeptColor(task.clientDept);
                  const total = diffDays(task.startDate, task.endDate)+1;
                  return (
                    <div key={task.id} onClick={()=>setDetailModal(task)} style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.15s", position:"relative", overflow:"hidden" }}
                      onMouseEnter={e=>{e.currentTarget.style.borderColor=`${dc}55`;e.currentTarget.style.transform="translateY(-1px)";}}
                      onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a2540";e.currentTarget.style.transform="translateY(0)";}}>
                      <div style={{ position:"absolute", left:0, top:0, bottom:0, width:3, background:task.status==="completed"?"#4ade80":dc, borderRadius:"12px 0 0 12px" }}/>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                        <div style={{ flex:1, paddingRight:10 }}>
                          <div style={{ display:"flex", gap:5, marginBottom:5, flexWrap:"wrap" }}>
                            <span style={{ fontSize:9, fontWeight:700, padding:"2px 7px", borderRadius:14, background:sm.bg, border:`1px solid ${sm.border}`, color:sm.text }}>{sm.label}</span>
                            <span style={{ fontSize:9, padding:"2px 7px", borderRadius:14, background:`${dc}18`, color:dc, fontWeight:600 }}>{task.clientDept}</span>
                          </div>
                          <div style={{ fontSize:14, fontWeight:700, color:"#f1f5f9", lineHeight:1.3 }}>{task.name}</div>
                        </div>
                        <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:24, fontWeight:800, color:task.status==="completed"?"#4ade80":dc, lineHeight:1, flexShrink:0 }}>
                          {pct}<span style={{ fontSize:10 }}>%</span>
                        </div>
                      </div>
                      <div style={{ background:"#1a2540", borderRadius:5, height:6, overflow:"hidden", marginBottom:8 }}>
                        <div style={{ height:"100%", background:task.status==="completed"?"#4ade80":dc, width:`${pct}%`, borderRadius:5, boxShadow:`0 0 6px ${dc}55` }}/>
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", fontSize:10, color:"#334155" }}>
                        <span>{task.clientTeam}{task.pm && ` · PM ${task.pm}`}</span>
                        <span>{fmtDate(task.startDate)}~{fmtDate(task.endDate)} ({total}일)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ── Stats ──
  const active = tasks.filter(t=>t.status==="active"||t.status==="delayed");
  const stats = [
    { label:"진행중", val:tasks.filter(t=>t.status==="active").length, color:"#3B82F6" },
    { label:"지연", val:tasks.filter(t=>t.status==="delayed"||diffDays(todayStr,t.endDate)<0&&t.status!=="completed").length, color:"#EF4444" },
    { label:"오늘마감", val:tasks.filter(t=>diffDays(todayStr,t.endDate)===0&&t.status!=="completed").length, color:"#F59E0B" },
    { label:"완료", val:tasks.filter(t=>t.status==="completed").length, color:"#4ade80" },
  ];

  // ── Main Render ──
  const FONTS = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap";
  const bgWrap = { minHeight:"100vh", background:"#040d1a", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Noto Sans KR',sans-serif" };
  const logoEl = <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontWeight:700, fontSize:28, color:"#f1f5f9", marginBottom:8 }}><span style={{ color:"#3B82F6" }}>▶</span> VIDEO<span style={{ color:"#3B82F6" }}>FLOW</span></div>;
  const pulseStyle = `@keyframes pulse { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1.2)} } @keyframes spin{to{transform:rotate(360deg)}}`;

  // 인증 로딩 중
  if (authLoading) {
    return (
      <div style={bgWrap}>
        <link href={FONTS} rel="stylesheet"/>
        {logoEl}
        <div style={{ width:24, height:24, border:"3px solid #1d4ed8", borderTop:"3px solid transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite", marginTop:20 }}/>
        <style>{pulseStyle}</style>
      </div>
    );
  }

  // 로그인 화면
  if (!user) {
    return (
      <div style={bgWrap}>
        <link href={FONTS} rel="stylesheet"/>
        <style>{pulseStyle}</style>
        <div style={{ textAlign:"center", padding:"40px 32px", background:"#0b1120", border:"1px solid #1a2540", borderRadius:24, maxWidth:360, width:"90%" }}>
          {logoEl}
          <div style={{ fontSize:12, color:"#475569", marginBottom:32, fontFamily:"'IBM Plex Mono',monospace" }}>영상사업부 업무관리 시스템</div>
          <button onClick={handleLogin} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:12, padding:"13px 20px", borderRadius:12, border:"1px solid #1e293b", background:"#fff", color:"#1a1a1a", fontWeight:700, fontSize:15, cursor:"pointer", fontFamily:"inherit", transition:"all 0.2s" }}
            onMouseEnter={e=>e.currentTarget.style.background="#f1f5f9"}
            onMouseLeave={e=>e.currentTarget.style.background="#fff"}>
            {/* Google 로고 SVG */}
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Google 계정으로 로그인
          </button>
          <div style={{ marginTop:16, fontSize:11, color:"#1e3a5f" }}>회사 Google 계정으로 로그인하세요</div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={bgWrap}>
        <link href={FONTS} rel="stylesheet"/>
        {logoEl}
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width:8, height:8, borderRadius:"50%", background:"#3B82F6", animation:`pulse 1.2s ${i*0.2}s infinite ease-in-out` }}/>
          ))}
        </div>
        <div style={{ fontSize:12, color:"#334155", marginTop:16 }}>데이터 불러오는 중...</div>
        <style>{pulseStyle}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight:"100vh", background:"#040d1a", color:"#f1f5f9", fontFamily:"'Noto Sans KR',sans-serif", width:"100%" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Noto+Sans+KR:wght@400;500;600;700;800;900&display=swap" rel="stylesheet"/>
      <style>{`
        html, body { margin:0; padding:0; background:#040d1a; }
        @keyframes fadeIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:0.2;transform:scale(0.8)}50%{opacity:1;transform:scale(1.2)}}
        *{box-sizing:border-box}
        .nav-scroll{display:flex;align-items:center;gap:4px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none;flex-wrap:nowrap}
        .nav-scroll::-webkit-scrollbar{display:none}
      `}</style>

      {/* Header - 항상 1줄 */}
      <div style={{ background:"#070f1e", borderBottom:"1px solid #0f1e38", padding:`0 ${isMobile?"10px":"24px"}`, position:"sticky", top:0, zIndex:100, boxShadow:"0 2px 20px rgba(0,0,0,0.4)" }}>
        <div style={{ maxWidth:1440, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56, gap:8, overflow:"hidden" }}>

          {/* 왼쪽: 로고 + 저장상태 */}
          <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontWeight:700, fontSize:isMobile?14:16, color:"#f1f5f9", whiteSpace:"nowrap" }}>
              <span style={{ color:"#3B82F6" }}>▶</span> VIDEO<span style={{ color:"#3B82F6" }}>FLOW</span>
            </div>
            {!isTablet && (
              <div style={{ fontSize:11, color:"#1e3a5f", fontFamily:"'IBM Plex Mono',monospace", background:"#0b1929", padding:"3px 8px", borderRadius:6, whiteSpace:"nowrap" }}>영상사업부 업무관리</div>
            )}
            <div style={{ display:"flex", alignItems:"center", gap:5, padding:"3px 8px", borderRadius:6, flexShrink:0,
              background: saveStatus==="saving"?"#0a1929": saveStatus==="error"?"#2d0a0a":"#0a1e0f",
              border: `1px solid ${saveStatus==="saving"?"#1d4ed8": saveStatus==="error"?"#7f1d1d":"#166534"}`,
              transition:"all 0.3s" }}>
              <div style={{ width:6, height:6, borderRadius:"50%",
                background: saveStatus==="saving"?"#3B82F6": saveStatus==="error"?"#ef4444":"#22c55e",
                animation: saveStatus==="saving"?"pulse 1s infinite ease-in-out":undefined }}/>
              {!isMobile && (
                <span style={{ fontSize:10, fontFamily:"'IBM Plex Mono',monospace",
                  color: saveStatus==="saving"?"#60a5fa": saveStatus==="error"?"#f87171":"#4ade80", whiteSpace:"nowrap" }}>
                  {saveStatus==="saving"?"저장 중...": saveStatus==="error"?"저장 실패":"저장됨"}
                </span>
              )}
            </div>
          </div>

          {/* 오른쪽: 네비게이션 - overflow scroll로 1줄 유지 */}
          <div className="nav-scroll" style={{ flexShrink:1, minWidth:0 }}>
            {[["board","업무보드"],["monthly","월별"],["annual","연간"],["members","팀원"],["completed","완료"],["settings","⚙ 관리"]].map(([v,l])=>(
              <button key={v} onClick={()=>setView(v)}
                style={{ padding:isMobile?"4px 7px":isTablet?"5px 9px":"6px 13px", borderRadius:8,
                  border:`1px solid ${view===v?"#3B82F6":"#0f1e38"}`,
                  background:view===v?"#0d2348":"none", color:view===v?"#60a5fa":"#475569",
                  fontWeight:600, fontSize:isMobile?10:isTablet?11:12, cursor:"pointer", fontFamily:"inherit",
                  whiteSpace:"nowrap", flexShrink:0 }}>
                {l}
              </button>
            ))}
            <button onClick={openAdd}
              style={{ padding:isMobile?"4px 8px":isTablet?"5px 10px":"6px 14px", borderRadius:8, border:"none",
                background:"#1d4ed8", color:"#fff", fontWeight:700,
                fontSize:isMobile?10:isTablet?11:12, cursor:"pointer", fontFamily:"inherit",
                whiteSpace:"nowrap", flexShrink:0 }}>
              + 추가
            </button>

            {/* 사용자 정보 + 로그아웃 */}
            <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0, marginLeft:4 }}>
              {user.photoURL && <img src={user.photoURL} alt="" style={{ width:28, height:28, borderRadius:"50%", border:"2px solid #1d4ed8" }}/>}
              {!isMobile && <span style={{ fontSize:11, color:"#64748b", whiteSpace:"nowrap", maxWidth:100, overflow:"hidden", textOverflow:"ellipsis" }}>{user.displayName || user.email}</span>}
              <button onClick={handleLogout} style={{ padding:"4px 8px", borderRadius:6, border:"1px solid #1e293b", background:"none", color:"#475569", fontSize:10, cursor:"pointer", whiteSpace:"nowrap", fontFamily:"inherit" }}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1440, margin:"0 auto", padding:isMobile?"10px":"24px 28px" }}>

        {/* ── Board View ── */}
        {view === "board" && (
          <>
            {/* Stats */}
            <div style={{ ...gridStats, marginBottom:20 }}>
              {stats.map(s=>(
                <div key={s.label} style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:10, padding:"13px 16px" }}>
                  <div style={{ fontSize:10, color:"#334155", marginBottom:3, textTransform:"uppercase", letterSpacing:"0.05em" }}>{s.label}</div>
                  <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:28, fontWeight:800, color:s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Dept filter tabs */}
            <div style={{ display:"flex", gap:6, marginBottom:12, flexWrap:"wrap" }}>
              {["전체", ...Object.keys(clientDepts)].map(d=>{
                const dc = clientDepts[d]?.color || "#3B82F6";
                const active = filterDept===d;
                return (
                  <button key={d} onClick={()=>setFilterDept(d)}
                    style={{ padding:"6px 16px", borderRadius:22, border:`1px solid ${active? dc:"#1a2540"}`,
                      background:active?`${dc}22`:"none", color:active?dc:"#475569", fontWeight:active?700:400, fontSize:13, cursor:"pointer" }}>
                    {d}
                  </button>
                );
              })}
            </div>

            {/* Status filter */}
            <div style={{ display:"flex", gap:6, marginBottom:20 }}>
              {["전체","진행중","지연","완료"].map(s=>(
                <button key={s} onClick={()=>setFilterStatus(s)}
                  style={{ padding:"5px 13px", borderRadius:18, border:`1px solid ${filterStatus===s?"#475569":"#1a2540"}`,
                    background:filterStatus===s?"#1e293b":"none", color:filterStatus===s?"#94a3b8":"#334155", fontSize:12, cursor:"pointer" }}>
                  {s}
                </button>
              ))}
            </div>

            <div style={gridCards}>
              {filteredTasks.map(t=><TaskCard key={t.id} task={t}/>)}
              {filteredTasks.length===0 && <div style={{ gridColumn:"1/-1", textAlign:"center", padding:48, color:"#1e3a5f" }}>해당 조건의 업무가 없습니다.</div>}
            </div>
          </>
        )}

        {/* ── Monthly View ── */}
        {view === "monthly" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:20, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:12, color:"#334155" }}>월 선택</span>
              {allMonths.map(ym=>(
                <button key={ym} onClick={()=>setFilterMonth(ym)}
                  style={{ padding:"6px 16px", borderRadius:20, border:`1px solid ${filterMonth===ym?"#3B82F6":"#1a2540"}`,
                    background:filterMonth===ym?"#0d2348":"none", color:filterMonth===ym?"#60a5fa":"#475569", fontWeight:filterMonth===ym?700:400, fontSize:12, cursor:"pointer" }}>
                  {ym.replace('-','년 ')}월
                </button>
              ))}
            </div>
            <MonthlyView/>
          </>
        )}

        {view === "annual" && <AnnualView/>}

        {view === "members" && (
          selectedMember
            ? <MemberBoard/>
            : <div>
                <div style={{ fontWeight:800, fontSize:18, color:"#f1f5f9", marginBottom:24 }}>👥 팀원 보드</div>
                {Object.entries(videoTeamMembers).map(([team, members]) => (
                  <div key={team} style={{ marginBottom:28 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                      <div style={{ fontWeight:700, fontSize:15, color:"#60a5fa" }}>{team}</div>
                      <div style={{ height:1, flex:1, background:"#1a2540" }}/>
                    </div>
                    <div style={gridMembers}>
                      {members.map(m => {
                        const mTasks = tasks.filter(t=>t.assignees.includes(m));
                        const done = mTasks.filter(t=>t.status==="completed").length;
                        const active = mTasks.filter(t=>t.status==="active").length;
                        const pct = mTasks.length > 0 ? Math.round(mTasks.reduce((a,t)=>a+getProgress(t),0)/mTasks.length) : 0;
                        return (
                          <div key={m} onClick={()=>{setSelectedMember(m);setMemberStatusFilter("전체");}}
                            style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:14, padding:20, cursor:"pointer", textAlign:"center", transition:"all 0.18s" }}
                            onMouseEnter={e=>{e.currentTarget.style.borderColor="#3B82F6";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,0.4)";}}
                            onMouseLeave={e=>{e.currentTarget.style.borderColor="#1a2540";e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="none";}}>
                            <div style={{ width:52, height:52, borderRadius:"50%", background:"linear-gradient(135deg,#1d4ed8,#3B82F6)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, fontWeight:900, color:"#fff", margin:"0 auto 12px" }}>{m[0]}</div>
                            <div style={{ fontWeight:700, fontSize:15, color:"#f1f5f9", marginBottom:4 }}>{m}</div>
                            <div style={{ fontSize:11, color:"#475569", marginBottom:12 }}>업무 {mTasks.length}건</div>
                            <div style={{ background:"#1a2540", borderRadius:6, height:6, overflow:"hidden", marginBottom:6 }}>
                              <div style={{ height:"100%", background:"#3B82F6", width:`${pct}%`, borderRadius:6, boxShadow:"0 0 6px #3B82F688" }}/>
                            </div>
                            <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:14, fontWeight:800, color:"#3B82F6", marginBottom:8 }}>{pct}%</div>
                            <div style={{ display:"flex", justifyContent:"center", gap:10, fontSize:10 }}>
                              <span style={{ color:"#4ade80" }}>✓{done}</span>
                              <span style={{ color:"#60a5fa" }}>▶{active}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
        )}

        {view === "completed" && <CompletedView/>}
        {view === "settings" && SettingsView()}
      </div>

      {/* ── Detail Modal ── */}
      {detailModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)", padding:"16px" }} onClick={()=>setDetailModal(null)}>
          <div style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:20, padding:"20px", width:"100%", maxWidth:520, maxHeight:"85vh", overflow:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:18 }}>
              <div>
                <div style={{ display:"flex", gap:6, marginBottom:5 }}>
                  <span style={{ fontSize:11, padding:"2px 8px", borderRadius:20, background:`${getDeptColor(detailModal.clientDept)}18`, border:`1px solid ${getDeptColor(detailModal.clientDept)}40`, color:getDeptColor(detailModal.clientDept), fontWeight:600 }}>{detailModal.clientDept}</span>
                  <span style={{ fontSize:11, color:"#475569" }}>{detailModal.clientTeam}</span>
                </div>
                <div style={{ fontSize:19, fontWeight:800, color:"#f1f5f9" }}>{detailModal.name}</div>
              </div>
              <button onClick={()=>setDetailModal(null)} style={{ background:"none", border:"none", color:"#475569", fontSize:20, cursor:"pointer", alignSelf:"flex-start" }}>×</button>
            </div>
            <div style={{ display:"flex", gap:16, marginBottom:16, fontSize:12, color:"#475569" }}>
              <span>🎬 {detailModal.videoTeam}</span>
              <span>👥 {detailModal.assignees.join(", ")}</span>
              {detailModal.pm && <span>PM: <span style={{ color:"#94a3b8" }}>{detailModal.pm}</span></span>}
              <span>📅 {fmtFull(detailModal.startDate)} ~ {fmtFull(detailModal.endDate)}</span>
            </div>
            <div style={{ fontWeight:600, fontSize:12, color:"#334155", marginBottom:10, textTransform:"uppercase", letterSpacing:"0.05em" }}>일별 진척 로그</div>
            <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
              {detailModal.progressLog.map((l,i)=>(
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"9px 13px", background:"#070e1a", borderRadius:9 }}>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:11, color:"#334155", minWidth:40 }}>{fmtDate(l.date)}</span>
                  <div style={{ flex:1, background:"#1a2540", borderRadius:5, height:6, overflow:"hidden" }}>
                    <div style={{ height:"100%", background:getDeptColor(detailModal.clientDept), width:`${l.progress}%`, borderRadius:5 }}/>
                  </div>
                  <span style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:800, color:getDeptColor(detailModal.clientDept), minWidth:38, textAlign:"right" }}>{l.progress}%</span>
                  <span style={{ fontSize:11, color:"#334155", minWidth:80, textAlign:"right" }}>{l.note}</span>
                </div>
              ))}
              {detailModal.progressLog.length===0 && <div style={{ color:"#1e3a5f", fontSize:13 }}>아직 체크인 기록이 없습니다.</div>}
            </div>
          </div>
        </div>
      )}

      {/* ── Check-in Modal ── */}
      {checkInModal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)", padding:"16px" }}>
          <div style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:20, padding:"20px", width:"100%", maxWidth:420 }}>
            <div style={{ fontSize:11, color:"#334155", marginBottom:3 }}>퇴근 체크인 · {todayStr}</div>
            <div style={{ fontSize:18, fontWeight:800, color:"#f1f5f9", marginBottom:20 }}>{checkInModal.name}</div>
            <label style={lbl}>현재 진척도</label>
            <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
              <input type="range" min={0} max={100} value={checkInPct} onChange={e=>setCheckInPct(Number(e.target.value))} style={{ flex:1, accentColor:getDeptColor(checkInModal.clientDept) }}/>
              <div style={{ fontFamily:"'IBM Plex Mono',monospace", fontSize:28, fontWeight:800, color:getDeptColor(checkInModal.clientDept), minWidth:60, textAlign:"right" }}>{checkInPct}%</div>
            </div>
            <div style={{ background:"#1a2540", borderRadius:8, height:10, overflow:"hidden", marginBottom:18 }}>
              <div style={{ height:"100%", background:getDeptColor(checkInModal.clientDept), width:`${checkInPct}%`, transition:"width 0.15s", boxShadow:`0 0 8px ${getDeptColor(checkInModal.clientDept)}88`, borderRadius:8 }}/>
            </div>
            <label style={lbl}>오늘 업무 내용</label>
            <textarea value={checkInNote} onChange={e=>setCheckInNote(e.target.value)} placeholder="오늘 진행한 내용을 간략히 입력하세요..."
              style={{ ...inp, height:80, resize:"none", lineHeight:1.6, marginBottom:18 }}/>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>setCheckInModal(null)} style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid #1a2540", background:"none", color:"#475569", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>취소</button>
              <button onClick={saveCheckIn} style={{ flex:2, padding:"11px", borderRadius:10, border:"none", background:getDeptColor(checkInModal.clientDept), color:"#fff", fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>저장</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Task Add/Edit Modal ── */}
      {taskModal !== null && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, backdropFilter:"blur(6px)", padding:"16px" }}>
          <div style={{ background:"#0b1120", border:"1px solid #1a2540", borderRadius:20, padding:"20px", width:"100%", maxWidth:500, maxHeight:"90vh", overflow:"auto" }}>
            <div style={{ fontWeight:800, fontSize:17, color:"#f1f5f9", marginBottom:22 }}>{taskModal==="add"?"새 업무 추가":"업무 수정"}</div>
            {TaskForm()}
            <div style={{ display:"flex", gap:8, marginTop:22 }}>
              <button onClick={()=>{setTaskModal(null);setForm(emptyForm);}} style={{ flex:1, padding:"11px", borderRadius:10, border:"1px solid #1a2540", background:"none", color:"#475569", fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>취소</button>
              <button onClick={saveTask} disabled={!form.name.trim()} style={{ flex:2, padding:"11px", borderRadius:10, border:"none", background:form.name.trim()?"#1d4ed8":"#0f1e38", color:form.name.trim()?"#fff":"#334155", fontWeight:800, cursor:form.name.trim()?"pointer":"not-allowed", fontFamily:"inherit" }}>
                {taskModal==="add"?"추가하기":"저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
