'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { generateAIRecommendInfo } from '@/lib/mock-data';
import type { Ticket } from '@/lib/mock-data';

// ═══════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════

interface PlannerInput { origin: string; destination: string; budget: number; days: number; timePreference: 'early' | 'flexible' | 'afternoon' | 'evening' }
interface ParsedIntent { origin: string; destination: string; budget: number; days: number; timePreference: string; tripType: string; departTime: string; confidence: number }
interface PlanningStep { id: string; label: string; icon: string; detail: string; status: 'pending' | 'running' | 'done' }
interface TimelineEvent { time: string; title: string; icon: string; detail?: string }
interface DayPlan { day: number; title: string; icon: string; events: TimelineEvent[] }
interface TransportOption { ticket: Ticket; pros: string[]; cons: string[]; suitable: string; recommended: boolean }
interface PlanResult { outbound: Ticket; inbound: Ticket; allOutbound: TransportOption[]; allInbound: TransportOption[]; hotelPerNight: number; hotelNights: number; meals: number; attractions: number; transport: number; totalCost: number; budgetLeft: number; budgetUsage: number; aiScore: number; tips: string[]; itinerary: DayPlan[]; recommended: Ticket; fastest: Ticket; cheapest: Ticket }
interface ChatMessage { id: string; role: 'user' | 'assistant'; content: string; timestamp: number; type: 'text' | 'intent' | 'planning' | 'result' | 'update'; intent?: ParsedIntent; result?: PlanResult; steps?: PlanningStep[] }

// ═══════════════════════════════════════════════════════════════════════
// Mock Data & Engine
// ═══════════════════════════════════════════════════════════════════════

const MOCK_TICKETS_DB: Record<string, Ticket[]> = {
  '北京-上海': [
    mkTicket('G11','🚄','high_speed','高铁','中国铁路','北京南站','上海虹桥站','09:00','13:43','4h43m',283,553,96,92),
    mkTicket('G3','🚄','high_speed','高铁','中国铁路','北京南站','上海虹桥站','06:52','11:33','4h41m',281,553,97,88),
    mkTicket('CA1501','✈️','flight','飞机','中国国航','首都T3','虹桥T2','07:00','09:15','2h15m',135,1395,88,85),
    mkTicket('MU5101','✈️','flight','飞机','东方航空','大兴机场','浦东T1','08:30','10:50','2h20m',140,1280,85,78),
    mkTicket('D701','🚄','high_speed','动卧','中国铁路','北京南站','上海站','19:32','07:25','11h53m',713,650,90,72),
    mkTicket('T109','🚂','train','特快','中国铁路','北京站','上海站','20:04','11:02','14h58m',898,178,84,62),
  ],
  '北京-杭州': [
    mkTicket('G5','🚄','high_speed','高铁','中国铁路','北京南站','杭州东站','07:00','12:33','5h33m',333,626,95,89),
    mkTicket('CA1519','✈️','flight','飞机','中国国航','首都T3','萧山机场','08:00','10:20','2h20m',140,1180,86,82),
  ],
  '北京-三亚': [
    mkTicket('CA1369','✈️','flight','飞机','中国国航','首都T3','凤凰机场','07:30','11:20','3h50m',230,2150,84,80),
    mkTicket('HU7279','✈️','flight','飞机','海南航空','首都T1','凤凰机场','09:00','12:50','3h50m',230,1980,82,78),
  ],
  '北京-南京': [
    mkTicket('G1','🚄','high_speed','高铁','中国铁路','北京南站','南京南站','06:30','10:38','4h08m',248,443,96,90),
    mkTicket('G7','🚄','high_speed','高铁','中国铁路','北京南站','南京南站','07:00','11:07','4h07m',247,443,95,89),
  ],
};

function mkTicket(trainNo:string,typeIcon:string,type:Ticket['type'],typeLabel:string,carrier:string,oS:string,dS:string,dep:string,arr:string,dur:string,dMin:number,price:number,punc:number,score:number):Ticket{
  return {id:`${trainNo}_p`,type,typeLabel,typeIcon,trainNo,carrier,origin:'北京',originStation:oS,destination:'上海',destinationStation:dS,departureDate:'2026-06-10',departureTime:dep,arrivalDate:'2026-06-10',arrivalTime:arr,duration:dur,durationMinutes:dMin,seatClasses:[{class:type==='flight'?'经济舱':'二等座',price,available:50}],lowestPrice:price,punctuality:punc,score,scoreDetails:[{dimension:'time',label:'时间匹配',score:Math.min(100,score+5),weight:0.35,reason:''},{dimension:'price',label:'价格优势',score:Math.max(30,100-Math.round(price/15)),weight:0.25,reason:''},{dimension:'duration',label:'耗时最短',score:Math.max(20,100-Math.round(dMin/10)),weight:0.25,reason:''},{dimension:'comfort',label:'舒适度',score:type==='flight'?90:type==='high_speed'?85:55,weight:0.15,reason:''}],reasons:[],amenities:type==='flight'?['免费餐食','行李托运']:['WiFi','充电插座']};
}

function analyzeTransport(t:Ticket):TransportOption{
  const pros:string[]=[];const cons:string[]=[];
  if(t.type==='high_speed'){pros.push('准点率高','市中心直达','座位舒适');if(t.durationMinutes>300)cons.push('长途耗时较长');}
  else if(t.type==='flight'){pros.push('速度最快','适合长途');cons.push('需提前值机','受天气影响');}
  else{pros.push('价格最低');cons.push('耗时较长','舒适度一般');}
  if(t.punctuality>=95)pros.push('准点率极高');if(t.lowestPrice<=300)pros.push('价格实惠');if(t.score>=85)pros.push('综合评分高');
  return{ticket:t,pros,cons,suitable:t.type==='flight'?'追求效率':'综合最优',recommended:t.score>=85};
}

const ITINERARY_DB:Record<string,DayPlan[]>={
  '北京-上海':[
    {day:1,title:'出发日 · 抵达上海',icon:'🚀',events:[{time:'09:00',title:'北京南站出发',icon:'🚄',detail:'乘坐 G11 高铁'},{time:'13:43',title:'抵达上海虹桥站',icon:'📍'},{time:'15:00',title:'入住酒店',icon:'🏨',detail:'办理入住，稍作休息'},{time:'18:00',title:'外滩夜景漫步',icon:'🌃',detail:'欣赏黄浦江两岸灯光秀'},{time:'20:00',title:'南京路步行街',icon:'🛍️',detail:'逛街购物，品尝美食'}]},
    {day:2,title:'经典一日游',icon:'🏙️',events:[{time:'09:00',title:'豫园 · 城隍庙',icon:'🏛️',detail:'品尝南翔小笼包'},{time:'12:00',title:'午餐 · 本帮菜',icon:'🍜',detail:'老正兴或德兴馆'},{time:'14:00',title:'新天地 · 田子坊',icon:'🎨',detail:'感受海派文化与文艺气息'},{time:'17:00',title:'陆家嘴金融区',icon:'🏙️',detail:'东方明珠塔登顶观光'},{time:'20:00',title:'黄浦江游船',icon:'🚢',detail:'夜游黄浦江，欣赏两岸夜景'}]},
    {day:3,title:'深度体验 · 返程',icon:'🎨',events:[{time:'09:00',title:'上海博物馆',icon:'🏛️',detail:'参观古代艺术珍品'},{time:'12:00',title:'武康路漫步',icon:'☕',detail:'网红打卡，咖啡下午茶'},{time:'15:00',title:'酒店退房',icon:'🏨',detail:'行李寄存前台'},{time:'17:00',title:'返程出发',icon:'🚄',detail:'乘坐高铁返回北京'}]},
  ],
  '北京-杭州':[
    {day:1,title:'出发 · 西湖初见',icon:'🚀',events:[{time:'07:00',title:'北京南站出发',icon:'🚄'},{time:'12:33',title:'抵达杭州东站',icon:'📍'},{time:'14:00',title:'入住酒店',icon:'🏨'},{time:'16:00',title:'西湖断桥残雪',icon:'🏞️',detail:'漫步白堤，远眺保俶塔'},{time:'19:00',title:'湖滨步行街',icon:'🛍️',detail:'晚餐+购物'}]},
    {day:2,title:'西湖深度游',icon:'🏞️',events:[{time:'09:00',title:'苏堤春晓',icon:'🌿',detail:'骑行或漫步苏堤'},{time:'11:00',title:'花港观鱼',icon:'🐟'},{time:'13:00',title:'雷峰塔',icon:'🗼',detail:'登塔俯瞰西湖全景'},{time:'15:00',title:'三潭印月',icon:'⛵',detail:'乘船登岛'},{time:'18:00',title:'河坊街美食',icon:'🍜',detail:'品尝杭州特色小吃'}]},
  ],
  '北京-三亚':[
    {day:1,title:'出发 · 海岛初见',icon:'✈️',events:[{time:'07:30',title:'首都机场出发',icon:'✈️'},{time:'11:20',title:'抵达三亚凤凰机场',icon:'📍'},{time:'13:00',title:'入住海景酒店',icon:'🏨',detail:'三亚湾或亚龙湾'},{time:'16:00',title:'三亚湾沙滩',icon:'🏖️',detail:'沙滩漫步，椰梦长廊'},{time:'18:30',title:'海鲜大餐',icon:'🦐',detail:'第一市场海鲜加工'}]},
    {day:2,title:'海滩度假日',icon:'🏖️',events:[{time:'09:00',title:'亚龙湾沙滩',icon:'🏖️',detail:'浮潜体验或沙滩休闲'},{time:'12:00',title:'海边午餐',icon:'🍹'},{time:'14:00',title:'热带天堂森林公园',icon:'🌴',detail:'过江龙索桥，鸟巢度假村'},{time:'18:00',title:'椰梦长廊日落',icon:'🌅',detail:'三亚最美日落观赏点'},{time:'20:00',title:'三亚千古情',icon:'🎭',detail:'大型演出（可选）'}]},
    {day:3,title:'深度探索 · 返程',icon:'🌴',events:[{time:'08:00',title:'蜈支洲岛',icon:'🏝️',detail:'潜水、摩托艇等水上项目'},{time:'14:00',title:'海棠湾免税店',icon:'🛍️',detail:'全球最大单体免税店'},{time:'17:00',title:'返程出发',icon:'✈️',detail:'前往机场'}]},
  ],
  '北京-南京':[
    {day:1,title:'出发 · 金陵初见',icon:'🚀',events:[{time:'06:30',title:'北京南站出发',icon:'🚄'},{time:'10:38',title:'抵达南京南站',icon:'📍'},{time:'12:00',title:'入住酒店',icon:'🏨'},{time:'14:00',title:'中山陵',icon:'🏛️',detail:'瞻仰孙中山先生陵寝'},{time:'17:00',title:'明孝陵',icon:'🏛️',detail:'世界文化遗产'},{time:'19:00',title:'夫子庙秦淮河',icon:'🌃',detail:'夜游秦淮河，品尝小吃'}]},
    {day:2,title:'文化之旅 · 返程',icon:'🏛️',events:[{time:'09:00',title:'南京博物院',icon:'🏛️',detail:'中国三大博物馆之一'},{time:'12:00',title:'老门东',icon:'🍜',detail:'南京传统美食街区'},{time:'14:00',title:'总统府',icon:'🏛️',detail:'中国近代史遗址'},{time:'16:00',title:'返程出发',icon:'🚄',detail:'乘高铁返回北京'}]},
  ],
};

function generateItinerary(days:number,o:string,d:string):DayPlan[]{const k=`${o}-${d}`;const t=ITINERARY_DB[k]||ITINERARY_DB['北京-上海'];return t.slice(0,Math.min(days,t.length));}
function runPlanner(i:PlannerInput):PlanResult{
  const k=`${i.origin}-${i.destination}`;const tk=MOCK_TICKETS_DB[k]||MOCK_TICKETS_DB['北京-上海'];
  const hr:Record<string,[number,number]>={early:[6,9],flexible:[6,22],afternoon:[12,18],evening:[18,22]};const[lo,hi]=hr[i.timePreference]||hr.flexible;
  const ft=(t:Ticket[])=>{const f=t.filter(x=>{const h=parseInt(x.departureTime.split(':')[0]);return h>=lo&&h<=hi;});return f.length>0?f:t;};
  const sorted=[...tk].sort((a,b)=>b.score-a.score);const out=ft(sorted)[0];const inb=[...tk].sort((a,b)=>a.lowestPrice-b.lowestPrice)[0];
  const allOut=tk.map(t=>analyzeTransport(t));const allIn=tk.map(t=>analyzeTransport(t));
  const hp=i.budget>5000?450:i.budget>3000?280:150;const hn=Math.max(0,i.days-1);const tr=out.lowestPrice+inb.lowestPrice;
  const ml=i.days*(i.budget>5000?200:i.budget>3000?120:60);const at=i.days*(i.budget>5000?150:i.budget>3000?80:30);
  const tc=tr+hp*hn+ml+at;const bl=i.budget-tc;const bu=Math.round((tc/i.budget)*100);
  const tips:string[]=[];if(bu>90)tips.push('预算较紧，建议选择经济型住宿');if(bu<50)tips.push('预算充裕，可升级座位或酒店');if(out.type==='high_speed')tips.push('高铁出行性价比高');if(i.days>=3)tips.push('多日行程建议购买景点联票');
  const iti=generateItinerary(i.days,i.origin,i.destination);
  const fastest=[...tk].sort((a,b)=>a.durationMinutes-b.durationMinutes)[0];const cheapest=[...tk].sort((a,b)=>a.lowestPrice-b.lowestPrice)[0];
  return{outbound:out,inbound:inb,allOutbound:allOut,allInbound:allIn,hotelPerNight:hp,hotelNights:hn,meals:ml,attractions:at,transport:tr,totalCost:tc,budgetLeft:bl,budgetUsage:bu,aiScore:+(out.score/10*0.6+(bl>0?4:2)).toFixed(1),tips,itinerary:iti,recommended:out,fastest,cheapest};
}

// ═══════════════════════════════════════════════════════════════════════
// Intent Parser
// ═══════════════════════════════════════════════════════════════════════

function parseIntent(q:string):ParsedIntent{
  const r:ParsedIntent={origin:'北京',destination:'上海',budget:3000,days:2,timePreference:'flexible',tripType:'leisure',departTime:'灵活',confidence:0.7};
  const cm=q.match(/([一-龥]{2,4})(?:到|去|至|→|->)([一-龥]{2,4})/);if(cm){r.origin=cm[1];r.destination=cm[2];r.confidence+=0.1;}
  const bm=q.match(/预算\s*(\d+)\s*(?:元|块|¥)?/)||q.match(/(\d+)\s*(?:元|块|¥)/);if(bm){r.budget=parseInt(bm[1]);r.confidence+=0.05;}if(/最便宜|省钱/.test(q))r.budget=500;
  const dm=q.match(/(\d+)\s*(?:天|日)/);if(dm){r.days=parseInt(dm[1]);r.confidence+=0.05;}if(/周末|两天/.test(q))r.days=2;if(/当天|一日/.test(q))r.days=1;if(/三天/.test(q))r.days=3;
  if(/明天|明日/.test(q)){r.confidence+=0.05;r.departTime='明天';}if(/下周/.test(q)){r.departTime='下周';}
  if(/早上|上午|早班/.test(q)){r.timePreference='early';r.departTime+='上午';}else if(/下午/.test(q)){r.timePreference='afternoon';r.departTime+='下午';}else if(/晚上/.test(q)){r.timePreference='evening';r.departTime+='晚上';}
  if(/出差|商务/.test(q)){r.tripType='business';r.budget=Math.max(r.budget,5000);r.confidence+=0.03;}
  if(/度假|旅游|休闲|海滩/.test(q)){r.tripType='leisure';r.budget=Math.max(r.budget,4000);}
  if(/考试|笔试/.test(q)){r.tripType='exam';r.days=Math.min(r.days,2);}
  if(!cm){if(/三亚|海南/.test(q)){r.destination='三亚';r.origin='北京';r.budget=Math.max(r.budget,5000);}if(/杭州/.test(q)){r.destination='杭州';r.origin='北京';}if(/南京/.test(q)){r.destination='南京';r.origin='北京';}}
  r.confidence=Math.min(0.98,r.confidence);return r;
}

function applyDelta(prev:PlannerInput,q:string):PlannerInput{
  const n={...prev};const bm=q.match(/预算\s*(?:提高到|改为|变成|调整为)?\s*(\d+)/);if(bm)n.budget=parseInt(bm[1]);
  if(/增加|多加/.test(q)){const dm=q.match(/(\d)\s*天/);if(dm)n.days=prev.days+parseInt(dm[1]);else n.days=prev.days+1;}
  if(/减少|缩短/.test(q)){const dm=q.match(/(\d)\s*天/);if(dm)n.days=Math.max(1,prev.days-parseInt(dm[1]));}
  if(/不要飞机|排除飞机|不坐飞机/.test(q))n.timePreference='early';if(/早班|早上/.test(q))n.timePreference='early';if(/下午/.test(q))n.timePreference='afternoon';
  if(/迪士尼/.test(q))n.days=Math.max(n.days,3);return n;
}

const TRIP_TYPES:Record<string,{label:string;icon:string;color:string}>={business:{label:'商务出差',icon:'💼',color:'bg-gray-800'},leisure:{label:'休闲度假',icon:'🏖️',color:'bg-sky-500'},budget:{label:'预算出行',icon:'💰',color:'bg-emerald-500'},exam:{label:'考试出行',icon:'📚',color:'bg-violet-500'}};
const QUICK_EXAMPLES=[{icon:'💼',label:'上海出差',prompt:'我明天下午去上海出差两天，预算5000'},{icon:'🌸',label:'杭州周末游',prompt:'周末去杭州玩两天，预算3000，想坐高铁'},{icon:'🏖️',label:'三亚度假',prompt:'去三亚度假三天，预算8000，希望舒适一些'},{icon:'📚',label:'南京考试',prompt:'下周去南京考试，当天往返，预算1000'}];

// ═══════════════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════════════

export default function PlannerPage(){return(<Suspense fallback={<div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><div className="w-6 h-6 border-2 border-ai-200 border-t-ai-600 rounded-full animate-spin"/></div>}><PlannerContent/></Suspense>);}

function PlannerContent(){
  const router=useRouter();const sp=useSearchParams();
  const[msgs,setMsgs]=useState<ChatMessage[]>([]);const[input,setInput]=useState('');const[planning,setPlanning]=useState(false);
  const[curInput,setCurInput]=useState<PlannerInput>({origin:'北京',destination:'上海',budget:3000,days:2,timePreference:'flexible'});
  const endRef=useRef<HTMLDivElement>(null);const initRef=useRef(false);
  const scroll=()=>{setTimeout(()=>endRef.current?.scrollIntoView({behavior:'smooth'}),100);};
  useEffect(()=>{if(initRef.current)return;initRef.current=true;const q=sp.get('q');if(q){setInput(q);setTimeout(()=>doSend(q),300);}else{setMsgs([{id:'g',role:'assistant',timestamp:Date.now(),type:'text',content:'你好！我是 AI 行程规划师 ✨\n\n用自然语言告诉我你的出行需求，我会为你智能规划最优行程。\n\n你可以试试：'}]);}},[]);
  useEffect(scroll,[msgs,planning]);

  const doSend=(text?:string)=>{
    const msg=(text||input).trim();if(!msg||planning)return;setInput('');
    const uMsg:ChatMessage={id:`u-${Date.now()}`,role:'user',content:msg,timestamp:Date.now(),type:'text'};
    const isMod=msgs.some(m=>m.type==='result')&&/预算|天|不要|改成|改为|增加|减少|迪士尼|飞机/.test(msg);
    if(isMod){const ni=applyDelta(curInput,msg);setCurInput(ni);setMsgs(p=>[...p,uMsg]);doPlan(ni,true);}
    else{const intent=parseIntent(msg);const ni:PlannerInput={origin:intent.origin,destination:intent.destination,budget:intent.budget,days:intent.days,timePreference:intent.timePreference as PlannerInput['timePreference']};setCurInput(ni);setMsgs(p=>[...p,uMsg]);showIntent(intent,ni);}
  };

  const showIntent=(intent:ParsedIntent,ni:PlannerInput)=>{
    setMsgs(p=>[...p,{id:`i-${Date.now()}`,role:'assistant',timestamp:Date.now(),type:'intent',intent,content:''}]);
    setTimeout(()=>doPlan(ni,false),1000);
  };

  const doPlan=(ni:PlannerInput,isUp:boolean)=>{
    setPlanning(true);
    const steps:PlanningStep[]=[
      {id:'need',label:'识别出行需求',icon:'🧠',detail:`${ni.origin}→${ni.destination}，${ni.days}天`,status:'pending'},
      {id:'transport',label:'分析交通方案',icon:'🚄',detail:'搜索最优车次/航班',status:'pending'},
      {id:'budget',label:'分析预算分配',icon:'💰',detail:`预算 ¥${ni.budget.toLocaleString()}`,status:'pending'},
      {id:'hotel',label:'匹配住宿推荐',icon:'🏨',detail:'根据预算推荐酒店',status:'pending'},
      {id:'plan',label:'生成完整行程',icon:'📋',detail:'规划每日行程安排',status:'pending'},
    ];
    setMsgs(p=>[...p,{id:`p-${Date.now()}`,role:'assistant',timestamp:Date.now(),type:'planning',steps,content:''}]);
    let i=0;const iv=setInterval(()=>{
      if(i<steps.length){setMsgs(p=>{const l=p[p.length-1];if(l.type!=='planning')return p;const u=[...p];u[u.length-1]={...l,steps:l.steps!.map((s,idx)=>({...s,status:idx<i?'done':idx===i?'running':'pending'}))};return u;});i++;}
      else{clearInterval(iv);const result=runPlanner(ni);
        const summary=isUp?`已更新行程方案！${ni.origin}→${ni.destination}，${ni.days}天，预算¥${ni.budget.toLocaleString()}`:`为你规划了 ${ni.origin}→${ni.destination} 的 ${ni.days} 天行程，预计花费 ¥${result.totalCost.toLocaleString()}，${result.budgetLeft>=0?'剩余':'超支'} ¥${Math.abs(result.budgetLeft).toLocaleString()}`;
        setMsgs(p=>[...p.slice(0,-1),{id:`r-${Date.now()}`,role:'assistant',timestamp:Date.now(),type:'result',content:summary,result}]);setPlanning(false);}
    },500);
  };

  const handleKey=(e:React.KeyboardEvent)=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();doSend();}};

  return(
    <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={()=>router.push('/')} className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
            返回
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-ai-500 to-primary-500 flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            </div>
            <span className="text-sm font-bold">AI 行程规划师</span>
          </div>
          <div className="w-16"/>
        </div>
      </header>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto"><div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {msgs.map(m=><ChatMsg key={m.id} msg={m} curInput={curInput}/>)}
        <div ref={endRef}/>
      </div></div>

      {/* Bottom */}
      <div className="sticky bottom-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a] to-transparent pt-6 pb-4">
        <div className="max-w-3xl mx-auto px-4">
          {msgs.length<=1&&(<div className="flex flex-wrap gap-2 mb-3">
            {QUICK_EXAMPLES.map(ex=>(<button key={ex.label} onClick={()=>doSend(ex.prompt)} className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white/50 hover:bg-white/10 hover:text-white/80 transition-all"><span>{ex.icon}</span><span className="font-medium">{ex.label}</span></button>))}
          </div>)}
          <div className="flex items-end gap-2 bg-white/5 rounded-2xl border border-white/10 focus-within:border-ai-500/50 transition-all p-2">
            <textarea ref={useRef<HTMLTextAreaElement>(null)} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey} placeholder="描述你的出行需求..." rows={1} className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-white/30 resize-none focus:outline-none max-h-32" style={{minHeight:'40px'}}/>
            <button onClick={()=>doSend()} disabled={!input.trim()||planning} className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-r from-ai-600 to-primary-600 text-white flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:from-ai-500 hover:to-primary-500 transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// Chat Message
// ═══════════════════════════════════════════════════════════════════════

function ChatMsg({msg,curInput}:{msg:ChatMessage;curInput:PlannerInput}){
  if(msg.role==='user')return(<div className="flex justify-end animate-fade-in-up"><div className="max-w-[80%] px-4 py-3 rounded-2xl rounded-br-md bg-gradient-to-r from-ai-600 to-primary-600 text-white text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</div></div>);
  return(<div className="flex gap-3 animate-fade-in-up">
    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-ai-500 to-primary-500 flex items-center justify-center mt-0.5"><svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg></div>
    <div className="flex-1 min-w-0 space-y-3">
      {msg.type==='text'&&<div className="text-sm text-white/70 leading-relaxed whitespace-pre-wrap">{msg.content}</div>}
      {msg.type==='intent'&&msg.intent&&<IntentCard intent={msg.intent}/>}
      {msg.type==='planning'&&msg.steps&&<PlanningProgress steps={msg.steps}/>}
      {msg.type==='result'&&msg.result&&<><div className="text-sm text-white/70 leading-relaxed">{msg.content}</div><ResultView result={msg.result} input={curInput}/></>}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// Part 1: Planning Progress
// ═══════════════════════════════════════════════════════════════════════

function PlanningProgress({steps}:{steps:PlanningStep[]}){
  return(<div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5 space-y-3">
    <div className="flex items-center gap-2 mb-2"><div className="w-4 h-4 border-2 border-ai-400 border-t-transparent rounded-full animate-spin"/><span className="text-xs font-semibold text-white/60">AI 正在思考...</span></div>
    {steps.map(s=>(<div key={s.id} className="flex items-start gap-3">
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${s.status==='done'?'bg-emerald-500':s.status==='running'?'bg-ai-500':'bg-white/10'}`}>
        {s.status==='done'?<svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>:s.status==='running'?<div className="w-2 h-2 rounded-full bg-white animate-pulse"/>:<span className="text-[10px] text-white/30">○</span>}
      </div>
      <div className="flex-1"><div className={`text-sm ${s.status==='done'?'text-white/80':s.status==='running'?'text-ai-400 font-medium':'text-white/30'}`}>{s.icon} {s.label}</div><div className="text-[11px] text-white/30 mt-0.5">{s.detail}</div></div>
    </div>))}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// Part 2: Intent Card (Enhanced)
// ═══════════════════════════════════════════════════════════════════════

function IntentCard({intent}:{intent:ParsedIntent}){
  const tt=TRIP_TYPES[intent.tripType]||TRIP_TYPES.leisure;
  const fields=[
    {icon:'📍',label:'出发地',value:intent.origin},{icon:'📍',label:'目的地',value:intent.destination},
    {icon:'📅',label:'出发时间',value:intent.departTime},{icon:'🕒',label:'行程天数',value:`${intent.days}天`},
    {icon:'💰',label:'预算',value:`¥${intent.budget.toLocaleString()}`},{icon:'🎯',label:'出行类型',value:tt.label},
  ];
  return(<div className="bg-ai-500/[0.08] rounded-2xl border border-ai-500/20 p-5 animate-fade-in-up">
    <div className="flex items-center gap-2 mb-4"><svg className="w-4 h-4 text-ai-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg><span className="text-xs font-semibold text-ai-400">AI 已理解你的需求</span>
      <span className="ml-auto text-[10px] px-2.5 py-1 rounded-full bg-ai-500/20 text-ai-300 font-medium">{Math.round(intent.confidence*100)}% 匹配成功</span></div>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
      {fields.map(f=>(<div key={f.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06]"><span className="text-base">{f.icon}</span><div><div className="text-[10px] text-white/30">{f.label}</div><div className="text-sm font-semibold text-white/90">{f.value}</div></div></div>))}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// Part 3-6: Result View
// ═══════════════════════════════════════════════════════════════════════

function ResultView({result,input}:{result:PlanResult;input:PlannerInput}){
  const[activeTab,setActiveTab]=useState<'recommended'|'fastest'|'cheapest'>('recommended');
  const[expanded,setExpanded]=useState(false);
  const display=activeTab==='recommended'?result.recommended:activeTab==='fastest'?result.fastest:result.cheapest;
  const info=generateAIRecommendInfo(display);

  return(<div className="space-y-4">
    {/* Part 6: Comparison Tabs */}
    <div className="flex gap-2">
      {[{key:'recommended' as const,label:'🏆 AI推荐',ticket:result.recommended},{key:'fastest' as const,label:'⚡ 最快',ticket:result.fastest},{key:'cheapest' as const,label:'💰 最省钱',ticket:result.cheapest}].map(t=>(
        <button key={t.key} onClick={()=>setActiveTab(t.key)} className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${activeTab===t.key?'bg-ai-500/20 border border-ai-500/30 text-ai-300':'bg-white/[0.03] border border-white/[0.06] text-white/40 hover:text-white/60'}`}>
          <div>{t.label}</div><div className="text-[10px] mt-0.5 opacity-60">¥{t.ticket.lowestPrice} · {t.ticket.duration}</div>
        </button>))}
    </div>

    {/* Transport Card with Reasons */}
    <div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-ai-500 to-primary-500"/>
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">{display.typeIcon}</span>
          <div className="flex-1"><div className="flex items-center gap-2"><span className="text-base font-bold">{display.trainNo}</span><span className="text-[10px] text-white/30">{display.typeLabel}</span><span className="text-[10px] text-white/30">{display.carrier}</span></div></div>
          <div className="text-right"><div className="text-xl font-bold text-primary-400">¥{display.lowestPrice}</div><div className="text-[10px] text-white/30">AI {display.score}</div></div>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-center min-w-[60px]"><div className="text-lg font-bold tabular-nums">{display.departureTime}</div><div className="text-[10px] text-white/30">{display.originStation}</div></div>
          <div className="flex-1 flex flex-col items-center gap-1"><div className="text-xs text-primary-400">{display.duration}</div><div className="w-full h-px bg-white/10 relative"><div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/30"/><div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary-500"/></div><div className="text-[10px] text-white/30">{display.punctuality}% 准点</div></div>
          <div className="text-center min-w-[60px]"><div className="text-lg font-bold tabular-nums">{display.arrivalTime}</div><div className="text-[10px] text-white/30">{display.destinationStation}</div></div>
        </div>
        {/* Part 3: Reasons */}
        <div className="flex flex-wrap gap-1.5">
          {info.tags.slice(0,5).map((t,i)=>(<span key={i} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium ${t.highlight?'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20':'bg-white/[0.04] text-white/50 border border-white/[0.06]'}`}><span>{t.icon}</span>{t.label}</span>))}
        </div>
      </div>
    </div>

    {/* Part 4: Budget Analysis */}
    <BudgetCard result={result} input={input}/>

    {/* Part 5: Timeline Itinerary */}
    <TimelineCard itinerary={result.itinerary}/>

    {/* Tips */}
    {result.tips.length>0&&(<div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
      <h4 className="text-sm font-bold mb-3 flex items-center gap-2">💡 AI 建议</h4>
      <div className="space-y-2">{result.tips.map((t,i)=>(<div key={i} className="flex items-start gap-2 text-xs text-white/50"><span className="w-4 h-4 rounded-full bg-ai-500/20 text-ai-400 flex items-center justify-center flex-shrink-0 text-[10px] font-bold mt-0.5">{i+1}</span>{t}</div>))}</div>
    </div>)}

    {/* Part 8: Quick Actions */}
    <div className="flex gap-2">
      {[{icon:'❤️',label:'收藏'},{icon:'📄',label:'导出'},{icon:'🔗',label:'分享'},{icon:'📅',label:'日历'}].map(a=>(
        <button key={a.label} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs text-white/40 hover:text-white/70 hover:bg-white/[0.06] transition-all"><span>{a.icon}</span>{a.label}</button>))}
    </div>

    {/* Expand toggle */}
    <button onClick={()=>setExpanded(!expanded)} className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-white/30 hover:text-white/50 transition-colors">
      {expanded?'收起详情':'查看完整方案'}<svg className={`w-3.5 h-3.5 transition-transform ${expanded?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
    </button>

    {expanded&&<ExpandedDetails result={result} input={input}/>}
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// Part 4: Budget Card
// ═══════════════════════════════════════════════════════════════════════

function BudgetCard({result,input}:{result:PlanResult;input:PlannerInput}){
  const items=[
    {icon:'🚄',label:'交通',value:result.transport,color:'#3b82f6',pct:Math.round(result.transport/input.budget*100)},
    {icon:'🏨',label:'住宿',value:result.hotelPerNight*result.hotelNights,color:'#8b5cf6',pct:Math.round(result.hotelPerNight*result.hotelNights/input.budget*100)},
    {icon:'🍜',label:'餐饮',value:result.meals,color:'#f59e0b',pct:Math.round(result.meals/input.budget*100)},
    {icon:'🎫',label:'景点',value:result.attractions,color:'#ec4899',pct:Math.round(result.attractions/input.budget*100)},
    {icon:result.budgetLeft>=0?'✅':'⚠️',label:'剩余',value:Math.abs(result.budgetLeft),color:result.budgetLeft>=0?'#10b981':'#ef4444',pct:Math.max(0,Math.round(result.budgetLeft/input.budget*100))},
  ];
  return(<div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
    <div className="flex items-center justify-between mb-4"><h4 className="text-sm font-bold flex items-center gap-2">💰 预算分析</h4><span className="text-xs text-white/30">总预算 ¥{input.budget.toLocaleString()}</span></div>
    <div className="space-y-3">
      {items.map(it=>(<div key={it.label} className="flex items-center gap-3">
        <span className="text-base w-6 text-center">{it.icon}</span>
        <span className="text-xs text-white/50 w-10">{it.label}</span>
        <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-700" style={{width:`${Math.min(100,it.pct)}%`,backgroundColor:it.color}}/></div>
        <span className="text-xs font-semibold text-white/70 w-16 text-right tabular-nums">¥{it.value.toLocaleString()}</span>
        <span className="text-[10px] text-white/30 w-10 text-right">{it.pct}%</span>
      </div>))}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// Part 5: Timeline
// ═══════════════════════════════════════════════════════════════════════

function TimelineCard({itinerary}:{itinerary:DayPlan[]}){
  return(<div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
    <h4 className="text-sm font-bold mb-5 flex items-center gap-2">📋 行程安排</h4>
    <div className="space-y-8">
      {itinerary.map(day=>(<div key={day.day}>
        <div className="flex items-center gap-2.5 mb-4"><span className="text-lg">{day.icon}</span><span className="text-sm font-bold">Day {day.day}</span><span className="text-xs text-white/40">{day.title}</span></div>
        <div className="relative pl-6 border-l-2 border-white/[0.06] ml-2 space-y-0">
          {day.events.map((ev,i)=>(<div key={i} className="relative flex items-start gap-3 pb-5 last:pb-0">
            <div className="absolute -left-[25px] top-1 w-3 h-3 rounded-full bg-ai-500 border-2 border-[#0a0a0a]"/>
            <div className="text-[11px] text-white/30 w-12 flex-shrink-0 pt-0.5 tabular-nums">{ev.time}</div>
            <div className="flex-1"><div className="flex items-center gap-2"><span className="text-sm">{ev.icon}</span><span className="text-sm font-medium text-white/80">{ev.title}</span></div>{ev.detail&&<div className="text-[11px] text-white/30 mt-0.5 ml-6">{ev.detail}</div>}</div>
          </div>))}
        </div>
      </div>))}
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// Part 9: Static Map
// ═══════════════════════════════════════════════════════════════════════

function MapCard({origin,destination}:{origin:string;destination:string}){
  const[mapType,setMapType]=useState<'route'|'attractions'|'transport'>('route');
  return(<div className="bg-white/[0.03] rounded-2xl border border-white/[0.06] p-5">
    <div className="flex items-center justify-between mb-4"><h4 className="text-sm font-bold flex items-center gap-2">🗺️ 地图概览</h4>
      <div className="flex gap-1">{([{k:'route',l:'路线'},{k:'attractions',l:'景点'},{k:'transport',l:'交通'}] as const).map(t=>(<button key={t.k} onClick={()=>setMapType(t.k)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all ${mapType===t.k?'bg-ai-500/20 text-ai-300':'text-white/30 hover:text-white/50'}`}>{t.l}</button>))}</div>
    </div>
    <div className="h-48 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-center">
      <div className="text-center"><div className="text-3xl mb-2">🗺️</div><div className="text-xs text-white/30">{origin} → {destination}</div><div className="text-[10px] text-white/20 mt-1">地图功能开发中</div></div>
    </div>
  </div>);
}

// ═══════════════════════════════════════════════════════════════════════
// Expanded Details
// ═══════════════════════════════════════════════════════════════════════

function ExpandedDetails({result,input}:{result:PlanResult;input:PlannerInput}){
  return(<div className="space-y-4 animate-fade-in-up">
    <MapCard origin={input.origin} destination={input.destination}/>
  </div>);
}
