import { api, saveUser, formatDate, formatNumber, element, feedback, logout } from './api.js';
import { requireUser, mountLayout } from './layout.js';
import { currentTheme, setTheme } from './theme.js';

const page = document.body.dataset.page;
let user;
let adminData = { materials: [], points: [], rewards: [] };

function confirmAction(text) {
  const dialog = document.querySelector('#confirmDialog');
  if (!dialog?.showModal) return Promise.resolve(window.confirm(text));
  document.querySelector('#confirmText').textContent = text;
  dialog.showModal();
  return new Promise((resolve) => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}

function roleName(role) { return role === 'administrador' ? 'administrador' : 'usuário comum'; }

function svgIcon(name, className = '') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
  if (className) svg.setAttribute('class', className);
  const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
  use.setAttribute('href', `assets/ui-icons.svg#${name}`); svg.append(use);
  return svg;
}

async function loadDashboard() {
  document.querySelector('#welcomeName').textContent = (user.nome || '').trim().split(/\s+/)[0] || '—';
  const errors = [];
  try {
    const { resumo } = await api('/reciclagens/resumo');
    document.querySelector('#dashPoints').textContent = formatNumber(resumo.pontos);
    document.querySelector('#dashCount').textContent = formatNumber(resumo.total_reciclagens);
    document.querySelector('#dashWeight').textContent = `${formatNumber(resumo.quilos_reciclados, 1)} kg`;
    document.querySelector('#emptyActivity').hidden = Number(resumo.total_reciclagens) > 0;
  } catch (error) {
    document.querySelector('#dashPoints').textContent = '—';
    document.querySelector('#dashCount').textContent = '—';
    document.querySelector('#dashWeight').textContent = '—';
    errors.push(`Não foi possível carregar os indicadores de reciclagem: ${error.message}`);
  }
  try {
    const { jornada } = await api('/jornada');
    setProgress(jornada, '#dashLevel', '#dashNext', null, '#dashProgress', '#dashProgressStart', '#dashProgressEnd', '#dashLevelIcon');
    const unlocked = (jornada.conquistas || []).filter((item) => item.desbloqueada_em).sort((a,b) => new Date(b.desbloqueada_em) - new Date(a.desbloqueada_em));
    const locked = (jornada.conquistas || []).filter((item) => !item.desbloqueada_em);
    const list = document.querySelector('#recentAchievements'); list.replaceChildren();
    [...unlocked, ...locked].slice(0, 3).forEach((item) => list.append(achievementCard(item, true)));
    if (!jornada.conquistas?.length) list.append(element('p', 'empty-state', 'As conquistas aparecerão aqui quando a Jornada estiver configurada.'));
  } catch (error) {
    errors.push(`Não foi possível carregar a Jornada ReViva: ${error.message}`);
    document.querySelector('#recentAchievements').replaceChildren(element('p', 'empty-state', 'Conquistas temporariamente indisponíveis.'));
  }
  if (errors.length) feedback(document.querySelector('#dashboardFeedback'), errors.join(' '));
}

function setProgress(journey, levelSelector, nextSelector, lifetimeSelector, barSelector, fromSelector, toSelector, iconSelector) {
  const level = journey.nivel; const next = journey.proximo_nivel;
  const points = Number(journey.estatisticas?.pontos_historicos || 0);
  const start = Number(level?.pontos_minimos || 0); const end = Number(next?.pontos_minimos || start);
  const percent = next ? Math.max(0, Math.min(100, ((points - start) / Math.max(1, end - start)) * 100)) : 100;
  if (document.querySelector(levelSelector)) document.querySelector(levelSelector).textContent = level?.nome || 'Semente';
  if (document.querySelector(nextSelector)) document.querySelector(nextSelector).textContent = next ? `${formatNumber(Math.max(0,end-points))} pontos para ${next.nome}` : 'Nível máximo alcançado';
  if (lifetimeSelector && document.querySelector(lifetimeSelector)) document.querySelector(lifetimeSelector).textContent = `${formatNumber(points)} pts`;
  if (document.querySelector(barSelector)) document.querySelector(barSelector).style.width = `${percent}%`;
  if (document.querySelector(fromSelector)) document.querySelector(fromSelector).textContent = `${formatNumber(points)} pts`;
  if (document.querySelector(toSelector)) document.querySelector(toSelector).textContent = next ? `${formatNumber(end)} pts · ${next.nome}` : 'Nível máximo';
  if (iconSelector && document.querySelector(iconSelector)) document.querySelector(iconSelector).replaceChildren(svgIcon('plant'));
}

async function initRecycle() {
  const form = document.querySelector('#recycleForm');
  const [materials, points] = await Promise.all([api('/materiais'), api('/pontos')]);
  const materialSelect = form.elements.id_material; const pointSelect = form.elements.id_ponto;
  materialSelect.replaceChildren(new Option('Selecione um material', ''));
  pointSelect.replaceChildren(new Option('Selecione um ponto de coleta', ''));
  materials.materiais.forEach((item) => materialSelect.add(new Option(item.nome, item.id_material)));
  points.pontos.forEach((item) => pointSelect.add(new Option(`${item.nome} — ${item.cidade}`, item.id_ponto)));
  const id = new URLSearchParams(location.search).get('id');
  if (id) {
    const { reciclagem } = await api(`/reciclagens/${encodeURIComponent(id)}`);
    form.elements.id_reciclagem.value = reciclagem.id_reciclagem;
    form.elements.id_material.value = reciclagem.id_material;
    form.elements.id_ponto.value = reciclagem.id_ponto;
    form.elements.quantidade_kg.value = Number(reciclagem.quantidade_kg);
    document.querySelector('#recycleFormTitle').textContent = 'Editar entrega';
    document.querySelector('#recycleSubmit').textContent = 'Salvar alterações';
    document.querySelector('#recycleCancel').hidden = false;
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault(); if (!form.reportValidity()) return;
    const editing = Boolean(form.elements.id_reciclagem.value);
    const body = { id_material: materialSelect.value, id_ponto: pointSelect.value, quantidade_kg: form.elements.quantidade_kg.value };
    const submit = document.querySelector('#recycleSubmit'); submit.disabled = true;
    try {
      const result = await api(editing ? `/reciclagens/${form.elements.id_reciclagem.value}` : '/reciclagens', { method: editing ? 'PUT' : 'POST', body: JSON.stringify(body) });
      const unlocks = result.conquistas_desbloqueadas?.length || 0;
      feedback(document.querySelector('#recycleFeedback'), `${result.mensagem}${unlocks ? ' Nova conquista desbloqueada!' : ''}`, 'success');
      if (!editing) form.reset();
      else { form.elements.id_reciclagem.value = ''; document.querySelector('#recycleCancel').hidden = true; document.querySelector('#recycleFormTitle').textContent = 'Nova entrega'; }
    } catch (error) { feedback(document.querySelector('#recycleFeedback'), error.message); }
    finally { submit.disabled = false; }
  });
}

async function initHistory() {
  const { reciclagens } = await api('/reciclagens'); const body = document.querySelector('#historyRows'); body.replaceChildren();
  if (!reciclagens.length) { const row = document.createElement('tr'); const cell = element('td', 'empty-state', 'Você ainda não registrou reciclagens.'); cell.colSpan = 6; row.append(cell); body.append(row); return; }
  reciclagens.forEach((item) => {
    const row = document.createElement('tr');
    [item.nome_material, `${formatNumber(item.quantidade_kg,2)} kg`, `${formatNumber(item.pontos_gerados)} pts`, `${item.nome_ponto} · ${item.cidade}`, formatDate(item.data_reciclagem)].forEach((value) => row.append(element('td','',value)));
    const actions = element('td','table-actions');
    const edit = element('a','text-link','Editar'); edit.href = `reciclar.html?id=${encodeURIComponent(item.id_reciclagem)}`;
    const remove = element('button','text-button danger','Excluir'); remove.type = 'button';
    remove.addEventListener('click', async () => {
      if (!(await confirmAction('Excluir esta reciclagem? Os pontos ainda disponíveis serão ajustados.'))) return;
      try { const result = await api(`/reciclagens/${item.id_reciclagem}`, { method: 'DELETE' }); feedback(document.querySelector('#historyFeedback'), result.mensagem, 'success'); await initHistory(); }
      catch (error) { feedback(document.querySelector('#historyFeedback'), error.message); }
    });
    actions.append(edit,remove); row.append(actions); body.append(row);
  });
}

function drawCharts(monthly, materials) {
  const style = getComputedStyle(document.documentElement); const accent = style.getPropertyValue('--accent').trim(); const palette = ['--chart-1','--chart-2','--chart-3','--chart-4'].map((name) => style.getPropertyValue(name).trim());
  const canvas = document.querySelector('#monthlyChart'); const ctx = canvas.getContext('2d'); const width = Math.max(280, canvas.clientWidth); const height = 230;
  canvas.width = width * devicePixelRatio; canvas.height = height * devicePixelRatio; ctx.scale(devicePixelRatio,devicePixelRatio); ctx.clearRect(0,0,width,height);
  const series = monthly.slice(-12); const max = Math.max(1,...series.map((item)=>Number(item.quilos))); const slot=(width-36)/Math.max(1,series.length);
  ctx.font='11px DM Sans, sans-serif';ctx.textAlign='center';
  series.forEach((item,index)=>{const barHeight=(Number(item.quilos)/max)*160;const x=18+index*slot+5;const y=172-barHeight;ctx.fillStyle=accent;ctx.beginPath();ctx.roundRect(x,y,Math.max(5,slot-10),barHeight,5);ctx.fill();ctx.fillStyle=style.getPropertyValue('--muted').trim();ctx.fillText(String(item.mes).slice(5),x+(slot-10)/2,195);});
  const donut=document.querySelector('#materialsChart');const dctx=donut.getContext('2d');const size=Math.min(220,Math.max(160,donut.clientWidth));donut.width=size*devicePixelRatio;donut.height=size*devicePixelRatio;dctx.scale(devicePixelRatio,devicePixelRatio);dctx.clearRect(0,0,size,size);
  const total=materials.reduce((sum,item)=>sum+Number(item.quilos),0);let angle=-Math.PI/2;
  materials.forEach((item,index)=>{const part=total?Number(item.quilos)/total*Math.PI*2:0;dctx.beginPath();dctx.moveTo(size/2,size/2);dctx.arc(size/2,size/2,size*.43,angle,angle+part);dctx.closePath();dctx.fillStyle=palette[index%palette.length];dctx.fill();angle+=part;});
  dctx.beginPath();dctx.arc(size/2,size/2,size*.24,0,Math.PI*2);dctx.fillStyle=style.getPropertyValue('--surface').trim();dctx.fill();
  const legend=document.querySelector('#materialsLegend');legend.replaceChildren();materials.forEach((item,index)=>{const li=element('li','',`${item.nome} · ${formatNumber(item.quilos,2)} kg`);li.style.setProperty('--legend-color',palette[index%palette.length]);legend.append(li);});
  const top=document.querySelector('#topMaterials');top.replaceChildren();materials.slice(0,5).forEach((item)=>{const li=element('div','simple-row');li.append(element('strong','',item.nome),element('span','',`${formatNumber(item.quilos,2)} kg`));top.append(li);});
  if(!materials.length)top.append(element('p','empty-state','Seus materiais aparecerão aqui após o primeiro registro.'));
}

async function initImpact() {
  const { resumo, materiais, evolucao_mensal } = await api('/reciclagens/resumo');
  document.querySelector('#impactAvailable').textContent=formatNumber(resumo.pontos);
  document.querySelector('#impactLifetime').textContent=formatNumber(resumo.pontos_historicos);
  document.querySelector('#impactCount').textContent=formatNumber(resumo.total_reciclagens);
  document.querySelector('#impactWeight').textContent=`${formatNumber(resumo.quilos_reciclados,2)} kg`;
  drawCharts(evolucao_mensal||[],materiais||[]);
}

function achievementCriterion(item) {
  const value = formatNumber(item.criterio_valor);
  if (item.criterio_tipo === 'reciclagens') return `${value} reciclagem${Number(item.criterio_valor)>1?'s':''}`;
  if (item.criterio_tipo === 'peso') return `${value} kg reciclados`;
  if (item.criterio_tipo === 'pontos') return `${value} pontos gerados`;
  if (item.criterio_tipo === 'diversidade') return `${value} materiais diferentes`;
  if (item.criterio_tipo === 'material') return `${value} reciclagens de ${item.criterio_material||'um material'}`;
  return 'Critério definido pelo ReViva';
}

function achievementCard(item, compact=false) {
  const card=element('article',`achievement-card${item.desbloqueada_em?' unlocked':''}${compact?' compact':''}`);
  const medal = element('span','achievement-icon'); medal.append(svgIcon(item.desbloqueada_em?'medal':'lock')); card.append(medal);
  const text=element('div','achievement-content');text.append(element('h3','',item.nome),element('p','',item.descricao));
  if(!compact)text.append(element('small','',`Critério: ${achievementCriterion(item)}`));
  text.append(element('small','achievement-status',item.desbloqueada_em?`Desbloqueada · ${formatDate(item.desbloqueada_em)}`:'Pendente'));
  card.append(text);return card;
}

async function loadJourney() {
  const { jornada }=await api('/jornada');
  setProgress(jornada,'#journeyLevel','#journeyNext','#journeyLifetime','#journeyProgress','#journeyFrom','#journeyTo','#journeyIcon');
  const unlocked=jornada.conquistas.filter((item)=>item.desbloqueada_em).length;
  document.querySelector('#achievementCount').textContent=`${unlocked} de ${jornada.conquistas.length} desbloqueadas`;
  const list=document.querySelector('#achievementsList');list.replaceChildren();jornada.conquistas.forEach((item)=>list.append(achievementCard(item)));
}

async function initRewards() {
  const [catalog, history]=await Promise.all([api('/recompensas'),api('/recompensas/resgates')]);
  document.querySelector('#rewardBalance').textContent=`${formatNumber(user.pontos)} pontos`;
  const list=document.querySelector('#rewardsList');list.replaceChildren();
  if(!catalog.recompensas.length)list.append(element('p','empty-state','Nenhuma recompensa ativa com estoque dispon&iacute;vel.'));
  catalog.recompensas.forEach((item)=>{
    const card=element('article','reward-card');
    if(item.imagem_url){const image=document.createElement('img');image.src=item.imagem_url;image.alt='';image.loading='lazy';card.append(image);}else {const mark=element('span','reward-mark');mark.append(svgIcon('leaf'));card.append(mark);}
    card.append(element('p','eyebrow',item.parceiro),element('h2','',item.nome),element('p','reward-description',item.descricao),element('strong','reward-cost',`${formatNumber(item.pontos_necessarios)} pontos`),element('small','reward-stock',`${formatNumber(item.quantidade)} dispon&iacute;veis`));
    const button=element('button','button button-primary','Resgatar');button.type='button';button.addEventListener('click',async()=>{
      if(!(await confirmAction(`Resgatar ${item.nome} por ${formatNumber(item.pontos_necessarios)} pontos?`)))return;
      try{const result=await api(`/recompensas/${item.id_recompensa}/resgatar`,{method:'POST',body:'{}'});feedback(document.querySelector('#rewardsFeedback'),result.mensagem,'success');user=(await api('/usuarios/perfil')).usuario;saveUser(user);await initRewards();}
      catch(error){feedback(document.querySelector('#rewardsFeedback'),error.message);}
    });card.append(button);list.append(card);
  });
  const rows=document.querySelector('#redemptionRows');rows.replaceChildren();
  history.resgates.forEach((item)=>{const row=document.createElement('tr');[item.recompensa,item.parceiro,formatNumber(item.pontos_gastos),formatDate(item.solicitado_em),item.status].forEach((value)=>row.append(element('td','',value)));rows.append(row);});
  if(!history.resgates.length){const row=document.createElement('tr');const cell=element('td','','Nenhum resgate registrado.');cell.colSpan=5;row.append(cell);rows.append(row);}
}

async function initRanking() {
  const load=async()=>{
    const {ranking,minha_posicao}=await api(`/jornada/ranking?periodo=${encodeURIComponent(document.querySelector('#rankingPeriod').value)}`);
    const body=document.querySelector('#rankingRows');body.replaceChildren();
    ranking.forEach((item)=>{const row=document.createElement('tr');if(item.e_minha)row.className='current-user-row';[item.posicao,item.nome,formatNumber(item.pontos)].forEach((value)=>row.append(element('td','',value)));body.append(row);});
    if(!ranking.length){const row=document.createElement('tr');const cell=element('td','','Ainda não há pontos nesse período.');cell.colSpan=3;row.append(cell);body.append(row);}
    document.querySelector('#myRank').textContent=minha_posicao?`Sua posição: ${minha_posicao}º`:'Você ainda não tem pontos nesse período.';
  };
  document.querySelector('#rankingPeriod').addEventListener('change',()=>load().catch((error)=>feedback(document.querySelector('#rankingFeedback'),error.message)));
  await load();
}

async function initDonations() {
  const list=async()=>{
    const {doacoes}=await api('/doacoes');const target=document.querySelector('#donationList');target.replaceChildren();
    if(!doacoes.length)target.append(element('p','empty-state','Você ainda não cadastrou doações.'));
    doacoes.forEach((item)=>{const card=element('article','donation-item');card.append(element('h3','',item.equipamento),element('p','',`${item.categoria} · ${item.cidade} · ${item.estado_conservacao}`),element('span',`status-pill status-${item.status}`,item.status.replace('_',' ')),element('small','',formatDate(item.criado_em)));if(item.observacao_admin)card.append(element('p','admin-observation',item.observacao_admin));target.append(card);});
  };
  await list();
  document.querySelector('#donationForm').addEventListener('submit',async(event)=>{event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;try{const body=Object.fromEntries(new FormData(form).entries());const result=await api('/doacoes',{method:'POST',body:JSON.stringify(body)});feedback(document.querySelector('#donationFeedback'),result.mensagem,'success');form.reset();await list();}catch(error){feedback(document.querySelector('#donationFeedback'),error.message);}});
}

async function initPoints() {
  const {pontos}=await api('/pontos');const input=document.querySelector('#pointSearch');const target=document.querySelector('#pointsList');
  const render=()=>{const term=input.value.trim().toLocaleLowerCase('pt-BR');const matches=pontos.filter((item)=>`${item.nome} ${item.cidade}`.toLocaleLowerCase('pt-BR').includes(term));target.replaceChildren();if(!matches.length){target.append(element('p','empty-state','Nenhum ponto corresponde à busca.'));return;}matches.forEach((item)=>{const card=element('article','collection-card');const marker=element('span','collection-icon');marker.append(svgIcon('pin'));card.append(marker,element('h2','',item.nome),element('p','',item.endereco),element('strong','',item.cidade));if(item.descricao)card.append(element('p','collection-description',item.descricao));const map=element('a','text-link','Abrir no Google Maps ↗');map.href=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([item.nome,item.endereco,item.cidade].join(', '))}`;map.target='_blank';map.rel='noopener noreferrer';card.append(map);target.append(card);});};
  input.addEventListener('input',render);render();
}

async function initProfile() {
  document.querySelector('#profileName').textContent=user.nome;document.querySelector('#profileEmail').textContent=user.email;
  document.querySelector('#profileAvatar').textContent=(user.nome||'R').trim().charAt(0).toUpperCase();
  document.querySelector('#profileType').textContent=roleName(user.tipo_usuario);document.querySelector('#profilePoints').textContent=`${formatNumber(user.pontos)} pts`;document.querySelector('#profileDate').textContent=formatDate(user.data_cadastro);
  document.querySelector('#profileLogout').addEventListener('click',logout);
  document.querySelectorAll('[data-set-theme]').forEach((button)=>button.addEventListener('click',()=>{setTheme(button.dataset.setTheme);document.querySelectorAll('[data-set-theme]').forEach((option)=>option.classList.toggle('selected',option.dataset.setTheme===currentTheme()));}));
  document.querySelectorAll('[data-set-theme]').forEach((button)=>button.classList.toggle('selected',button.dataset.setTheme===currentTheme()));
}

async function initUserSettings() {
  const rows=document.querySelector('#usersRows');
  const data=await api('/usuarios');rows.replaceChildren();
  data.usuarios.forEach((account)=>{
    const row=document.createElement('tr');[account.nome,account.email,roleName(account.tipo_usuario),formatNumber(account.pontos),formatDate(account.data_cadastro)].forEach((value)=>row.append(element('td','',value)));
    const cell=element('td','');const select=document.createElement('select');select.className='role-select';select.setAttribute('aria-label',`Nível de ${account.nome}`);select.add(new Option('Usuário comum','comum'));select.add(new Option('Administrador','administrador'));select.value=account.tipo_usuario;
    if(Number(account.id_usuario)===Number(user.id_usuario)){select.disabled=true;select.title='Não é permitido alterar o próprio acesso.';}
    select.addEventListener('change',async()=>{const previous=account.tipo_usuario;const next=select.value;if(!(await confirmAction(`Alterar ${account.nome} para ${roleName(next)}?`))){select.value=previous;return;}select.disabled=true;try{const result=await api(`/usuarios/${account.id_usuario}/tipo`,{method:'PATCH',body:JSON.stringify({tipo_usuario:next})});account.tipo_usuario=next;feedback(document.querySelector('#usersFeedback'),`${result.mensagem} A pessoa alterada deve entrar novamente para atualizar o perfil da sessão.`, 'success');await initUserSettings();}catch(error){select.value=previous;select.disabled=false;feedback(document.querySelector('#usersFeedback'),error.message);}});
    cell.append(select);row.append(cell);rows.append(row);
  });
}

function adminList(target,items,kind) {
  const list=document.querySelector(target);list.replaceChildren();
  items.forEach((item)=>{const li=element('li','admin-list-row');const key=kind==='material'?'id_material':kind==='point'?'id_ponto':'id_recompensa';const title=kind==='material'?`${item.nome} · ${formatNumber(item.pontos_por_kg,2)} pts/kg`:kind==='point'?`${item.nome} · ${item.cidade}`:item.nome;li.append(element('span','',title));
    const edit=element('button','text-button','Editar');edit.type='button';edit.addEventListener('click',()=>{const form=document.querySelector(kind==='material'?'#materialForm':kind==='point'?'#pointForm':'#adminRewardForm');Object.entries(item).forEach(([name,value])=>{if(form.elements[name])form.elements[name].value=value??'';});if(kind==='reward'&&form.elements.ativa)form.elements.ativa.checked=Boolean(item.ativa);form.scrollIntoView({behavior:'smooth',block:'center'});});
    const remove=element('button','text-button danger','Excluir');remove.type='button';remove.addEventListener('click',async()=>{if(!(await confirmAction('Excluir este item? Registros vinculados serao preservados.')))return;const path=kind==='material'?'materiais':kind==='point'?'pontos':'recompensas';try{const result=await api(`/admin/${path}/${item[key]}`,{method:'DELETE'});feedback(document.querySelector('#adminFeedback'),result.mensagem,'success');await loadAdmin();}catch(error){feedback(document.querySelector('#adminFeedback'),error.message);}});
    li.append(edit,remove);list.append(li);});
  if(!items.length)list.append(element('li','empty-state','Nenhum registro cadastrado.'));
}

function adminRequests(target,items,kind) {
  const list=document.querySelector(target);list.replaceChildren();
  items.forEach((item)=>{const card=element('article','admin-request');const label=kind==='doacao'?`${item.equipamento} · ${item.nome_usuario}`:`${item.recompensa} · ${item.nome_usuario}`;card.append(element('strong','',label));card.append(element('small','',kind==='doacao'?`${item.cidade} · ${item.status}`:`${item.parceiro} · ${item.status} · ${formatNumber(item.pontos_gastos)} pts`));
    const select=document.createElement('select');select.className='admin-status-select';const choices=kind==='doacao'?[['pendente','Pendente'],['em_analise','Em análise'],['aprovada','Aprovada'],['rejeitada','Rejeitada'],['concluida','Concluída']]:[['concluido','Concluído'],['cancelado','Cancelar e devolver pontos']];choices.forEach(([value,text])=>select.add(new Option(text,value)));select.value=item.status;select.disabled=kind==='resgate'&&item.status!=='pendente';card.append(select);
    let note;if(kind==='doacao'){note=document.createElement('input');note.className='admin-note-input';note.placeholder='Observação';note.value=item.observacao_admin||'';card.append(note);}
    const save=element('button','button button-quiet','Atualizar');save.type='button';save.disabled=select.disabled;save.addEventListener('click',async()=>{try{const id=kind==='doacao'?item.id_doacao:item.id_resgate;const path=kind==='doacao'?`/admin/doacoes/${id}/status`:`/admin/resgates/${id}/status`;const body={status:select.value};if(note)body.observacao_admin=note.value;const result=await api(path,{method:'PATCH',body:JSON.stringify(body)});feedback(document.querySelector('#adminFeedback'),result.mensagem,'success');await loadAdmin();}catch(error){feedback(document.querySelector('#adminFeedback'),error.message);}});card.append(save);list.append(card);});
  if(!items.length)list.append(element('p','empty-state','Nenhuma solicitacao pendente.'));
}

async function loadAdmin() {
  const [stats,materials,points,rewards,donations,resgates]=await Promise.all([api('/admin/indicadores'),api('/materiais'),api('/pontos'),api('/admin/recompensas'),api('/admin/doacoes'),api('/admin/resgates')]);
  const metrics=document.querySelector('#adminMetrics');metrics.replaceChildren();[['Usuários',stats.indicadores.usuarios],['Reciclagens',stats.indicadores.reciclagens],['Quilos',`${formatNumber(stats.indicadores.quilos,2)} kg`],['Pontos gerados',stats.indicadores.pontos_gerados],['Resgates',stats.indicadores.recompensas_resgatadas],['Doações',stats.indicadores.doacoes]].forEach(([label,value])=>{const card=element('article','metric-card');card.append(element('span','metric-label',label.toUpperCase()),element('strong','',formatNumber(value)));metrics.append(card);});
  adminData={materials:materials.materiais,points:points.pontos,rewards:rewards.recompensas};adminList('#adminMaterials',adminData.materials,'material');adminList('#adminPoints',adminData.points,'point');adminList('#adminRewards',adminData.rewards,'reward');adminRequests('#adminDonations',donations.doacoes,'doacao');adminRequests('#adminRedemptions',resgates.resgates,'resgate');
}

async function submitAdminForm(event,kind) {
  event.preventDefault();const form=event.currentTarget;if(!form.reportValidity())return;
  const body=Object.fromEntries(new FormData(form).entries());const key=kind==='material'?'id_material':kind==='point'?'id_ponto':'id_recompensa';const id=body[key];delete body[key];
  if(kind==='reward')body.ativa=form.elements.ativa.checked;
  const path=kind==='material'?'/admin/materiais':kind==='point'?'/admin/pontos':'/admin/recompensas';
  try{const result=await api(id?`${path}/${id}`:path,{method:id?'PUT':'POST',body:JSON.stringify(body)});form.reset();form.elements[key].value='';if(kind==='reward')form.elements.ativa.checked=true;feedback(document.querySelector('#adminFeedback'),result.mensagem,'success');await loadAdmin();}catch(error){feedback(document.querySelector('#adminFeedback'),error.message);}
}

async function initAdmin() {
  for(const [selector,kind] of [['#materialForm','material'],['#pointForm','point'],['#adminRewardForm','reward']])document.querySelector(selector).addEventListener('submit',(event)=>submitAdminForm(event,kind));
  await loadAdmin();
}

async function boot() {
  if(!page)return;
  try {
    user=await requireUser();
    if(['configuracoes','admin'].includes(page)&&user.tipo_usuario!=='administrador'){location.replace('dashboard.html');return;}
    mountLayout(page,user);
    const initializers={dashboard:loadDashboard,reciclar:initRecycle,historico:initHistory,impacto:initImpact,conquistas:loadJourney,recompensas:initRewards,ranking:initRanking,doacoes:initDonations,pontos:initPoints,perfil:initProfile,configuracoes:initUserSettings,admin:initAdmin};
    await initializers[page]?.();
  } catch(error) {
    if(error.message==='Sessão encerrada.')return;
    const target=document.querySelector('.page-content');if(target){const notice=element('p','feedback error',error.message);target.prepend(notice);}
  }
}

window.addEventListener('resize',()=>{if(page==='impacto')initImpact().catch(()=>{});});
boot();
