/* eslint-disable @typescript-eslint/no-explicit-any -- Minimal isolated React hook harness; no DOM/test dependency or network. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { validEmail } from '../src/lib/email/validation.ts';

function harness() {
  let current: any;
  let context = {ready:false,failed:false};
  const instances: any[] = [], removed: string[] = [], resets: string[] = [], requests: any[] = [];
  let responseStatus = 503;
  let responseGate: Promise<void> = Promise.resolve();
  let networkFailure = false;
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
      if (name in extra) return extra[name];
      throw new Error('Unexpected dependency');
    },window:{turnstile:api},AbortSignal,fetch:async(url: string,init: any)=>{
      requests.push({url,body:JSON.parse(init.body)});
      await responseGate;
      if (networkFailure) throw new Error('synthetic network failure');
      return {status:responseStatus,json:async()=>({status:responseStatus===202?'accepted':'error'})};
    }});
    return exports;
  }
  const provider=load('../src/components/turnstile-provider.tsx');
  const form=load('../src/components/email-form.tsx',{'./turnstile-provider':provider,'@/lib/email/validation':{validEmail}});
  const owner=()=>({values:[],index:0,effects:[],tree:null as any});
  function render(state: any,component: any,props: any) {
    current=state;state.index=0;state.effects=[];state.tree=component(props);
    nodes(state.tree).forEach(n=>{if(n.props.ref && !n.props.ref.current)n.props.ref.current={value:n.props.name==='website'?'':'unit@example.com',focus(){}};});
    state.effects.forEach((effect: any)=>effect()); return state.tree;
  }
  function nodes(tree: any): any[] {return !tree || typeof tree!=='object'?[]:Array.isArray(tree)?tree.flatMap(nodes):[tree,...nodes(tree.props?.children)];}
  return {owner,render,nodes,form:form.EmailForm,provider:provider.TurnstileProvider,instances,removed,resets,requests,
    context:(value: typeof context)=>{context=value;},status:(value:number)=>{responseStatus=value;},
    gate:(value:Promise<void>)=>{responseGate=value;},networkFailure:()=>{networkFailure=true;}};
}
const delivery={enabled:true,siteKey:'unit-only'};
const scenario={firstTicker:'SPY',secondTicker:'SPYM',monthlyContribution:5000,years:20,grossAnnualReturnPercent:7,initialInvestment:0};
const props=(kind:'report'|'guide')=>({id:kind,kind,buttonText:kind,delivery,...(kind==='report'?{scenario}:{})});

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
