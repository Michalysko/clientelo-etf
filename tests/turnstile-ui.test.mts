/* eslint-disable @typescript-eslint/no-explicit-any -- Minimal isolated React hook harness; no DOM/test dependency or network. */
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as analyticsModule from '../src/lib/analytics.ts';
import { validEmail } from '../src/lib/email/validation.ts';

function harness(measured = false) {
  const measurement = analyticsModule.createAnalyticsController();
  const events: analyticsModule.AnalyticsPayload[] = [];
  if (measured) { measurement.setConsent(true, true); measurement.enter({ pathname: "/", href: "https://etf-kompas-zeta.vercel.app/?utm_content=ad_a", referrer: "" }); measurement.ready(payload => { events.push(payload); }); measurement.track({name:"form_view",material:"report"}); measurement.track({name:"form_view",material:"guide"}); }
  let current: any;
  let context = {ready:false,failed:false};
  const instances: any[] = [], removed: string[] = [], resets: string[] = [], requests: any[] = [];
  let responseStatus = 503;
  let now = Date.now();
  let responseGate: Promise<void> = Promise.resolve();
  let networkFailure = false;
  let acceptedBody = true;
  let responseCode: string | undefined;
  const api = {
    render: (_element: unknown, options: any) => { const id=`widget-${instances.length}`; instances.push({id,options}); return id; },
    remove: (id: string) => removed.push(id), reset: (id: string) => resets.push(id),
  };
  const react = {
    createContext: () => ({Provider:'provider'}), useContext: () => context,
    useState: (initial: any) => {const owner=current,index=owner.index++; if (!(index in owner.values)) owner.values[index]=initial;
      return [owner.values[index],(value: any)=>{owner.values[index]=value;}];},
    useRef: (initial: any) => {const owner=current,index=owner.index++; return owner.values[index]??(owner.values[index]={current:initial});},
    useEffect: (effect: any,deps: any[]) => {const owner=current,index=owner.index++; const previous=owner.values[index];
      if (!previous || deps.some((v,i)=>v!==previous.deps[i])) owner.effects.push(()=>{previous?.cleanup?.();owner.values[index]={deps,cleanup:effect()};});},
  };
  const jsx = (type: any,props: any) => ({type,props});
  function load(file: string,extra: Record<string,unknown>={}) {
    const code=ts.transpileModule(readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
    const exports: any={};
    vm.runInNewContext(code,{exports,require:(name: string)=>{
      if (name==='react') return react;
      if (name==='react/jsx-runtime') return {jsx,jsxs:jsx};
      if (name==='next/script') return {default:'script'};
      if (name==='next/link') return {default:'a'};
      if (name in extra) return extra[name];
      throw new Error('Unexpected dependency');
    },window:{turnstile:api,crypto:{randomUUID}},Date:{now:()=>now},AbortSignal,fetch:async(url: string,init: any)=>{
      requests.push({url,body:JSON.parse(init.body)});
      await responseGate;
      if (networkFailure) throw new Error('synthetic network failure');
      return {status:responseStatus,json:async()=>({status:responseStatus===202 && acceptedBody?'accepted':'error',...(responseCode?{code:responseCode}:{})})};
    }});
    return exports;
  }
  const provider=load('../src/components/turnstile-provider.tsx');
  const form=load('../src/components/email-form.tsx',{'./turnstile-provider':provider,'@/lib/email/validation':{validEmail},'@/lib/analytics':{...analyticsModule,trackAnalytics:(event:any,key?:string)=>measurement.track(event,key),beginFormAttempt:(kind:any)=>measurement.startAttempt(kind),completeFormAttempt:(attempt:any,error:any)=>measurement.finishAttempt(attempt,error),observeForm:()=>()=>{}} });
  const owner=()=>({values:[],index:0,effects:[],tree:null as any});
  function render(state: any,component: any,props: any) {
    current=state;state.index=0;state.effects=[];state.tree=component(props);
    nodes(state.tree).forEach(n=>{if(n.props.ref && !n.props.ref.current)n.props.ref.current={value:n.props.name==='website'?'':'unit@example.com',focus(){}};});
    state.effects.forEach((effect: any)=>effect()); return state.tree;
  }
  function nodes(tree: any): any[] {return !tree || typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];}
  return {owner,render,nodes,form:form.EmailForm,provider:provider.TurnstileProvider,instances,removed,resets,requests,events,measurement,
    code:(value:string|undefined)=>{responseCode=value;},advance:(milliseconds:number)=>{now+=milliseconds;},context:(value: typeof context)=>{context=value;},status:(value:number)=>{responseStatus=value;},
    gate:(value:Promise<void>)=>{responseGate=value;},networkFailure:(value=true)=>{networkFailure=value;},acceptedBody:(value:boolean)=>{acceptedBody=value;}};
}
const delivery={enabled:true,siteKey:'unit-only'};
const scenario={firstTicker:'SPY',secondTicker:'SPYM',monthlyContribution:5000,years:20,grossAnnualReturnPercent:7,initialInvestment:0};
const props=(kind:'report'|'guide')=>({id:kind,kind,buttonText:kind,delivery,...(kind==='report'?{scenario}:{})});

test('analytics follows actual form responses: accepted only on 202, retries distinct, no data leakage',async()=>{
  for(const kind of ['report','guide'] as const) {
    const h=harness(true),owner=h.owner();h.context({ready:true,failed:false});
    const render=()=>h.render(owner,h.form,props(kind));
    render();h.instances[0].options.callback('unit-token');render();
    const form=()=>h.nodes(owner.tree).find(n=>n.type==='form');
    form().props.onFocusCapture();form().props.onPointerDownCapture();
    for(const status of [400,403,429,503,202]) {
      h.instances[0].options.callback('fresh-token');render();h.status(status);
      await form().props.onSubmit({preventDefault(){}});render();
    }
    const accepted=h.events.filter(e=>e.name==='material_accepted');
    assert.equal(accepted.length,1);assert.equal(accepted[0].data?.material,kind);
    assert.equal(h.events.filter(e=>e.name==='form_start').length,1);
    assert.equal(h.events.filter(e=>e.name==='form_submit').length,5);
    assert.equal(h.events.filter(e=>e.name==='form_error').length,4);
    assert.ok(!JSON.stringify(h.events).includes('unit@example.com'));
    assert.ok(!JSON.stringify(h.events).includes('5000'));
    assert.ok(!JSON.stringify(h.events).includes('unit-token'));
  }
});

test('analytics network failure cannot change accepted form state; pre-consent request is not backfilled',async()=>{
  for(const measured of [false,true]) {
    const h=harness(measured),owner=h.owner();h.context({ready:true,failed:false});h.status(202);
    if(measured) h.measurement.ready(()=>{throw new Error('mock analytics outage');});
    h.render(owner,h.form,props('report'));h.instances[0].options.callback('unit-token');
    h.render(owner,h.form,props('report'));
    await h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
    h.render(owner,h.form,props('report'));
    assert.ok(JSON.stringify(owner.tree).includes('přijala'));
    if(!measured) assert.equal(h.events.length,0);
  }
});

test('202 with unexpected body is not a conversion, and granting during pending request does not backfill',async()=>{
  const h=harness(true),owner=h.owner();h.context({ready:true,failed:false});h.status(202);h.acceptedBody(false);
  const render=()=>h.render(owner,h.form,props('guide'));render();h.instances[0].options.callback('token');render();
  await h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(h.events.filter(e=>e.name==='material_accepted').length,0);
  assert.equal(h.events.filter(e=>e.name==='form_error').length,1);
  const delayed=harness(),other=delayed.owner();delayed.context({ready:true,failed:false});delayed.status(202);
  let release!:()=>void;delayed.gate(new Promise<void>(resolve=>{release=resolve;}));
  delayed.render(other,delayed.form,props('report'));delayed.instances[0].options.callback('token');delayed.render(other,delayed.form,props('report'));
  const pending=delayed.nodes(other.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
  delayed.measurement.setConsent(true,true);delayed.measurement.enter({pathname:'/',href:'https://example.com',referrer:''});delayed.measurement.ready(p=>{delayed.events.push(p);});
  release();await pending;
  assert.equal(delayed.events.filter(e=>e.name==='material_accepted').length,0);
});

test('pending POST from ad_a never completes as an ad_b conversion after SPA navigation',async()=>{
  const h=harness(true),owner=h.owner();h.context({ready:true,failed:false});h.status(202);
  let release!:()=>void;h.gate(new Promise<void>(resolve=>{release=resolve;}));
  h.render(owner,h.form,props('report'));h.instances[0].options.callback('token');h.render(owner,h.form,props('report'));
  const pending=h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
  assert.equal(h.requests.length,1);
  h.measurement.enter({pathname:'/ochrana-osobnich-udaju',href:'https://example.com/ochrana-osobnich-udaju',referrer:''});
  h.measurement.enter({pathname:'/',href:'https://example.com/?utm_content=ad_b',referrer:''});
  h.measurement.track({name:'form_view',material:'report'});
  release();await pending;
  assert.equal(h.events.find(e=>e.name==='form_submit')?.data?.ad_variant,'ad_a');
  assert.equal(h.events.filter(e=>e.name==='material_accepted').length,0);
});

test('single script owner broadcasts readiness and failure to both form consumers',()=>{
  const h=harness(),p=h.owner();
  let tree=h.render(p,h.provider,{enabled:true,children:[]});
  const script=h.nodes(tree).filter(n=>n.type==='script'); assert.equal(script.length,1);
  assert.equal(tree.props.value.ready,false);
  script[0].props.onReady(); tree=h.render(p,h.provider,{enabled:true,children:[]});
  assert.equal(tree.props.value.ready,true);
  script[0].props.onError();tree=h.render(p,h.provider,{enabled:true,children:[]});assert.equal(tree.props.value.failed,true);
  assert.equal(tree.props.value.ready,false);
  assert.equal(h.nodes(h.render(p,h.provider,{enabled:false,children:[]})).filter(n=>n.type==='script').length,0);
});

test('empty and invalid emails never reach fetch; both forms expose accessible feedback',async()=>{
  for (const kind of ['report','guide'] as const) {
    const h=harness(),owner=h.owner();h.context({ready:true,failed:false});
    const render=()=>h.render(owner,h.form,props(kind));render();h.instances[0].options.callback('unit-token');
    for (const address of ['', 'invalid', 'a@b', 'a..b@example.com']) {
      const tree=render(),input=h.nodes(tree).find(n=>n.props.type==='email');input.props.ref.current.value=address;
      await tree.props.onSubmit({preventDefault(){}});
      const next=render();assert.equal(h.requests.length,0);
      assert.equal(h.nodes(next).find(n=>n.props.type==='email').props['aria-invalid'],true);
      const feedback=h.nodes(next).find(n=>n.props.id===`${kind}-feedback`);
      assert.equal(feedback.props.role,'status');assert.match(feedback.props.children,/platnou/);
      assert.ok(input.props['aria-describedby'].includes(`${kind}-feedback`));
    }
  }
});

test('both forms explain the one-off demo purpose and link to the privacy page without a consent checkbox',()=>{
  for (const kind of ['report','guide'] as const) {
    const h=harness(),owner=h.owner(),tree=h.render(owner,h.form,props(kind));
    const privacy=h.nodes(tree).find(n=>n.props.id===`${kind}-privacy`);
    const text=h.nodes(privacy).flatMap(n=>Array.isArray(n.props.children)?n.props.children:[n.props.children]).filter(c=>typeof c==='string').join(' ');
    for (const phrase of ['nekomerčním demu','jednorázové','Vlastní databázi kontaktů nevedeme','nepřihlašujeme']) assert.ok(text.includes(phrase));
    assert.ok(h.nodes(privacy).some(n=>n.props.href==='/ochrana-osobnich-udaju'));
    assert.equal(h.nodes(tree).filter(n=>n.props.type==='checkbox').length,0);
    assert.equal(h.requests.length,0);
  }
});

test('double click sends once; pending and all failure paths never claim success',async()=>{
  for (const kind of ['report','guide'] as const) {
    const h=harness(),owner=h.owner();h.context({ready:true,failed:false});
    const render=()=>h.render(owner,h.form,props(kind));render();h.instances[0].options.callback('unit-token');
    let release!:()=>void;h.gate(new Promise<void>(resolve=>{release=resolve;}));
    const tree=render();const first=tree.props.onSubmit({preventDefault(){}});await tree.props.onSubmit({preventDefault(){}});
    assert.equal(h.requests.length,1);
    const pending=render();assert.equal(pending.props['aria-busy'],true);
    assert.equal(h.nodes(pending).find(n=>n.type==='button').props.disabled,true);
    release();await first;
    for (const status of [400,403,429,500,503]) {
      h.status(status);h.instances[0].options.callback('fresh-token');
      await render().props.onSubmit({preventDefault(){}});
      const failed=render();const feedback=h.nodes(failed).find(n=>n.props.id===`${kind}-feedback`);
      assert.ok(!feedback.props.children.includes('přijala'));
      assert.equal(h.nodes(failed).find(n=>n.type==='button').props.disabled,true);
    }
    h.networkFailure();h.instances[0].options.callback('fresh-token');
    await render().props.onSubmit({preventDefault(){}});
    assert.ok(!h.nodes(render()).find(n=>n.props.id===`${kind}-feedback`).props.children.includes('přijala'));
    assert.equal(h.resets.length,h.requests.length);
  }
});

test('two mounted forms initialize independently after shared readiness; errors and retries reset only their own widget',async()=>{
  const h=harness(),a=h.owner(),b=h.owner();
  const renderA=()=>h.render(a,h.form,props('report')),renderB=()=>h.render(b,h.form,props('guide'));
  const button=(tree:any)=>h.nodes(tree).find(n=>n.type==='button');
  const submit=(tree:any)=>tree.props.onSubmit({preventDefault(){}});
  renderA();renderB(); assert.equal(h.instances.length,0);
  h.context({ready:true,failed:false});renderA();renderB();
  assert.equal(h.instances.length,2); assert.notEqual(h.instances[0].id,h.instances[1].id);
  assert.deepEqual(h.instances.map(i=>i.options.action),['report','guide']);
  assert.equal(button(renderA()).props.disabled,true);assert.equal(button(renderB()).props.disabled,true);
  h.instances[0].options.callback('report-token');
  assert.equal(button(renderA()).props.disabled,false);assert.equal(button(renderB()).props.disabled,true);
  h.instances[1].options.callback('guide-token');assert.equal(button(renderB()).props.disabled,false);
  // Synthetic 503: no actual endpoint or provider is contacted.
  await submit(renderB());assert.deepEqual(h.resets,['widget-1']);
  assert.equal(button(renderB()).props.disabled,true);assert.equal(button(renderA()).props.disabled,false);
  h.instances[1].options.callback('guide-retry-token');h.status(202);await submit(renderB());
  assert.deepEqual(h.resets,['widget-1','widget-1']);
  assert.equal(h.requests[1].body.turnstileToken,'guide-retry-token');assert.equal(h.requests[1].url,'/api/materials/guide');
  assert.equal(h.requests[1].body.website,'');
  h.instances[1].options['expired-callback']();assert.equal(button(renderB()).props.disabled,true);
  h.instances[0].options['error-callback']();assert.equal(button(renderA()).props.disabled,true);
  h.instances[0].options.callback('report-retry-token');await submit(renderA());
  assert.equal(h.requests[2].url,'/api/materials/report');assert.equal(h.requests[2].body.turnstileToken,'report-retry-token');
  // Effect cleanup on configuration change removes each widget separately.
  h.render(a,h.form,{...props('report'),delivery:{enabled:false,siteKey:''}});
  assert.deepEqual(h.removed,['widget-0']);
  h.render(b,h.form,{...props('guide'),delivery:{enabled:false,siteKey:''}});
  assert.deepEqual(h.removed,['widget-0','widget-1']);
});


test('logical request survives timeout with frozen recipient/scenario; success enables a new UUID',async()=>{
  for(const kind of ['report','guide'] as const){
    const h=harness(true),owner=h.owner();h.context({ready:true,failed:false});
    let currentProps=props(kind);const render=()=>h.render(owner,h.form,currentProps);
    const submit=()=>h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
    render();h.instances[0].options.callback('first-token');render();h.networkFailure();
    await submit();render();
    const first=h.requests[0].body;assert.match(first.requestId,/^[0-9a-f-]{36}$/);
    assert.ok(JSON.stringify(owner.tree).includes('Zopakovat stejnou žádost'));
    assert.equal(h.nodes(owner.tree).find(n=>n.props.type==='email').props.disabled,true);
    currentProps={...props(kind),...(kind==='report'?{scenario:{...scenario,monthlyContribution:10000}}:{})};
    h.nodes(owner.tree).find(n=>n.props.type==='email').props.ref.current.value='changed@example.com';
    h.networkFailure(false);h.status(202);h.instances[0].options.callback('new-token');render();await submit();render();
    const retry=h.requests[1].body;assert.equal(retry.requestId,first.requestId);assert.equal(retry.email,first.email);assert.deepEqual(retry.scenario,first.scenario);assert.notEqual(retry.turnstileToken,first.turnstileToken);
    h.instances[0].options.callback('third-token');render();await submit();render();
    assert.notEqual(h.requests[2].body.requestId,first.requestId);
    assert.equal(h.requests[2].body.email,'changed@example.com');
    assert.equal(h.events.filter(e=>e.name==='material_accepted').length,2);
    assert.ok(!JSON.stringify(h.events).includes(first.requestId));assert.ok(!JSON.stringify(h.events).includes('changed@example.com'));
  }
});


test('ambiguous request older than 23 hours never silently becomes a new send',async()=>{
  const h=harness(),owner=h.owner();h.context({ready:true,failed:false});
  const render=()=>h.render(owner,h.form,props('guide'));
  render();h.instances[0].options.callback('first-token');render();
  await h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
  h.advance(23*3600000);h.instances[0].options.callback('fresh-token');render();
  await h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});render();
  assert.equal(h.requests.length,1);assert.ok(JSON.stringify(owner.tree).includes('příliš stará'));
});


test('first validated rejection unlocks corrections and generates a fresh UUID from current inputs',async()=>{
  for(const kind of ['guide','report'] as const){
    const h=harness(true),owner=h.owner();h.context({ready:true,failed:false});h.status(400);h.code('input_rejected');
    let currentProps=props(kind);const render=()=>h.render(owner,h.form,currentProps);
    const submit=()=>h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
    render();h.instances[0].options.callback('first-token');render();await submit();render();
    assert.equal(h.nodes(owner.tree).find(n=>n.props.type==='email').props.disabled,false);
    assert.ok(!JSON.stringify(owner.tree).includes('Zopakovat stejnou žádost'));
    h.nodes(owner.tree).find(n=>n.props.type==='email').props.ref.current.value='corrected@example.com';
    currentProps={...props(kind),...(kind==='report'?{scenario:{...scenario,monthlyContribution:12000}}:{})};
    h.status(202);h.code(undefined);h.instances[0].options.callback('second-token');render();
    let release!:()=>void;h.gate(new Promise<void>(resolve=>{release=resolve;}));
    const pending=submit();await submit();assert.equal(h.requests.length,2);release();await pending;render();
    assert.notEqual(h.requests[0].body.requestId,h.requests[1].body.requestId);
    assert.equal(h.requests[1].body.email,'corrected@example.com');
    if(kind==='report')assert.equal(h.requests[1].body.scenario.monthlyContribution,12000);
    assert.equal(h.events.filter(e=>e.name==='material_accepted').length,1);
  }
});

test('a marked 400 after an uncertain result never drops the original identity or snapshot',async()=>{
  for(const failure of ['network','503','202-invalid'] as const){
    const h=harness(),owner=h.owner();h.context({ready:true,failed:false});
    let currentProps=props('report');const render=()=>h.render(owner,h.form,currentProps);const submit=()=>h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
    if(failure==='network')h.networkFailure();if(failure==='202-invalid'){h.status(202);h.acceptedBody(false);}
    render();h.instances[0].options.callback('first');render();await submit();render();
    h.nodes(owner.tree).find(n=>n.props.type==='email').props.ref.current.value='changed@example.com';
    currentProps={...props('report'),scenario:{...scenario,monthlyContribution:15000}};
    h.networkFailure(false);h.status(400);h.code('input_rejected');h.instances[0].options.callback('second');render();await submit();render();
    assert.equal(h.nodes(owner.tree).find(n=>n.props.type==='email').props.disabled,true);
    assert.equal(h.requests[0].body.requestId,h.requests[1].body.requestId);
    assert.equal(h.requests[1].body.email,h.requests[0].body.email);assert.deepEqual(h.requests[1].body.scenario,h.requests[0].body.scenario);
    h.instances[0].options.callback('third');render();await submit();
    assert.equal(h.requests[2].body.requestId,h.requests[0].body.requestId);
  }
});

test('an unmarked or malformed 400 is not proof of validation rejection',async()=>{
  for(const code of [undefined,'arbitrary','request_conflict']){
    const h=harness(),owner=h.owner();h.context({ready:true,failed:false});h.status(400);h.code(code);
    const render=()=>h.render(owner,h.form,props('guide'));render();h.instances[0].options.callback('first');render();
    await h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});render();
    assert.equal(h.nodes(owner.tree).find(n=>n.props.type==='email').props.disabled,true);
  }
});

test('concurrent request can be retried; permanent conflict is blocked without rotating identity',async()=>{
  for(const code of ['request_pending','request_conflict']){
    const h=harness(true),owner=h.owner();h.context({ready:true,failed:false});h.status(503);h.code(code);
    const render=()=>h.render(owner,h.form,props('guide'));const submit=()=>h.nodes(owner.tree).find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
    render();h.instances[0].options.callback('first');render();await submit();render();
    h.instances[0].options.callback('second');render();
    assert.equal(h.nodes(owner.tree).find(n=>n.type==='button').props.disabled,code==='request_conflict');
    await submit();assert.equal(h.requests.length,code==='request_conflict'?1:2);
    assert.equal(h.events.filter(e=>e.name==='material_accepted').length,0);
    if(code==='request_pending')assert.equal(h.requests[1].body.requestId,h.requests[0].body.requestId);
  }
});
