// Lógica do painel Rumo (prototipo/rumo.html). Corre no claude.ai e no painel local.
(() => {
  "use strict";

  // =========================================================== utilidades
  const $ = (id) => document.getElementById(id);
  const pad = (n) => String(n).padStart(2, "0");
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const TODAY = iso(new Date());
  const MONTH = TODAY.slice(0, 7);
  const addDays = (s, n) => { const d = new Date(s + "T12:00:00"); d.setDate(d.getDate() + n); return iso(d); };
  const addMonths = (m, n) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; };
  const daysBetween = (a, b) => Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
  const newId = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const fold = (s) => String(s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
  const money = (n) => { const [i, d] = Math.abs(n).toFixed(2).split("."); return `${n < 0 ? "−" : ""}${i.replace(/\B(?=(\d{3})+(?!\d))/g, " ")},${d} €`; };
  const shortDate = (s) => `${s.slice(8)}/${s.slice(5, 7)}`;
  const monthLabel = (m) => { const t = new Date(m + "-15T12:00:00").toLocaleDateString("pt-PT", { month: "long", year: "numeric" }); return t.charAt(0).toUpperCase() + t.slice(1); };
  const weekKey = (s) => { const d = new Date(s + "T12:00:00"); const day = (d.getDay() + 6) % 7; d.setDate(d.getDate() - day + 3); const w1 = new Date(d.getFullYear(), 0, 4); return `${d.getFullYear()}-S${pad(1 + Math.round(((d - w1) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7))}`; };

  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
      else if (k === "value") el.value = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat()) if (kid != null && kid !== false && kid !== "") el.append(kid instanceof Node ? kid : String(kid));
    return el;
  }
  function segGroup(id, onPick) {
    const btns = [...document.querySelectorAll(`#${id} button`)];
    btns.forEach((b) => b.addEventListener("click", () => { btns.forEach((x) => x.setAttribute("aria-pressed", String(x === b))); onPick(b.dataset.v ?? b.dataset.kind); }));
  }
  function nextDate(s, rep) {
    if (rep === "diaria") return addDays(s, 1);
    if (rep === "semanal") return addDays(s, 7);
    const [y, m, d] = s.split("-").map(Number);
    const t = new Date(y, m - 1 + (rep === "anual" ? 12 : 1), 1, 12);
    t.setDate(Math.min(d, new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate()));
    return iso(t);
  }

  const weekday = new Intl.DateTimeFormat("pt-PT", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  $("today-label").textContent = weekday.charAt(0).toUpperCase() + weekday.slice(1);

  // =========================================================== separadores
  // `area` escolhe a cor (ver [data-area] no CSS).
  // A barra segue o dia: primeiro o que se faz agora, depois cada área, e no fim a conversa
  // livre e as definições.
  const VIEWS = [
    { area: "rotina", group: "O teu dia", id: "hoje", name: "Hoje", hint: "As 3 prioridades" },
    { area: "rotina", id: "foco", name: "Foco", hint: "Um bloco de cada vez", dot: true },
    { area: "rotina", id: "semana", name: "Semana", hint: "Revisão de 15 minutos" },
    { area: "financas", group: "Dinheiro", id: "mes", name: "Mês", hint: "Quanto ainda podes gastar" },
    { area: "financas", id: "contas", name: "Património", hint: "Contas e objetivos" },
    { area: "financas", id: "investir", name: "Investir", hint: "Perceber antes de decidir" },
    { area: "carreira", group: "Emprego", id: "candidaturas", name: "Candidaturas", hint: "Preparar, procurar, decidir" },
    { area: "carreira", id: "vagas", name: "Vagas", hint: "O que a procura encontrou" },
    { area: "ideias", group: "Escrever e pensar", id: "pensar", name: "Ideias", hint: "Capturar e desenvolver" },
    { area: "ideias", id: "corretor", name: "Corretor", hint: "Português e inglês" },
    { area: "ideias", id: "escrita", name: "Escrita", hint: "Coerência e tom" },
    { area: "config", group: "Rumo", id: "conversar", name: "Conversar", hint: "Falar com o Claude" },
    { area: "config", id: "config", name: "Configurar", hint: "Dados e preferências" },
  ];
  $("tabs").replaceChildren(...VIEWS.flatMap((v) => [
    v.group ? h("p", { class: "label group-label", role: "presentation", "data-area": v.area, text: v.group }) : null,
    h("button", { class: "tab", role: "tab", id: `tab-${v.id}`, "data-area": v.area, "aria-controls": `view-${v.id}`, "aria-selected": "false", onclick: () => selectTab(v.id) },
      h("span", { class: "tab-name" }, v.name, v.dot ? h("span", { class: "dot", id: "focus-dot", hidden: true }) : null),
      h("span", { class: "tab-hint", text: v.hint })),
  ].filter(Boolean)));
  let mobileGroup = "";
  $("mobile-view").replaceChildren(...VIEWS.map((v) => {
    if (v.group) mobileGroup = v.group;
    return h("option", { value: v.id, text: `${mobileGroup} — ${v.name}` });
  }));
  $("mobile-view").addEventListener("change", (e) => selectTab(e.target.value));
  let currentView = "hoje";
  // Teclado nos separadores, como manda o padrão de acessibilidade: setas para mudar,
  // Home/End para o primeiro e o último. Só o separador aberto entra no Tab.
  $("tabs").addEventListener("keydown", (e) => {
    const teclas = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    const i = VIEWS.findIndex((v) => v.id === currentView);
    let alvo = null;
    if (e.key in teclas) alvo = VIEWS[(i + teclas[e.key] + VIEWS.length) % VIEWS.length];
    else if (e.key === "Home") alvo = VIEWS[0];
    else if (e.key === "End") alvo = VIEWS[VIEWS.length - 1];
    if (!alvo) return;
    e.preventDefault();
    selectTab(alvo.id);
    $(`tab-${alvo.id}`).focus();
  });

  function selectTab(name) {
    currentView = name;
    for (const v of VIEWS) {
      const on = v.id === name;
      $(`tab-${v.id}`).setAttribute("aria-selected", String(on));
      $(`tab-${v.id}`).tabIndex = on ? 0 : -1;
      $(`view-${v.id}`).hidden = !on;
      if (on) $("shell").dataset.area = v.area;
    }
    $("mobile-view").value = name;
    if (name === "foco") renderFocusSelect();
    if (name === "mes") ensureRecentMonths();
    try { sessionStorage.setItem("rumo-tab", name); } catch { /* sem armazenamento */ }
    renderView(name);
  }

  // =========================================================== exemplos
  const CATS_OUT = ["Casa", "Supermercado", "Restauração", "Transportes", "Combustível", "Comunicações", "Saúde", "Educação", "Subscrições", "Compras", "Lazer", "Dinheiro", "Outros"];
  const CATS_IN = ["Salário", "Outros rendimentos"];
  const TRANSFER = "Transferências";
  const ALL_CATS = [...CATS_OUT, ...CATS_IN, TRANSFER];
  const DEFAULT_RULES = [
    ["uber eats", "Restauração"], ["glovo", "Restauração"], ["bolt food", "Restauração"],
    ["continente", "Supermercado"], ["pingo doce", "Supermercado"], ["lidl", "Supermercado"], ["mercadona", "Supermercado"], ["auchan", "Supermercado"], ["minipreco", "Supermercado"],
    ["galp energia", "Casa"], ["edp comercial", "Casa"], ["epal", "Casa"], ["ikea", "Casa"],
    ["meo", "Comunicações"], ["nos comunicacoes", "Comunicações"], ["vodafone", "Comunicações"],
    ["via verde", "Transportes"], ["bolt", "Transportes"], ["uber", "Transportes"],
    ["galp", "Combustível"], ["repsol", "Combustível"], ["farmacia", "Saúde"],
    ["netflix", "Subscrições"], ["spotify", "Subscrições"], ["disney plus", "Subscrições"],
    ["worten", "Compras"], ["fnac", "Compras"], ["amazon", "Compras"], ["levantamento", "Dinheiro"],
  ].map(([p, cat]) => ({ p, cat }));

  const EXAMPLE_TASKS = [
    { id: "e1", t: "Entregar a declaração de IRS", p: 1, due: addDays(TODAY, -2), rep: "", adiada: 3, feita: null, inbox: false },
    { id: "e2", t: "Pagar a renda", p: 1, due: TODAY, rep: "mensal", adiada: 0, feita: null, inbox: false },
    { id: "e3", t: "Responder ao email do contabilista", p: 2, due: addDays(TODAY, 2), rep: "", adiada: 0, feita: null, inbox: false },
    { id: "e4", t: "Marcar consulta no dentista", p: 3, due: "", rep: "", adiada: 1, feita: null, inbox: false },
    { id: "e5", t: "Ligar à Joana", p: 2, due: "", rep: "", adiada: 0, feita: addDays(TODAY, -1), inbox: false },
    { id: "e6", t: "Ideia: crónica sobre a feira da aldeia", p: 2, due: "", rep: "", adiada: 0, feita: null, inbox: true },
  ];
  const EXAMPLE_JOBS = [
    { id: "xj1", empresa: "Aurora Labs (exemplo)", cargo: "Machine Learning Engineer", local: "Lisboa", estado: "entrevista", nota: "4,5", data: addDays(TODAY, -2), proximo: addDays(TODAY, 1), fonte: "landing", link: "", obs: "" },
    { id: "xj2", empresa: "Porto Data (exemplo)", cargo: "Data Scientist", local: "Porto · híbrido", estado: "candidatei", nota: "4", data: addDays(TODAY, -9), proximo: addDays(TODAY, -2), fonte: "linkedin", link: "", obs: "" },
    { id: "xj3", empresa: "Nortada (exemplo)", cargo: "AI Engineer", local: "Remoto", estado: "candidatei", nota: "3,5", data: addDays(TODAY, -3), proximo: addDays(TODAY, 4), fonte: "itjobs", link: "", obs: "" },
    { id: "xj4", empresa: "Farol Analytics (exemplo)", cargo: "Research Engineer", local: "Lisboa", estado: "guardada", nota: "", data: TODAY, proximo: "", fonte: "site da empresa", link: "", obs: "" },
    { id: "xj5", empresa: "Maré Tech (exemplo)", cargo: "ML Engineer", local: "Braga", estado: "recusada", nota: "3", data: addDays(TODAY, -12), proximo: "", fonte: "landing", link: "", obs: "" },
  ];
  function exampleMonth(m, k) {
    const x = (d, desc, v, cat) => ({ id: `x${m}${d}${v}`, d: `${m}-${pad(d)}`, desc: `${desc} (exemplo)`, v, cat, acc: "exemplo" });
    return { mov: [
      x(1, "Salário", 1450, "Salário"), x(2, "Renda", -650, "Casa"), x(3, "Continente", -86.4 + k * 7, "Supermercado"),
      x(5, "Jantar fora", -42 - k * 10, "Restauração"), x(6, "Passe", -40, "Transportes"), x(8, "Netflix", -12.99, "Subscrições"),
      x(10, "Ginásio", -30, "Lazer"), x(12, "Lidl", -63.1 + k * 4, "Supermercado"), x(15, "Poupança", -200, TRANSFER),
    ].filter((mv) => mv.d <= TODAY || m < MONTH) };
  }
  const exampleFinance = () => ({
    months: { [MONTH]: exampleMonth(MONTH, 0), [addMonths(MONTH, -1)]: exampleMonth(addMonths(MONTH, -1), 1), [addMonths(MONTH, -2)]: exampleMonth(addMonths(MONTH, -2), 2) },
    index: [addMonths(MONTH, -2), addMonths(MONTH, -1), MONTH],
    budget: { Casa: 700, Supermercado: 250, Restauração: 60, Transportes: 60, Subscrições: 30, Lazer: 50 },
    accounts: [
      { id: "a1", nome: "Conta à ordem (exemplo)", tipo: "à ordem", saldo: 1840.55, data: addDays(TODAY, -3) },
      { id: "a2", nome: "Poupança (exemplo)", tipo: "poupança", saldo: 2600, data: addDays(TODAY, -50) },
      { id: "a3", nome: "Cartão de crédito (exemplo)", tipo: "dívida", saldo: -320.4, data: addDays(TODAY, -3) },
    ],
  });

  // =========================================================== estado
  const ex = exampleFinance();
  const state = {
    mode: "loading",
    tasks: structuredClone(EXAMPLE_TASKS), tasksExample: true,
    finExample: true, month: MONTH,
    months: ex.months, index: ex.index, budget: ex.budget, rules: structuredClone(DEFAULT_RULES), accounts: ex.accounts,
    goals: "", reviews: [], ideas: [], notes: [], drafts: [], errors: [], voice: { amostras: [], perfil: "", confirmado: false },
    blocks: {},
    jobs: structuredClone(EXAMPLE_JOBS), jobsExample: true, found: [],
    cv: null, dropped: [], cargos: [], conversas: [],
  };
  // `fechados`: ids de emails que ele fechou com o ×. Ficam só neste navegador.
  const GMAIL_CLOSED_KEY = "rumo-emails-fechados-v1";
  const gmailState = { items: [], index: 0, updatedAt: null, closed: new Set(), source: "" };
  try { gmailState.closed = new Set(JSON.parse(localStorage.getItem(GMAIL_CLOSED_KEY) || "[]")); } catch { /* só memória */ }
  function saveClosedEmails() {
    try { localStorage.setItem(GMAIL_CLOSED_KEY, JSON.stringify([...gmailState.closed])); } catch { /* só memória */ }
  }

  // ===========================================================================
  // DE ONDE VÊM OS DADOS (a mesma página corre em dois sítios)
  //
  //   claude.ai          → documentos privados da página (db) + conectores (Gmail, Calendar)
  //   painel local       → ficheiros do computador, pela API em 127.0.0.1 (/api/...)
  //   fora dos dois      → exemplos, e o que estiver no localStorage deste navegador
  //
  // Quando há mais do que uma origem para o mesmo dado, manda a mais fresca, por esta ordem:
  //   1. conector (calendário, Gmail): é o próprio serviço, em direto;
  //   2. ficheiro local (agenda.json, emails.json, cv.md, vagas.csv): escrito pelo /hoje ou
  //      pela procura, no computador;
  //   3. documento da página (db): o que lá ficou da última sincronização.
  // Quem desce de nível nunca escreve por cima de quem está acima (ver `agendaState.source`).
  // ===========================================================================
  // =========================================================== armazenamento
  let db = null, uid = null;
  const LOCAL_KEY = "rumo-local-v1";
    // A chave do painel local vem no endereço, mas não fica lá: passa para a sessão deste
  // separador (sobrevive a um F5) e o endereço é limpo, para não ficar no histórico nem
  // numa captura de ecrã.
  const LOCAL_TOKEN = (() => {
    const doEndereco = new URLSearchParams(location.search).get("local");
    try {
      if (doEndereco) {
        sessionStorage.setItem("rumo-local-token", doEndereco);
        history.replaceState({}, "", location.pathname);
        return doEndereco;
      }
      return sessionStorage.getItem("rumo-local-token");
    } catch { return doEndereco; }
  })();
  const unsub = {};

  function snapshotForLocal() {
    return {
      tasks: state.tasksExample ? null : state.tasks,
      fin: state.finExample ? null : { months: state.months, index: state.index, budget: state.budget, rules: state.rules, accounts: state.accounts },
      goals: state.goals, reviews: state.reviews, ideas: state.ideas, notes: state.notes, drafts: state.drafts, errors: state.errors, voice: state.voice, blocks: state.blocks,
      jobs: state.jobsExample ? null : state.jobs,
      cv: state.cv, dropped: state.dropped, cargos: state.cargos, conversas: state.conversas,
    };
  }
  /**
   * Guarda no navegador. Se o espaço acabar (as conversas são o que mais cresce), tenta de
   * novo sem elas: mais vale perder o histórico da conversa do que deixar de guardar tarefas.
   */
  function localSave() {
    const tentar = (dados) => { localStorage.setItem(LOCAL_KEY, JSON.stringify(dados)); return true; };
    const snapshot = snapshotForLocal();
    try { return tentar(snapshot); } catch { /* espaço esgotado: corta o que é grande */ }
    try { return tentar({ ...snapshot, conversas: (snapshot.conversas || []).slice(0, 5).map((c) => ({ ...c, turnos: (c.turnos || []).slice(-6) })) }); } catch { /* ainda não cabe */ }
    try { return tentar({ ...snapshot, conversas: [] }); } catch { /* fica só em memória */ }
    return false;
  }
  // "bussola-local-v2": nome antigo do painel; lido só se ainda não houver dados com o nome novo.
  function localLoad() { try { return JSON.parse(localStorage.getItem(LOCAL_KEY) || localStorage.getItem("bussola-local-v2") || "null"); } catch { return null; } }

  const writers = {};
  /**
   * No painel local, estes documentos ficam em ficheiros do computador (e não só no navegador),
   * para o /sincronizar os poder juntar com a página no claude.ai.
   */
  const DADOS_LOCAIS = {
    conversas: { ler: () => state.conversas || [], aplicar: (d) => { state.conversas = d.items; } },
    cargos: { ler: () => state.cargos || [], aplicar: (d) => { state.cargos = d.items; } },
    "vagas-fora": { ler: () => state.dropped || [], aplicar: (d) => { state.dropped = d.items; } },
    revisoes: { ler: () => state.reviews || [], aplicar: (d) => { state.reviews = d.items; } },
    foco: { ler: () => state.blocks || {}, aplicar: (d) => { state.blocks = d.days; }, mapa: true },
  };
  const escritoresLocais = {};
  function saveDadosLocal(name, body) {
    if (!LOCAL_TOKEN || !DADOS_LOCAIS[name]) return;
    const w = (escritoresLocais[name] ||= { busy: false, next: null });
    w.next = body;
    if (w.busy) return;
    w.busy = true;
    (async () => {
      while (w.next) {
        const b = w.next; w.next = null;
        try { await localRequest(`/api/dados/${name}`, { method: "PUT", body: JSON.stringify(b) }); }
        catch (e) { flash(`Não foi possível guardar no computador: ${e.message}`, 6000); }
      }
      w.busy = false;
    })();
  }
  async function loadLocalDados() {
    if (!LOCAL_TOKEN) return;
    await Promise.all(Object.entries(DADOS_LOCAIS).map(async ([name, def]) => {
      const res = await localRequest(`/api/dados/${name}`);
      const noNavegador = def.ler();
      const temNoNavegador = def.mapa ? Object.keys(noNavegador).length > 0 : noNavegador.length > 0;
      if (res.exists) def.aplicar(res.data);
      // Primeira vez: o que estava só no navegador passa para o ficheiro, em vez de se perder.
      else if (temNoNavegador) await localRequest(`/api/dados/${name}`, { method: "PUT", body: JSON.stringify(def.mapa ? { days: noNavegador } : { items: noNavegador }) });
    }));
    localSave();
    renderAllEmBreve();
  }

  function save(name, body) {
    if (state.mode !== "cloud") { localSave(); saveDadosLocal(name, body); return; }
    const w = (writers[name] ||= { busy: false, next: null });
    w.next = body;
    if (w.busy) return;
    w.busy = true;
    (async () => {
      while (w.next) {
        const b = w.next; w.next = null;
        try { await db.doc(`data/users/${uid}/${name}`).set(b); }
        catch (e) {
          flash(saveErrorText(e));
          if (e && (e.code === "revoked" || e.code === "not_granted")) { toLocal(); break; }
        }
      }
      w.busy = false;
    })();
  }
  async function loadDoc(name) {
    if (state.mode !== "cloud") return null;
    try { const s = await db.doc(`data/users/${uid}/${name}`).get(); return s.exists ? structuredClone(s.data()) : null; }
    catch { return null; }
  }

  const financeWriters = {};
  let financePending = 0;
  let writingBusy = false, writingNext = null, writingPending = 0;
  function financeStorageStatus(text, bad = false) {
    const note = $("fin-storage");
    if (!note) return;
    note.textContent = text;
    note.className = `note${bad ? " neg-flag" : ""}`;
  }
  function saveFinanceLocal(part, body) {
    if (!LOCAL_TOKEN) return;
    const writer = (financeWriters[part] ||= { busy: false, next: null });
    writer.next = body;
    if (writer.busy) return;
    writer.busy = true;
    (async () => {
      while (writer.next) {
        const next = writer.next; writer.next = null;
        financePending++;
        financeStorageStatus("A guardar nos ficheiros locais…");
        let saved = true;
        try { await localRequest(`/api/financas/${part}`, { method: "PUT", body: JSON.stringify(next) }); }
        catch (e) { saved = false; financeStorageStatus(`Erro ao guardar: ${e.message}`, true); flash(`Não foi possível guardar Finanças no ficheiro: ${e.message}`, 6000); }
        finally {
          financePending--;
          if (!financePending && saved) financeStorageStatus("Guardado nos ficheiros da pasta financas/ · cópia anterior em .sync/backups/financas/");
        }
      }
      writer.busy = false;
    })();
  }
  const writingPayload = () => ({ ideas: state.ideas, notes: state.notes, drafts: state.drafts, errors: state.errors, voice: state.voice });
  function saveWritingLocal() {
    if (!LOCAL_TOKEN) return;
    writingNext = writingPayload();
    if (writingBusy) return;
    writingBusy = true;
    (async () => {
      while (writingNext) {
        const next = writingNext; writingNext = null; writingPending++;
        if ($("writing-storage")) $("writing-storage").textContent = "A guardar no computador…";
        try {
          await localRequest("/api/escrita", { method: "PUT", body: JSON.stringify(next) });
          if ($("writing-storage")) $("writing-storage").textContent = "Guardado em escrita/painel.json · versão anterior em .sync/backups/escrita/.";
        } catch (e) {
          if ($("writing-storage")) $("writing-storage").textContent = `Erro ao guardar: ${e.message}`;
          flash(`Não foi possível guardar Ideias e Escrita no ficheiro: ${e.message}`, 6000);
        } finally { writingPending--; }
      }
      writingBusy = false;
    })();
  }
  addEventListener("beforeunload", (event) => {
    if (!financePending && !writingPending && !writingNext) return;
    event.preventDefault();
    event.returnValue = "";
  });
  const saveTasks = () => { if (!state.tasksExample) save("tarefas", { items: state.tasks }); };
  const saveMonth = (m) => { if (!state.finExample) { save(`fin-${m}`, { mov: state.months[m]?.mov || [] }); saveFinanceLocal(`month/${m}`, { items: state.months[m]?.mov || [] }); } };
  const saveIndex = () => { if (!state.finExample) save("fin-index", { months: state.index }); };
  const saveBudget = () => { if (!state.finExample) { save("orcamento", { limits: state.budget }); saveFinanceLocal("budget", { limits: state.budget }); } };
  const saveRules = () => { if (!state.finExample) { save("regras", { rules: state.rules }); saveFinanceLocal("rules", { items: state.rules }); } };
  const saveAccounts = () => { if (!state.finExample) { save("contas", { items: state.accounts }); saveFinanceLocal("accounts", { items: state.accounts }); } };
  const saveGoals = () => { save("objetivos", { text: state.goals }); saveFinanceLocal("goals", { content: state.goals }); };
  const saveReviews = () => save("revisoes", { items: state.reviews.slice(0, 52) });
  const saveIdeas = () => { save("ideias", { items: state.ideas.slice(0, 100) }); saveWritingLocal(); };
  const saveNotes = () => { save("pensar", { items: state.notes.slice(0, 60) }); saveWritingLocal(); };
  const saveDrafts = () => { save("rascunhos", { items: state.drafts.slice(0, 40) }); saveWritingLocal(); };
  const saveErrors = () => { save("lingua", { items: state.errors.slice(0, 200) }); saveWritingLocal(); };
  const saveVoice = () => { save("voz", state.voice); saveWritingLocal(); };
  const saveJobs = () => { if (!state.jobsExample) save("carreira", { items: state.jobs }); };
  const saveBlocks = () => save("foco", { days: Object.fromEntries(Object.entries(state.blocks).filter(([d]) => d >= addDays(TODAY, -30))) });

  function saveErrorText(e) {
    const code = e && e.code;
    if (code === "quota_exceeded") return "O espaço desta página está cheio. Apaga dados antigos para continuar a guardar.";
    if (code === "resource_exhausted") return "Muitas alterações seguidas. Espera uns segundos.";
    if (code === "revoked" || code === "not_granted") return "Já não é possível guardar nesta página. As alterações ficam só neste navegador.";
    return "Não foi possível guardar a última alteração. Tenta outra vez daqui a pouco.";
  }
  let flashTimer = null;
  function flash(text, ms = 3500) {
    const s = $("status"); s.textContent = text; s.hidden = false;
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { if (state.mode === "local") { s.textContent = LOCAL_TEXT; } else s.hidden = true; }, ms);
  }
  const LOCAL_TEXT = LOCAL_TOKEN ? "Painel local: ligado aos ficheiros deste computador." : "Modo local: os dados ficam só neste navegador e neste dispositivo.";

  function applyFinance(fin) {
    state.months = fin.months || {}; state.index = fin.index || []; state.budget = fin.budget || {};
    state.rules = fin.rules || structuredClone(DEFAULT_RULES); state.accounts = fin.accounts || []; state.finExample = false;
  }
  function toLocal() {
    state.mode = "local";
    Object.values(unsub).forEach((u) => { try { u(); } catch { /* já parado */ } });
    const saved = localLoad();
    if (saved) {
      if (saved.tasks) { state.tasks = saved.tasks; state.tasksExample = false; }
      if (saved.fin) applyFinance(saved.fin);
      if (saved.jobs) { state.jobs = saved.jobs; state.jobsExample = false; }
      if (saved.cv?.markdown) state.cv = saved.cv;
      if (Array.isArray(saved.dropped)) state.dropped = saved.dropped;
      if (Array.isArray(saved.cargos)) state.cargos = saved.cargos;
      if (Array.isArray(saved.conversas)) state.conversas = saved.conversas;
      Object.assign(state, {
        goals: saved.goals || "", reviews: saved.reviews || [], ideas: saved.ideas || [], notes: saved.notes || [], drafts: saved.drafts || [], errors: saved.errors || [],
        voice: saved.voice || state.voice, blocks: saved.blocks || {},
      });
    }
    $("status").textContent = LOCAL_TEXT; $("status").hidden = false;
    renderAll();
  }

  // Ao abrir, chegam ~20 documentos quase ao mesmo tempo, e cada um pedia um redesenho da
  // página inteira. Agora juntam-se: um só redesenho por imagem do ecrã.
  let redesenhoMarcado = false;
  function renderAllEmBreve() {
    if (redesenhoMarcado) return;
    redesenhoMarcado = true;
    const fazer = () => { redesenhoMarcado = false; renderAll(); };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(fazer);
    else setTimeout(fazer, 16);
  }
  function watch(name, apply) {
    unsub[name]?.();
    unsub[name] = db.doc(`data/users/${uid}/${name}`).onSnapshot((snap) => {
      apply(snap.exists ? structuredClone(snap.data()) : null);
      renderAllEmBreve();
    }, (e) => flash(saveErrorText(e)));
  }
  function watchMonth(m) {
    if (state.mode !== "cloud" || state.finExample) return;
    watch(`fin-${m}`, (d) => { state.months[m] = { mov: d?.mov || [] }; });
  }

  async function connect() {
    const c = window.claude;
    if (!c || typeof c.use !== "function") return toLocal();
    const [dbNs, userNs] = await Promise.all([c.use("db"), c.use("user")]);
    const id = userNs ? await userNs.id() : null;
    if (!dbNs || !id) return toLocal();
    db = dbNs; uid = id; state.mode = "cloud";

    watch("tarefas", (d) => { if (d) { state.tasks = d.items || []; state.tasksExample = false; } });
    const idx = await loadDoc("fin-index");
    if (idx) {
      const [budget, rules, accounts] = await Promise.all([loadDoc("orcamento"), loadDoc("regras"), loadDoc("contas")]);
      applyFinance({ months: {}, index: idx.months || [], budget: budget?.limits, rules: rules?.rules, accounts: accounts?.items });
      watch("fin-index", (d) => { if (d) state.index = d.months || []; });
      watch("orcamento", (d) => { if (d) state.budget = d.limits || {}; });
      watch("regras", (d) => { if (d) state.rules = d.rules || []; });
      watch("contas", (d) => { if (d) state.accounts = d.items || []; });
      watchMonth(state.month);
      ensureRecentMonths();
    }
    watch("objetivos", (d) => { state.goals = d?.text || ""; if (document.activeElement !== $("goals")) $("goals").value = state.goals; });
    watch("revisoes", (d) => { state.reviews = d?.items || []; });
    watch("ideias", (d) => { state.ideas = d?.items || []; });
    watch("pensar", (d) => { state.notes = d?.items || []; });
    watch("rascunhos", (d) => { state.drafts = d?.items || []; });
    watch("lingua", (d) => { state.errors = d?.items || []; });
    watch("voz", (d) => { if (d) state.voice = { amostras: d.amostras || [], perfil: d.perfil || "", confirmado: !!d.confirmado }; });
    watch("foco", (d) => { state.blocks = d?.days || {}; });
    watch("carreira", (d) => { if (d) { state.jobs = d.items || []; state.jobsExample = false; } });
    watch("cv", (d) => { state.cv = d?.markdown ? d : null; });
    watch("vagas-fora", (d) => { state.dropped = d?.items || []; });
    watch("cargos", (d) => { state.cargos = d?.items || []; });
    watch("conversas", (d) => { state.conversas = d?.items || []; });
    // Só leitura: as vagas são encontradas no computador e chegam com /sincronizar.
    watch("vagas", (d) => { state.found = d?.items || []; });
    // Agenda deixada pelo /hoje. Se houver conector, o calendário a sério substitui-a.
    watch("agenda", (d) => {
      if (agendaState.source === "calendar" || !d) return;
      setAgenda(eventsFromPayload(d.items), "hoje", d.updatedAt);
    });
    // Emails triados pelo /hoje no computador. O conector Gmail (se existir) substitui-os.
    watch("emails", (d) => {
      if (gmailState.source === "gmail") return;
      gmailState.items = d?.items || [];
      gmailState.updatedAt = d?.updatedAt || null;
      gmailState.source = "hoje";
      gmailState.index = 0;
    });
    renderAll();
  }

  const recentLoaded = new Set();
  async function ensureRecentMonths() {
    if (state.mode !== "cloud" || state.finExample) return;
    const want = [0, 1, 2, 3].map((k) => addMonths(state.month, -k)).filter((m) => state.index.includes(m) && m !== state.month && !recentLoaded.has(m));
    if (!want.length) return;
    const docs = await Promise.all(want.map((m) => loadDoc(`fin-${m}`)));
    want.forEach((m, i) => { recentLoaded.add(m); state.months[m] = { mov: docs[i]?.mov || [] }; });
    renderView("mes");
  }

  // =========================================================== Claude
  let sampleFn = null;
  const SAFE = [
    "REGRAS GERAIS (cumpre sempre):",
    "- Responde em português europeu, de forma breve e prática.",
    "- Não inventes factos, números, datas, leis, estudos ou fontes. Não tens acesso à internet.",
    "- Se algo depender de informação atual ou verificável (taxas, impostos, preços, estatísticas, notícias), escreve [Não verificado] e diz onde confirmar.",
    "- Separa o que é facto, o que é opinião e o que é sugestão. Se não souberes, diz que não sabes.",
    "- Fica no tema pedido. Não tragas outros assuntos.",
  ].join("\n");
  function sampleError(code) {
    if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed"].includes(code)) return "O Claude não está disponível nesta conta ou não foi autorizado nesta página.";
    if (code === "rate_limited") return "Muitos pedidos ou limite de utilização atingido. Tenta mais tarde.";
    if (code === "session_expired") return "A sessão expirou. Volta a entrar no Claude.";
    if (code === "invalid_json" || code === "empty_completion") return "A resposta veio num formato inesperado. Tenta outra vez.";
    if (code === "prompt_too_large") return "O texto é demasiado longo. Envia por partes.";
    if (code === "refused") return "O Claude não quis responder a este pedido.";
    if (code === "cancelled") return "Parado.";
    return "Não foi possível responder agora. Tenta outra vez.";
  }
  /** Corre um pedido ao Claude ligado a um botão, um botão Parar e uma nota de estado. */
  async function runAI({ go, stop, note, work }) {
    if (!sampleFn) { note.textContent = "Esta função só funciona dentro do Claude."; return; }
    const ctl = new AbortController();
    const onStop = () => ctl.abort();
    go.disabled = true; stop.hidden = false; stop.addEventListener("click", onStop, { once: true });
    // "A pensar": anel a rodar, reticências animadas e, ao fim de 12 s, um aviso de paciência.
    note.classList.add("thinking");
    note.textContent = "A pensar";
    const paciencia = setTimeout(() => { if (note.classList.contains("thinking")) note.textContent = "A pensar (as respostas do teu computador demoram uns segundos)"; }, 12000);
    try {
      await work(ctl.signal);
      note.textContent = "";
    } catch (e) {
      // No painel local, os erros chegam sem código mas com o motivo escrito: mostra-o.
      if (e?.name === "AbortError") note.textContent = "Parado.";
      else if (LOCAL_TOKEN && e instanceof TypeError && /fetch|network/i.test(e.message)) note.textContent = "O painel local não está a responder. Abre o Rumo outra vez e repete.";
      else note.textContent = !e?.code && e?.message ? `${e.message.replace(/\.?$/, ".")} Tenta outra vez.` : sampleError(e?.code);
    } finally {
      clearTimeout(paciencia);
      note.classList.remove("thinking");
      go.disabled = false; stop.hidden = true; stop.removeEventListener("click", onStop);
    }
  }
  /**
   * Corre uma ação de botão a mostrar que está a trabalhar: anel a rodar, clique desligado,
   * e no fim uma linha a dizer o que aconteceu. Nunca fica preso: o erro também é mostrado.
   */
  async function comSpinner(btn, note, tarefa, { minimo = 450, aCorrer = "a atualizar…" } = {}) {
    if (btn.classList.contains("loading")) return;
    const inicio = Date.now();
    btn.classList.add("loading");
    btn.disabled = true;
    if (note) note.textContent = aCorrer;
    try {
      const resultado = await tarefa();
      if (note) note.textContent = typeof resultado === "string" ? resultado : "";
    } catch (e) {
      if (note) note.textContent = e?.message || "Não foi possível atualizar.";
    } finally {
      const falta = minimo - (Date.now() - inicio);
      if (falta > 0) await new Promise((r) => setTimeout(r, falta));
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }

  function opts(o) {
    const out = {};
    for (const [k, v] of Object.entries(o)) if (v !== undefined) out[k] = v;
    // A escolha dele manda: no claude.ai o `sample` só aceita tiers, no painel local vai o alias.
    const escolha = MODELOS.find((m) => m.id === modelo);
    if (escolha?.tier) out.modelTier = escolha.tier;
    return out;
  }

  // ---------- opções: que modelo do Claude usar ----------
  const MODELOS = [
    { id: "auto", nome: "Automático", sub: "O Rumo escolhe conforme a tarefa. Recomendado.", tier: null, cli: "" },
    { id: "haiku", nome: "Haiku", sub: "O mais rápido e o mais barato; para tarefas simples.", tier: "quick", cli: "haiku" },
    { id: "sonnet", nome: "Sonnet", sub: "Equilíbrio entre rapidez e qualidade.", tier: "default", cli: "sonnet" },
    { id: "opus", nome: "Opus", sub: "O mais capaz; mais lento e gasta mais utilização.", tier: "complex", cli: "opus" },
  ];
  const MODELO_KEY = "rumo-modelo-v1";
  let modelo = "auto";
  try { modelo = MODELOS.some((m) => m.id === localStorage.getItem(MODELO_KEY)) ? localStorage.getItem(MODELO_KEY) : "auto"; } catch { /* sem armazenamento */ }
  function renderModelos() {
    $("model-options").replaceChildren(...MODELOS.map((m) => h("label", { class: "opt" },
      h("input", {
        type: "radio", name: "modelo", value: m.id, checked: m.id === modelo,
        onchange: () => {
          modelo = m.id;
          try { localStorage.setItem(MODELO_KEY, modelo); } catch { /* sem armazenamento */ }
          renderModelos();
        },
      }),
      h("span", {}, h("span", { text: m.nome }), h("span", { class: "sub", text: m.sub })),
    )));
    $("model-note").textContent = modelo === "auto"
      ? "Aplica-se a Investir, Pensar, Corretor, Escrita e CV."
      : `Todas as respostas passam a usar o ${MODELOS.find((m) => m.id === modelo).nome}.`;
  }
  renderModelos();
  // Fecha o menu ao clicar fora ou com Esc.
  document.addEventListener("click", (e) => { if (!$("gear").contains(e.target)) $("gear").open = false; });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") $("gear").open = false; });

  // =========================================================== HOJE
  const openTasks = () => state.tasks.filter((t) => !t.feita && !t.inbox);
  function ranked() {
    const key = (t) => [t.p, t.due && t.due <= TODAY ? 0 : 1, t.due || "9999", -(t.adiada || 0)];
    return openTasks().filter((t) => !t.algumDia).sort((a, b) => {
      const x = key(a), y = key(b);
      for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
      return 0;
    });
  }
  function mutateTasks(fn) { fn(state.tasks); saveTasks(); renderAll(); }
  const findTask = (id) => state.tasks.find((x) => x.id === id);
  function markDone(id) {
    mutateTasks((list) => {
      const t = list.find((x) => x.id === id); if (!t) return;
      t.feita = TODAY;
      if (t.rep) list.push({ ...t, id: newId(), feita: null, adiada: 0, due: nextDate(t.due || TODAY, t.rep) });
    });
  }
  const undoDone = (id) => mutateTasks(() => { const t = findTask(id); if (t) t.feita = null; });
  const postpone = (id, to) => mutateTasks(() => { const t = findTask(id); if (t) { t.adiada = (t.adiada || 0) + 1; t.due = to || addDays(TODAY, 1); } });
  const toSomeday = (id) => mutateTasks(() => { const t = findTask(id); if (t) { t.inbox = false; t.algumDia = true; t.due = ""; } });
  const promote = (id) => mutateTasks(() => { const t = findTask(id); if (t) { t.inbox = false; t.algumDia = false; } });
  function removeTask(id) {
    const t = findTask(id);
    if (t && confirm(`Apagar "${t.t}"?`)) mutateTasks((list) => list.splice(list.indexOf(t), 1));
  }

  function chips(t) {
    const out = [];
    if (t.due && !t.feita) {
      const late = daysBetween(t.due, TODAY);
      if (late > 0) out.push(h("span", { class: "chip late", text: `atrasada ${late} dia${late > 1 ? "s" : ""}` }));
      else if (late === 0) out.push(h("span", { class: "chip today", text: "hoje" }));
      else out.push(h("span", { class: "chip", text: `prazo ${shortDate(t.due)}` }));
    }
    if (t.p === 1) out.push(h("span", { class: "chip", text: "alta" }));
    if (t.rep) out.push(h("span", { class: "chip", text: { diaria: "diária", semanal: "semanal", mensal: "mensal", anual: "anual" }[t.rep] }));
    if (t.algumDia) out.push(h("span", { class: "chip", text: "algum dia" }));
    if (t.adiada >= 3 && !t.feita) out.push(h("span", { class: "chip chronic", text: `adiada ${t.adiada}×` }));
    else if (t.adiada && !t.feita) out.push(h("span", { class: "chip", text: `adiada ${t.adiada}×` }));
    if (t.feita) out.push(h("span", { class: "chip", text: `feita ${shortDate(t.feita)}` }));
    return out;
  }

  function renderHoje() {
    $("tasks-example").hidden = !state.tasksExample;
    const top = ranked().slice(0, 3);
    $("focus-list").replaceChildren(...(top.length ? top.map((t, i) => h("li", { class: "focus-item" },
      h("span", { class: "rank", "aria-hidden": "true", text: String(i + 1) }),
      h("div", {}, h("div", { class: "title", text: t.t }), h("div", { class: "meta" }, chips(t))),
      h("div", { class: "actions" },
        h("button", { class: "btn small accent", text: "Foco", title: "Arrancar um bloco de foco nesta tarefa", onclick: () => openFocus(t.id) }),
        h("button", { class: "btn small", text: "Feita", onclick: () => markDone(t.id) }),
        h("button", { class: "btn small ghost", text: "Amanhã", onclick: () => postpone(t.id) }),
      ),
    )) : [h("li", { class: "banner plain", text: "Sem tarefas por fazer. Acrescenta uma em \"Nova tarefa\"." })]));

    const late = openTasks().filter((t) => t.due && t.due < TODAY).length;
    const doneToday = state.tasks.filter((t) => t.feita === TODAY).length;
    $("focus-summary").textContent = [doneToday ? `${doneToday} feita${doneToday > 1 ? "s" : ""} hoje` : "", late ? `${late} atrasada${late > 1 ? "s" : ""}` : ""].filter(Boolean).join(" · ");

    const inbox = state.tasks.filter((t) => t.inbox && !t.feita);
    $("inbox-count").textContent = `${inbox.length} tarefa${inbox.length === 1 ? "" : "s"}`;
    $("inbox-list").replaceChildren(...(inbox.length ? inbox.map((t) => h("li", { class: "task" },
      h("span", {}), h("span", { class: "title", text: t.t }),
      h("span", { class: "actions" },
        h("button", { class: "btn small", text: "Tarefa", onclick: () => promote(t.id) }),
        h("button", { class: "btn small ghost", text: "Algum dia", onclick: () => toSomeday(t.id) }),
        h("button", { class: "btn small ghost", text: "Apagar", onclick: () => removeTask(t.id) }),
      ),
    )) : [h("li", { class: "muted", text: "Vazia." })]));

    const all = [...ranked(), ...openTasks().filter((t) => t.algumDia),
      ...state.tasks.filter((t) => t.feita).sort((a, b) => b.feita.localeCompare(a.feita)).slice(0, 15)];
    $("all-count").textContent = openTasks().length;
    $("all-list").replaceChildren(...all.map((t) => h("li", { class: `task${t.feita ? " done" : ""}` },
      h("input", { type: "checkbox", class: "check", "aria-label": `Marcar "${t.t}" como feita`, checked: !!t.feita, onchange: (e) => (e.target.checked ? markDone(t.id) : undoDone(t.id)) }),
      h("div", {}, h("div", { class: "title", text: t.t }), h("div", { class: "meta" }, chips(t))),
      h("span", { class: "actions" },
        t.feita ? null : t.algumDia ? h("button", { class: "btn small ghost", text: "Ativar", onclick: () => promote(t.id) }) : h("button", { class: "btn small ghost", text: "Amanhã", onclick: () => postpone(t.id) }),
        h("button", { class: "btn small ghost", text: "Apagar", onclick: () => removeTask(t.id) }),
      ),
    )));
  }

  function safeMailUrl(value) {
    try { const u = new URL(value); return u.protocol === "https:" && u.hostname === "mail.google.com" ? u.href : ""; }
    catch { return ""; }
  }
  function emailToTask(item) {
    if (state.tasks.some((t) => t.gmailId === item.id)) { flash("Este email já está nas tarefas.", 2200); return; }
    if (state.tasksExample) {
      if (!confirm("Começar a tua lista e substituir as tarefas de exemplo?")) return;
      state.tasks = []; state.tasksExample = false;
    }
    const title = item.action || `Responder ao email «${item.subject}»`;
    mutateTasks((list) => list.push({
      id: newId(), t: title, p: 2, due: item.deadline || "", rep: "", adiada: 0, feita: null, inbox: true,
      gmailId: item.id, gmailUrl: safeMailUrl(item.url),
    }));
    flash("Email passado para a caixa de entrada.", 2200);
    renderGmail();
  }
  function renderGmail() {
    const items = gmailState.items.filter((it) => !gmailState.closed.has(it.id));
    const hiddenCount = gmailState.items.length - items.length;
    const has = items.length > 0;
    $("gmail-panel").hidden = !has;
    $("gmail-help").hidden = has || hiddenCount > 0;
    $("gmail-count").hidden = !has;
    $("gmail-hidden").hidden = hiddenCount === 0;
    if (hiddenCount) {
      $("gmail-hidden").replaceChildren(
        `${hiddenCount} email${hiddenCount === 1 ? "" : "s"} fechado${hiddenCount === 1 ? "" : "s"}. `,
        h("button", { class: "btn small ghost", type: "button", text: "Mostrar outra vez", onclick: () => { gmailState.closed.clear(); saveClosedEmails(); renderGmail(); } }),
      );
    }
    if (!has) return;
    gmailState.index = ((gmailState.index % items.length) + items.length) % items.length;
    const item = items[gmailState.index];
    $("gmail-count").textContent = `${items.length} email${items.length === 1 ? "" : "s"}`;
    $("gmail-from").textContent = item.from || "Remetente desconhecido";
    $("gmail-date").textContent = /^\d{4}-\d{2}-\d{2}$/.test(item.date || "") ? shortDate(item.date) : (item.date || "");
    $("gmail-subject").textContent = item.subject || "Sem assunto";
    $("gmail-action").textContent = item.action || "Rever este email.";
    $("gmail-deadline").hidden = !item.deadline;
    $("gmail-deadline").textContent = item.deadline ? `Prazo indicado: ${shortDate(item.deadline)}` : "";
    $("gmail-position").textContent = `${gmailState.index + 1} de ${items.length}`;
    $("gmail-prev").disabled = items.length < 2;
    $("gmail-next").disabled = items.length < 2;
    const link = safeMailUrl(item.url);
    const exists = state.tasks.some((t) => t.gmailId === item.id);
    $("gmail-actions").replaceChildren(
      link ? h("a", { class: "btn small", href: link, target: "_blank", rel: "noopener noreferrer", text: "Abrir no Gmail" }) : null,
      h("button", { class: "btn small accent", type: "button", disabled: exists, text: exists ? "Já está nas tarefas" : "Passar para tarefas", onclick: () => emailToTask(item) }),
    );
    let updated = gmailState.updatedAt;
    try { updated = updated ? new Date(updated).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : ""; } catch { /* usa o texto original */ }
    $("gmail-updated").textContent = updated ? `Atualizado pelo /hoje em ${updated}.` : "Atualizado pelo comando /hoje.";
    const card = $("gmail-card");
    card.classList.remove("entering");
    void card.offsetWidth; // reinicia a animação ao trocar de email
    card.classList.add("entering");
  }
  $("gmail-prev").addEventListener("click", () => { gmailState.index--; renderGmail(); });
  $("gmail-next").addEventListener("click", () => { gmailState.index++; renderGmail(); });
  // ---------- Gmail pelo conector da conta (opcional; a página só lê) ----------
  const GMAIL_SERVER = "Gmail";
  const GMAIL_QUERY = "is:unread in:inbox newer_than:7d -category:promotions -category:social -category:forums";
  let mcpNs = null;

  function gmailErrorText(code, message) {
    switch (code) {
      case "server_not_connected": return "Liga o Gmail em Definições → Conectores, no claude.ai.";
      case "needs_reauth": return "A ligação ao Gmail expirou. Liga-a outra vez em Definições → Conectores.";
      case "selection_required": return "Tens mais do que um Gmail ligado. Escolhe qual, quando o Claude perguntar.";
      case "not_in_manifest": return "Esta página não tem acesso ao teu Gmail. Podes permitir quando for pedido.";
      case "blocked_by_policy": case "approval_required": return "A tua organização não permite este acesso ao Gmail aqui.";
      case "server_unavailable": case "rate_limited": return "O Gmail não respondeu. Tenta daqui a pouco.";
      case "not_granted": case "capability_disabled": case "capability_removed": return "Esta janela não pode falar com os conectores.";
      case "consent_required": return "Falta autorizares o Gmail para esta página.";
      default: return message || "Não foi possível falar com o Gmail.";
    }
  }
  /** Um email da resposta do conector → item do carrossel. Só metadados, nunca o corpo. */
  function threadToItem(thread) {
    const msg = (thread.messages || [])[0];
    if (!msg) return null;
    const sender = msg.sender || "";
    const name = sender.includes("<") ? sender.split("<")[0].trim() : sender;
    return {
      id: msg.id || thread.id,
      from: name || sender || "Remetente desconhecido",
      subject: msg.subject || "Sem assunto",
      date: (msg.date || "").slice(0, 10),
      action: "Ver o que este email pede.",
      deadline: "",
      url: `https://mail.google.com/mail/u/0/#inbox/${encodeURIComponent(thread.id || msg.id || "")}`,
    };
  }
  async function fetchGmail() {
    if (!mcpNs) return;
    const note = $("gmail-connector-note");
    $("gmail-fetch").classList.add("loading");
    $("gmail-fetch").disabled = true;
    note.textContent = "a procurar no Gmail…";
    try {
      const res = await mcpNs.callTool(GMAIL_SERVER, "search_threads", { query: GMAIL_QUERY, pageSize: 10 }, { cache: { staleTime: 60000 } });
      const payload = res && res.payload;
      const threads = payload && Array.isArray(payload.threads) ? payload.threads : [];
      const items = threads.map(threadToItem).filter(Boolean).slice(0, 10);
      gmailState.items = items;
      gmailState.source = "gmail";
      gmailState.updatedAt = res?.cache?.storedAt ? new Date(res.cache.storedAt).toISOString() : new Date().toISOString();
      gmailState.index = 0;
      renderGmail();
      note.textContent = items.length ? "" : "Sem emails por ler nos últimos 7 dias.";
      if (items.length) {
        $("inbox-panel").open = true;
        if (state.mode === "cloud") save("emails", { updatedAt: gmailState.updatedAt, items });
      }
    } catch (e) {
      note.textContent = gmailErrorText(e && e.code, e && e.message);
    } finally {
      $("gmail-fetch").classList.remove("loading");
      $("gmail-fetch").disabled = false;
    }
  }
  $("gmail-fetch").addEventListener("click", fetchGmail);

  // ---------- Agenda: Google Calendar pelo conector, ou a lista que o /hoje deixou ----------
  const CAL_SERVER = "Google Calendar";
  const agendaState = { events: [], updatedAt: null, source: "" };
  const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "Europe/Lisbon"; } })();

  const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  /** Aceita as formas habituais da resposta do conector e devolve sempre os mesmos campos. */
  function eventsFromPayload(payload) {
    const list = Array.isArray(payload) ? payload
      : Array.isArray(payload?.events) ? payload.events
      : Array.isArray(payload?.items) ? payload.items
      : Array.isArray(payload?.data) ? payload.data : [];
    return list.map((ev, i) => {
      const edge = (v) => (typeof v === "string" ? v : v?.dateTime || v?.date || v?.datetime || "");
      const inicio = edge(ev.start ?? ev.startTime);
      const fim = edge(ev.end ?? ev.endTime);
      return {
        id: String(ev.id || ev.eventId || `ev-${i}`),
        titulo: String(ev.summary || ev.title || ev.subject || "(sem título)"),
        inicio,
        fim,
        // Uma data sem horas ("2026-09-18") é um evento de dia inteiro.
        diaInteiro: /^\d{4}-\d{2}-\d{2}$/.test(inicio),
        local: String(ev.location || ev.place || ""),
        url: String(ev.htmlLink || ev.url || ev.link || ""),
      };
    }).filter((ev) => ev.inicio).sort((a, b) => a.inicio.localeCompare(b.inicio));
  }
  const evDay = (ev) => (ev.diaInteiro ? ev.inicio : iso(new Date(ev.inicio)));
  function evWhen(ev) {
    if (ev.diaInteiro) return "todo o dia";
    const a = new Date(ev.inicio);
    const b = ev.fim ? new Date(ev.fim) : null;
    return b && iso(b) === iso(a) ? `${hhmm(a)}–${hhmm(b)}` : hhmm(a);
  }
  const evNow = (ev) => {
    if (ev.diaInteiro || !ev.fim) return false;
    const now = Date.now();
    return new Date(ev.inicio).getTime() <= now && now < new Date(ev.fim).getTime();
  };
  const safeCalUrl = (v) => { try { const u = new URL(v); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } };

  function renderAgendaHoje() {
    const hoje = agendaState.events.filter((ev) => evDay(ev) === TODAY);
    $("agenda-hoje-count").hidden = !hoje.length;
    $("agenda-hoje-count").textContent = `${hoje.length} ${hoje.length === 1 ? "compromisso" : "compromissos"}`;
    $("agenda-hoje").replaceChildren(...(hoje.length ? hoje.map((ev) => {
      const link = safeCalUrl(ev.url);
      return h("li", { class: evNow(ev) ? "now" : "" },
        h("span", { class: "when", text: evWhen(ev) }),
        h("div", {},
          link ? h("a", { class: "job-link", href: link, target: "_blank", rel: "noopener noreferrer", text: ev.titulo })
            : h("span", { class: "title", text: ev.titulo }),
          ev.local ? h("div", { class: "muted small", text: ev.local }) : null),
      );
    }) : [h("li", {}, h("span", {}), h("span", { class: "muted", text: "Nada marcado para hoje." }))]));
  }
  // A semana é sempre de segunda a domingo: a grelha não muda de forma conforme o dia.
  const segundaDe = (d) => addDays(d, -((new Date(`${d}T12:00:00`).getDay() + 6) % 7));
  const SEMANA = [0, 1, 2, 3, 4, 5, 6].map((k) => addDays(segundaDe(TODAY), k));

  function renderAgendaSemana() {
    const dias = SEMANA;
    const nome = (d) => new Intl.DateTimeFormat("pt-PT", { weekday: "short" }).format(new Date(`${d}T12:00:00`)).replace(".", "");
    $("agenda-semana").replaceChildren(...dias.map((d) => {
      const doDia = agendaState.events.filter((ev) => evDay(ev) === d);
      return h("div", { class: `week-day${d === TODAY ? " today" : ""}` },
        h("h4", { text: `${nome(d)} ${d.slice(8)}` }),
        ...(doDia.length ? doDia.slice(0, 4).map((ev) => h("div", { class: "week-ev" },
          h("span", { class: "when", text: ev.diaInteiro ? "dia " : `${evWhen(ev).slice(0, 5)} ` }), ev.titulo))
          : [h("span", { class: "muted small", text: "—" })]),
        doDia.length > 4 ? h("span", { class: "muted small", text: `+${doDia.length - 4}` }) : null);
    }));
    const total = agendaState.events.filter((ev) => evDay(ev) >= SEMANA[0] && evDay(ev) <= SEMANA[6]).length;
    $("agenda-semana-sub").textContent = `${shortDate(SEMANA[0])} a ${shortDate(SEMANA[6])}${total ? ` · ${total} ${total === 1 ? "compromisso" : "compromissos"}` : ""}`;
  }
  function agendaNote() {
    const fonte = agendaState.source === "calendar" ? "Google Calendar" : agendaState.source === "hoje" ? "do /hoje" : "";
    if (!fonte) return "";
    let quando = "";
    try { quando = agendaState.updatedAt ? new Date(agendaState.updatedAt).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : ""; } catch { /* data estranha */ }
    return `Agenda ${fonte}${quando ? ` · atualizada em ${quando}` : ""}.`;
  }
  function renderAgenda() {
    renderAgendaHoje();
    renderAgendaSemana();
    const note = agendaNote();
    if (note) { $("agenda-note").textContent = note; $("agenda-semana-note").textContent = note; }
  }
  function setAgenda(events, source, updatedAt) {
    agendaState.events = events;
    agendaState.source = source;
    agendaState.updatedAt = updatedAt || new Date().toISOString();
    renderAgenda();
  }
  async function fetchAgenda({ silent = false, btn = $("agenda-refresh"), note = $("agenda-note") } = {}) {
    if (!mcpNs) return;
    if (!silent) { btn.classList.add("loading"); btn.disabled = true; note.textContent = "a ler o calendário…"; }
    try {
      const res = await mcpNs.callTool(CAL_SERVER, "list_events", {
        // Segunda desta semana até à segunda seguinte: é o que a grelha mostra.
        startTime: `${SEMANA[0]}T00:00:00`,
        endTime: `${addDays(SEMANA[6], 1)}T00:00:00`,
        orderBy: "startTime",
        pageSize: 50,
        timeZone: TZ,
      }, { cache: { staleTime: 120000 } });
      const events = eventsFromPayload(res && res.payload);
      setAgenda(events, "calendar", res?.cache?.storedAt ? new Date(res.cache.storedAt).toISOString() : null);
      if (state.mode === "cloud") save("agenda", { updatedAt: agendaState.updatedAt, items: events });
    } catch (e) {
      // Os códigos são os mesmos do Gmail: a mensagem diz o que fazer em cada caso.
      note.textContent = gmailErrorText(e && e.code, e && e.message).replace("Gmail", "Google Calendar");
    } finally {
      btn.classList.remove("loading");
      btn.disabled = false;
    }
  }
  /**
   * No painel local, o computador vai ao Google (só leitura) e atualiza os ficheiros da agenda
   * e dos emails; depois a página relê-os. Demora uns 20 s: é o Claude Code a ler os dois.
   */
  async function lerGoogleLocal() {
    await localRequest("/api/google", { method: "POST" });
    await Promise.all([loadLocalAgenda(), loadLocalEmails()]);
  }
  // Com conector, relê o Google Calendar; no painel local, pede ao computador que o leia.
  // O mesmo botão existe no dia (separador Hoje) e na semana (separador Semana).
  function atualizarAgenda(btn, note) {
    if (mcpNs) return fetchAgenda({ btn, note });
    return comSpinner(btn, note, async () => {
      if (!LOCAL_TOKEN) return "Sem calendário ligado aqui. Abre o Rumo no computador ou no claude.ai.";
      await lerGoogleLocal();
      const n = agendaState.events.length;
      return n === 0 ? "Sem eventos esta semana." : `Agenda atualizada: ${n} ${n === 1 ? "evento" : "eventos"} esta semana.`;
    });
  }
  $("agenda-refresh").addEventListener("click", () => atualizarAgenda($("agenda-refresh"), $("agenda-note")));
  $("agenda-semana-refresh").addEventListener("click", () => atualizarAgenda($("agenda-semana-refresh"), $("agenda-semana-note")));

  $("gmail-close").addEventListener("click", () => {
    const item = gmailState.items.filter((it) => !gmailState.closed.has(it.id))[gmailState.index];
    if (!item) return;
    gmailState.closed.add(item.id);
    saveClosedEmails();
    renderGmail();
    flash("Email fechado. Podes mostrá-lo outra vez logo abaixo.", 2600);
  });

  $("tasks-start").addEventListener("click", () => { state.tasks = []; state.tasksExample = false; saveTasks(); renderAll(); });
  $("capture-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const v = $("capture-input").value.trim(); if (!v) return;
    mutateTasks((list) => list.push({ id: newId(), t: v, p: 2, due: "", rep: "", adiada: 0, feita: null, inbox: true }));
    $("capture-input").value = "";
    flash(state.tasksExample ? "Apontado no exemplo. Carrega em \"Começar a minha lista\" para guardar." : "Apontado na caixa de entrada. Volta ao que estavas a fazer.", 2500);
  });
  $("task-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = $("task-title").value.trim(); if (!t) return;
    const rep = $("task-rep").value;
    mutateTasks((list) => list.push({ id: newId(), t, p: Number($("task-prio").value), due: $("task-due").value || (rep ? TODAY : ""), rep, adiada: 0, feita: null, inbox: false }));
    e.target.reset();
  });

  // =========================================================== FOCO
  const R = 52, CIRC = 2 * Math.PI * R;
  const ring = $("ring-progress");
  ring.setAttribute("stroke-dasharray", CIRC.toFixed(2));
  const timer = { minutes: 25, end: 0, running: false, tick: null, taskId: "" };
  let audio = null;

  function renderFocusSelect() {
    const sel = $("focus-task");
    const list = ranked();
    const cur = timer.taskId || sel.value;
    sel.replaceChildren(h("option", { value: "", text: "Escolhe a tarefa…" }), ...list.map((t) => h("option", { value: t.id, text: t.t })));
    if (list.some((t) => t.id === cur)) sel.value = cur;
  }
  function renderFoco() {
    const n = state.blocks[TODAY] || 0;
    $("blocks-today").textContent = n ? `${n} bloco${n > 1 ? "s" : ""} de foco hoje${n >= 4 ? " · está na hora de uma pausa longa" : ""}` : "";
  }
  function paintClock(left, total) {
    const s = Math.max(0, Math.round(left / 1000));
    $("clock").textContent = `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
    ring.setAttribute("stroke-dashoffset", (CIRC * (1 - left / total)).toFixed(2));
  }
  function setPreset(min) {
    if (timer.running) return;
    timer.minutes = min;
    document.querySelectorAll(".presets .btn").forEach((x) => x.setAttribute("aria-pressed", String(Number(x.dataset.min) === min)));
    paintClock(min * 60000, min * 60000);
  }
  function openFocus(id) {
    timer.taskId = id;
    selectTab("foco");
    $("focus-task").value = id;
    $("focus-step").focus();
  }
  document.querySelectorAll(".presets .btn").forEach((b) => b.addEventListener("click", () => setPreset(Number(b.dataset.min))));
  function beep() {
    try {
      if (!audio) return;
      const now = audio.currentTime;
      [0, 0.35, 0.7].forEach((t) => {
        const o = audio.createOscillator(), g = audio.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(audio.destination);
        g.gain.setValueAtTime(0.0001, now + t); g.gain.exponentialRampToValueAtTime(0.25, now + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.25);
        o.start(now + t); o.stop(now + t + 0.3);
      });
    } catch { /* sem som */ }
  }
  function stopTimer(finished) {
    clearInterval(timer.tick); timer.running = false;
    $("timer-start").hidden = false; $("timer-stop").hidden = true; $("focus-dot").hidden = true;
    const task = findTask(timer.taskId);
    const msg = $("focus-end-msg");
    if (finished) {
      paintClock(0, 1);
      $("clock-caption").textContent = "bloco terminado";
      state.blocks[TODAY] = (state.blocks[TODAY] || 0) + 1; saveBlocks();
      msg.hidden = false;
      msg.replaceChildren(...[
        h("strong", { text: "Pausa de 5 minutos. " }),
        task ? h("span", { text: `Acabaste "${task.t}"? ` }) : null,
        task && !task.feita ? h("button", { class: "btn small", text: "Sim, está feita", onclick: () => { markDone(task.id); msg.hidden = true; } }) : null,
      ].filter(Boolean));
      document.title = "⏰ Pausa · Rumo";
      beep(); renderFoco();
    } else {
      paintClock(timer.minutes * 60000, timer.minutes * 60000);
      $("clock-caption").textContent = "pronto a começar";
      document.title = "Rumo";
    }
  }
  $("timer-start").addEventListener("click", () => {
    timer.taskId = $("focus-task").value;
    try { audio = audio || new (window.AudioContext || window.webkitAudioContext)(); } catch { audio = null; }
    const total = timer.minutes * 60000;
    timer.end = Date.now() + total; timer.running = true;
    $("timer-start").hidden = true; $("timer-stop").hidden = false; $("focus-dot").hidden = false; $("focus-end-msg").hidden = true;
    const task = findTask(timer.taskId);
    const step = $("focus-step").value.trim();
    $("clock-caption").textContent = step ? `1.º passo: ${step}` : task ? task.t : "a focar";
    document.title = "Em foco · Rumo";
    const tick = () => { const left = timer.end - Date.now(); if (left <= 0) stopTimer(true); else paintClock(left, total); };
    tick(); timer.tick = setInterval(tick, 1000);
  });
  $("timer-stop").addEventListener("click", () => stopTimer(false));
  $("focus-task").addEventListener("change", (e) => { timer.taskId = e.target.value; });

  // =========================================================== SEMANA
  const picked = new Set();
  function renderSemana() {
    const from = addDays(TODAY, -6);
    const done = state.tasks.filter((t) => t.feita && t.feita >= from && t.feita <= TODAY).sort((a, b) => b.feita.localeCompare(a.feita));
    const late = openTasks().filter((t) => t.due && t.due < TODAY && !t.algumDia);
    const postponed = openTasks().filter((t) => (t.adiada || 0) >= 2 && !late.includes(t) && !t.algumDia).sort((a, b) => b.adiada - a.adiada).slice(0, 5);
    const inbox = state.tasks.filter((t) => t.inbox && !t.feita);
    $("w-done").textContent = done.length; $("w-late").textContent = late.length; $("w-inbox").textContent = inbox.length;

    $("w-done-list").replaceChildren(...(done.length ? done.map((t) => h("li", { class: "task done" }, h("span", {}), h("span", { class: "title", text: t.t }), h("span", { class: "chip", text: shortDate(t.feita) })))
      : [h("li", { class: "muted", text: "Nada marcado como feito nos últimos 7 dias." })]));

    const clean = [...late, ...postponed];
    $("w-clean-list").replaceChildren(...(clean.length ? clean.map((t) => {
      const date = h("input", { type: "date", "aria-label": `Nova data para ${t.t}`, value: addDays(TODAY, 1) });
      return h("li", { class: "task" }, h("span", {}),
        h("div", {}, h("div", { class: "title", text: t.t }), h("div", { class: "meta" }, chips(t))),
        h("span", { class: "actions" }, date,
          h("button", { class: "btn small", text: "Mudar data", onclick: () => postpone(t.id, date.value || addDays(TODAY, 1)) }),
          h("button", { class: "btn small ghost", text: "Algum dia", onclick: () => toSomeday(t.id) }),
          h("button", { class: "btn small ghost", text: "Apagar", onclick: () => removeTask(t.id) })));
    }) : [h("li", { class: "muted", text: "Nada para limpar." })]));
    if (inbox.length) $("w-clean-list").append(h("li", { class: "task" }, h("span", {}), h("span", { class: "muted", text: `${inbox.length} por triar na caixa de entrada.` }), h("button", { class: "btn small", text: "Ir triar", onclick: () => { selectTab("hoje"); $("inbox-panel").open = true; } })));

    const candidates = openTasks().filter((t) => !t.algumDia);
    $("w-pick-list").replaceChildren(...(candidates.length ? candidates.map((t) => h("li", { class: "task" },
      h("input", { type: "checkbox", class: "check", "aria-label": `Prioridade da semana: ${t.t}`, checked: picked.has(t.id),
        onchange: (e) => {
          if (e.target.checked && picked.size >= 3) { e.target.checked = false; flash("No máximo 3 prioridades.", 2000); return; }
          e.target.checked ? picked.add(t.id) : picked.delete(t.id);
        } }),
      h("div", {}, h("div", { class: "title", text: t.t }), h("div", { class: "meta" }, chips(t))), h("span", {}),
    )) : [h("li", { class: "muted", text: "Sem tarefas abertas." })]));

    $("w-history").replaceChildren(...state.reviews.slice(0, 6).map((r) => h("li", { class: "task" }, h("span", { class: "chip", text: r.semana }),
      h("div", {}, h("div", { text: r.melhoria || "(sem melhoria)" }), h("div", { class: "muted small", text: `${r.feitas} feitas · ${r.atrasadas} atrasadas` })), h("span", {}))));
  }
  $("w-save").addEventListener("click", () => {
    if (picked.size) mutateTasks((list) => list.forEach((t) => { if (picked.has(t.id)) t.p = 1; }));
    const from = addDays(TODAY, -6);
    const entry = {
      semana: weekKey(TODAY), data: TODAY, melhoria: $("w-improve").value.trim(),
      feitas: state.tasks.filter((t) => t.feita && t.feita >= from).length,
      atrasadas: openTasks().filter((t) => t.due && t.due < TODAY).length,
    };
    state.reviews = [entry, ...state.reviews.filter((r) => r.semana !== entry.semana)];
    saveReviews(); picked.clear(); $("w-improve").value = "";
    flash("Revisão guardada. Boa semana.", 2500); renderSemana();
  });

  // =========================================================== FINANÇAS: dados
  let movKind = "out", movFilter = "", movTypeFilter = "all";
  const monthsKnown = () => [...new Set([...state.index, MONTH, state.month])].sort().reverse();
  const movOf = (m) => state.months[m]?.mov || [];
  function categorize(desc) { const d = fold(desc); return state.rules.find((r) => r.p && d.includes(fold(r.p)))?.cat || ""; }

  function summary(m) {
    const mov = movOf(m).filter((x) => fold(x.cat) !== fold(TRANSFER));
    const income = mov.filter((x) => x.v > 0).reduce((s, x) => s + x.v, 0);
    const spent = mov.filter((x) => x.v < 0).reduce((s, x) => s - x.v, 0);
    const byCat = {};
    for (const x of mov) if (x.v < 0) byCat[x.cat || "(sem categoria)"] = (byCat[x.cat || "(sem categoria)"] || 0) - x.v;
    const prev = [1, 2, 3].map((k) => addMonths(m, -k)).filter((pm) => state.months[pm]);
    const avg = (cat) => prev.length ? prev.reduce((s, pm) => s + movOf(pm).filter((x) => fold(x.cat || "(sem categoria)") === fold(cat) && x.v < 0 && fold(x.cat) !== fold(TRANSFER)).reduce((a, x) => a - x.v, 0), 0) / prev.length : null;
    const cats = [...new Set([...Object.keys(state.budget), ...Object.keys(byCat)])]
      .map((c) => ({ cat: c, spent: byCat[c] || 0, limit: Number(state.budget[c]) > 0 ? Number(state.budget[c]) : null, avg: avg(c) }))
      .sort((a, b) => (b.limit !== null) - (a.limit !== null) || b.spent - a.spent);
    const budgeted = cats.filter((c) => c.limit !== null);
    const limitSum = budgeted.reduce((s, c) => s + c.limit, 0);
    const left = limitSum - budgeted.reduce((s, c) => s + c.spent, 0);
    const [y, mo] = m.split("-").map(Number);
    const daysLeft = m === MONTH ? new Date(y, mo, 0).getDate() - Number(TODAY.slice(8)) + 1 : 0;
    const prevSpent = prev.length ? prev.reduce((total, pm) => total + movOf(pm).filter((x) => x.v < 0 && fold(x.cat) !== fold(TRANSFER)).reduce((a, x) => a - x.v, 0), 0) / prev.length : null;
    return { income, spent, balance: income - spent, cats, limitSum, left, daysLeft, prevSpent, count: mov.length };
  }
  function recurring(m) {
    const months = [0, 1, 2].map((k) => addMonths(m, -k)).filter((x) => state.months[x] && movOf(x).length);
    const norm = (d) => fold(d).replace(/\d+/g, " ").replace(/[^\p{L} ]/gu, " ").replace(/\s+/g, " ").trim();
    const groups = new Map();
    for (const mm of months) for (const x of movOf(mm)) {
      if (x.v >= 0 || fold(x.cat) === fold(TRANSFER)) continue;
      const k = norm(x.desc); if (!k) continue;
      const g = groups.get(k) || { label: x.desc, cat: x.cat, months: new Set(), total: 0 };
      g.months.add(mm); g.total -= x.v; groups.set(k, g);
    }
    return { months, items: [...groups.values()].filter((g) => g.months.size >= 2).map((g) => ({ ...g, monthly: g.total / g.months.size })).sort((a, b) => b.monthly - a.monthly) };
  }

  function addMovements(list) {
    const touched = new Set();
    for (const x of list) {
      const m = x.d.slice(0, 7);
      (state.months[m] ||= { mov: [] }).mov.push(x);
      touched.add(m);
      if (!state.index.includes(m)) state.index.push(m);
    }
    state.index.sort();
    touched.forEach(saveMonth);
    saveIndex();
    return touched;
  }

  // =========================================================== FINANÇAS: mês
  function fillCats() {
    const cats = movKind === "out" ? [...CATS_OUT, TRANSFER] : [...CATS_IN, TRANSFER];
    $("mov-cat").replaceChildren(h("option", { value: "", text: "Categoria (auto)" }), ...cats.map((c) => h("option", { value: c, text: c })));
  }
  segGroup("kind-seg", (v) => { movKind = v; fillCats(); });

  function renderMes() {
    $("fin-example").hidden = !state.finExample;
    const m = state.month;
    $("month-select").replaceChildren(...monthsKnown().map((mm) => h("option", { value: mm, text: monthLabel(mm) })));
    $("month-select").value = m;
    const s = summary(m);
    $("fin-days").textContent = m === MONTH ? `faltam ${s.daysLeft} dia${s.daysLeft > 1 ? "s" : ""}` : "mês fechado";
    $("k-in").textContent = money(s.income);
    $("k-out").textContent = money(s.spent);
    $("k-balance").textContent = money(s.balance);
    $("k-balance").className = `num${s.balance < 0 ? " neg-flag" : s.balance > 0 ? " pos" : ""}`;
    $("k-rate").textContent = s.income > 0 ? `taxa de poupança: ${Math.round((s.balance / s.income) * 100)}%` : "sem receitas registadas";
    $("k-out-sub").textContent = s.prevSpent === null ? "sem histórico para comparar"
      : s.prevSpent === 0 ? "sem despesas nos meses anteriores"
        : `${s.spent <= s.prevSpent ? "↓" : "↑"} ${Math.abs(Math.round(((s.spent - s.prevSpent) / s.prevSpent) * 100))}% face à média recente`;
    if (s.limitSum > 0) {
      $("k-left").textContent = s.left >= 0 ? money(s.left) : `${money(-s.left)} acima`;
      $("k-perday").textContent = m !== MONTH ? "no fim do mês" : s.left > 0 ? `≈ ${money(s.left / s.daysLeft)} por dia` : "orçamento ultrapassado";
    } else { $("k-left").textContent = "—"; $("k-perday").textContent = "define limites abaixo"; }

    const allRows = [...movOf(m)].sort((a, b) => b.d.localeCompare(a.d));
    const uncat = allRows.filter((x) => !x.cat).length;
    $("fin-review-count").textContent = uncat;
    $("fin-review").disabled = !uncat;

    const health = $("fin-health"), healthAction = $("fin-health-action");
    let healthState = "", healthMark = "✓", healthTitle = "O mês está organizado", healthText = "Não há tarefas financeiras urgentes neste mês.", action = null;
    if (!allRows.length) {
      healthState = "warn"; healthMark = "1"; healthTitle = "Começa por trazer os movimentos";
      healthText = "Regista uma despesa à mão ou importa o CSV do banco para veres um resumo real.";
      action = ["Importar extrato", () => openFinancePanel("imp-panel", "imp-file")];
    } else if (uncat) {
      healthState = "warn"; healthMark = "!"; healthTitle = `${uncat} movimento${uncat === 1 ? " precisa" : "s precisam"} de categoria`;
      healthText = "Categorizar melhora o orçamento e permite reconhecer automaticamente movimentos futuros.";
      action = ["Rever agora", showUncategorized];
    } else if (!s.limitSum) {
      healthState = "warn"; healthMark = "2"; healthTitle = "Define os teus limites mensais";
      healthText = "Sem orçamento, o Rumo mostra o que gastaste mas não consegue dizer quanto ainda está disponível.";
      action = ["Definir limites", () => { $("budget-panel").scrollIntoView({ behavior: "smooth", block: "start" }); $("budget").querySelector("input, select")?.focus(); }];
    } else if (s.left < 0) {
      healthState = "bad"; healthMark = "!"; healthTitle = `Orçamento ultrapassado em ${money(-s.left)}`;
      healthText = "Vê as categorias a vermelho e confirma se o limite ainda faz sentido.";
      action = ["Ver orçamento", () => $("budget-panel").scrollIntoView({ behavior: "smooth", block: "start" })];
    } else if (s.balance < 0) {
      healthState = "bad"; healthMark = "!"; healthTitle = `Saíram mais ${money(-s.balance)} do que entraram`;
      healthText = "Confirma se faltam receitas ou se este foi um mês excecional.";
      action = ["Ver movimentos", () => openFinancePanel("mov-panel", "mov-filter")];
    } else {
      healthText = s.limitSum ? `Tens ${money(s.left)} disponível nas categorias com limite e um saldo mensal de ${money(s.balance)}.` : healthText;
    }
    health.className = `panel finance-health${healthState ? ` ${healthState}` : ""}`;
    $("fin-health-mark").textContent = healthMark; $("fin-health-title").textContent = healthTitle; $("fin-health-text").textContent = healthText;
    healthAction.hidden = !action; healthAction.textContent = action?.[0] || ""; healthAction.onclick = action?.[1] || null;

    const budgetSpent = s.limitSum - s.left;
    $("budget-summary").textContent = s.limitSum ? `${money(budgetSpent)} de ${money(s.limitSum)}` : "Sem limites";
    $("budget-summary-sub").textContent = s.limitSum ? (s.left >= 0 ? `${money(s.left)} disponíveis` : `${money(-s.left)} acima do total`) : "Começa por uma categoria";

    $("budget").replaceChildren(...s.cats.filter((c) => c.cat !== "(sem categoria)" || c.spent).map((c) => {
      const pct = c.limit ? c.spent / c.limit : 0;
      const cls = !c.limit ? "" : pct > 1 ? "bad" : pct >= 0.9 ? "warn" : "";
      const above = c.avg !== null && c.avg > 0 && c.spent > c.avg * 1.25 && c.spent - c.avg > 20;
      const inputId = `lim-${fold(c.cat).replace(/[^a-z]/g, "")}`;
      const remaining = c.limit === null ? null : c.limit - c.spent;
      return h("div", { class: "bline" },
        h("div", {}, h("strong", { text: c.cat }),
          c.avg !== null ? h("span", { class: `small ${above ? "warn-text" : "muted"}`, text: ` · média ${money(c.avg)}${above ? " ↑" : ""}` }) : null,
          remaining !== null ? h("span", { class: `small budget-left${remaining < 0 ? " bad" : pct >= 0.9 ? " warn" : " muted"}`, text: remaining >= 0 ? `${money(remaining)} disponíveis` : `${money(-remaining)} acima do limite` }) : null),
        c.cat === "(sem categoria)" ? h("button", { class: "btn small", text: "Categorizar", onclick: () => { $("mov-panel").open = true; $("mov-panel").scrollIntoView({ behavior: "smooth" }); } })
          : h("div", { class: "budget-values" }, h("span", { class: "num muted", text: `${money(c.spent)} de` }),
            h("label", { class: "sr", for: inputId, text: `Limite para ${c.cat}` }),
            h("input", { type: "number", id: inputId, class: "limit-input num", min: "0", step: "10", placeholder: "sem limite", value: c.limit ?? "",
              onchange: (e) => { const v = Number(e.target.value); if (v > 0) state.budget[c.cat] = v; else delete state.budget[c.cat]; saveBudget(); renderMes(); } })),
        c.limit ? h("div", { class: "bar", role: "img", "aria-label": `${Math.round(pct * 100)}% do limite` }, h("span", { class: cls, style: `width:${Math.min(100, pct * 100).toFixed(1)}%` })) : null,
      );
    }));
    const extra = CATS_OUT.filter((c) => !s.cats.some((x) => x.cat === c));
    if (extra.length) {
      const sel = h("select", { "aria-label": "Acrescentar limite a outra categoria" }, h("option", { value: "", text: "+ limite para outra categoria…" }), ...extra.map((c) => h("option", { value: c, text: c })));
      sel.addEventListener("change", () => { if (sel.value) { state.budget[sel.value] = 50; saveBudget(); renderMes(); } });
      $("budget").append(sel);
    }

    const rec = recurring(m);
    const recTotal = rec.items.reduce((a, i) => a + i.monthly, 0);
    $("rec-total").textContent = rec.items.length ? `≈ ${money(recTotal)} por mês` : "";
    $("rec-body").replaceChildren(...(rec.months.length < 2 ? [h("tr", {}, h("td", { colspan: "4", class: "muted", text: "São precisos pelo menos 2 meses com movimentos." }))]
      : rec.items.length ? rec.items.map((i) => h("tr", {}, h("td", { text: i.label }), h("td", { class: "muted", text: i.cat || "—" }), h("td", { class: "num", text: `${i.months.size}/${rec.months.length}` }), h("td", { class: "v num", text: money(i.monthly) })))
      : [h("tr", {}, h("td", { colspan: "4", class: "muted", text: "Nenhuma despesa repetida encontrada." }))]));

    const query = fold(movFilter);
    const rows = allRows.filter((x) => {
      const matchesText = !query || fold(`${x.desc} ${x.cat || ""} ${x.acc || ""}`).includes(query);
      const matchesType = movTypeFilter === "all"
        || (movTypeFilter === "out" && x.v < 0 && fold(x.cat) !== fold(TRANSFER))
        || (movTypeFilter === "in" && x.v > 0 && fold(x.cat) !== fold(TRANSFER))
        || (movTypeFilter === "uncat" && !x.cat)
        || (movTypeFilter === "transfer" && fold(x.cat) === fold(TRANSFER));
      return matchesText && matchesType;
    });
    $("mov-count").textContent = allRows.length;
    $("uncat-count").hidden = !uncat; $("uncat-count").textContent = `${uncat} sem categoria`;
    $("mov-visible").textContent = rows.length === allRows.length ? "" : `${rows.length} de ${allRows.length}`;
    $("mov-body").replaceChildren(...(rows.length ? rows.map((x) => {
      const sel = h("select", { "aria-label": `Categoria de ${x.desc}` }, h("option", { value: "", text: "— escolher —" }), ...ALL_CATS.map((c) => h("option", { value: c, text: c })));
      sel.value = x.cat || "";
      sel.addEventListener("change", () => {
        x.cat = sel.value; saveMonth(m);
        if (sel.value && !x.regraOferecida) {
          const word = x.desc.replace(/\(exemplo\)/, "").trim().split(/\s+/).find((w) => w.length > 3 && !/^\d/.test(w)) || "";
          if (word && confirm(`Criar regra: descrições com "${word.toLowerCase()}" passam a "${sel.value}"?`)) { state.rules.unshift({ p: word.toLowerCase(), cat: sel.value }); saveRules(); }
          x.regraOferecida = true;
        }
        renderMes();
      });
      return h("tr", {},
        h("td", { class: "num", text: shortDate(x.d) }),
        h("td", {}, x.desc, x.acc ? h("div", { class: "muted small", text: x.acc }) : null),
        h("td", {}, sel),
        h("td", { class: `v num${x.v > 0 ? " pos" : ""}`, text: money(x.v) }),
        h("td", {}, h("button", { class: "btn small ghost", text: "Apagar", "aria-label": `Apagar ${x.desc}`, onclick: () => {
          if (!confirm(`Apagar "${x.desc}" (${money(x.v)})?`)) return;
          state.months[m].mov = movOf(m).filter((y) => y !== x); saveMonth(m); renderMes();
        } })),
      );
    }) : [h("tr", {}, h("td", { colspan: "5", class: "muted", text: allRows.length ? "Nenhum movimento corresponde ao filtro." : "Sem movimentos neste mês." }))]));

    $("rules-count").textContent = state.rules.length;
    $("rule-cat").replaceChildren(...ALL_CATS.map((c) => h("option", { value: c, text: c })));
    $("rules-list").replaceChildren(...state.rules.map((r, i) => h("li", { class: "task" },
      h("span", { class: "num muted", text: String(i + 1) }),
      h("span", {}, h("span", { class: "num", text: `"${r.p}"` }), " → ", h("strong", { text: r.cat })),
      h("span", { class: "actions" },
        i > 0 ? h("button", { class: "btn small ghost", text: "↑", "aria-label": "Subir regra", onclick: () => { [state.rules[i - 1], state.rules[i]] = [state.rules[i], state.rules[i - 1]]; saveRules(); renderMes(); } }) : null,
        h("button", { class: "btn small ghost", text: "Apagar", onclick: () => { state.rules.splice(i, 1); saveRules(); renderMes(); } })),
    )));
  }

  function openFinancePanel(id, focusId) {
    const panel = $(id);
    if (panel instanceof HTMLDetailsElement) panel.open = true;
    panel?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (focusId) setTimeout(() => $(focusId)?.focus(), 250);
  }
  function showUncategorized() {
    movTypeFilter = "uncat";
    $("mov-type-filter").value = "uncat";
    openFinancePanel("mov-panel", "mov-type-filter");
    renderMes();
  }
  $("fin-add").addEventListener("click", () => openFinancePanel("mov-add-panel", "mov-desc"));
  $("fin-import").addEventListener("click", () => openFinancePanel("imp-panel", "imp-file"));
  $("fin-review").addEventListener("click", showUncategorized);
  $("mov-filter").addEventListener("input", (e) => { movFilter = e.target.value; renderMes(); });
  $("mov-type-filter").addEventListener("change", (e) => { movTypeFilter = e.target.value; renderMes(); });

  $("month-select").addEventListener("change", (e) => {
    state.month = e.target.value;
    if (state.mode === "cloud" && !state.finExample) { watchMonth(state.month); ensureRecentMonths(); }
    renderMes();
  });
  function startFinance() {
    applyFinance({ months: {}, index: [], budget: {}, rules: structuredClone(DEFAULT_RULES), accounts: [] });
    state.month = MONTH;
    saveIndex(); saveBudget(); saveRules(); saveAccounts();
    if (state.mode === "cloud") {
      watch("fin-index", (d) => { if (d) state.index = d.months || []; });
      watch("orcamento", (d) => { if (d) state.budget = d.limits || {}; });
      watch("regras", (d) => { if (d) state.rules = d.rules || []; });
      watch("contas", (d) => { if (d) state.accounts = d.items || []; });
      watchMonth(MONTH);
    }
    renderAll();
  }
  $("fin-start").addEventListener("click", startFinance);
  $("acc-start").addEventListener("click", startFinance);
  $("mov-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const d = $("mov-date").value, desc = $("mov-desc").value.trim(), val = Number($("mov-value").value);
    if (!d || !desc || !(val > 0)) return;
    const cat = $("mov-cat").value || categorize(desc);
    const sign = movKind === "out" ? -1 : 1;
    addMovements([{ id: newId(), d, desc, v: sign * val, cat, acc: $("mov-acc").value.trim() }]);
    if (d.slice(0, 7) !== state.month) flash(`Registado em ${monthLabel(d.slice(0, 7))}.`, 2500);
    $("mov-desc").value = ""; $("mov-value").value = ""; $("mov-desc").focus();
    renderMes();
  });
  $("rule-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const p = $("rule-pat").value.trim().toLowerCase(); if (!p) return;
    if (p.length < 3) { flash("Usa pelo menos 3 letras, para a regra não apanhar tudo.", 2500); return; }
    state.rules.unshift({ p, cat: $("rule-cat").value }); saveRules();
    $("rule-pat").value = ""; renderMes();
  });
  $("rules-apply").addEventListener("click", () => {
    let n = 0;
    for (const m of Object.keys(state.months)) {
      let changed = false;
      for (const x of movOf(m)) if (!x.cat) { const c = categorize(x.desc); if (c) { x.cat = c; n++; changed = true; } }
      if (changed) saveMonth(m);
    }
    flash(`${n} movimento${n === 1 ? "" : "s"} categorizado${n === 1 ? "" : "s"}.`, 2500); renderMes();
  });

  // ---- importação (mesmo método do script financas.mjs)
  function parseCsv(text, sep) {
    const rows = []; let row = [], cell = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') cell += text[i++]; else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true;
      else if (c === sep) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); rows.push(row); row = []; cell = ""; }
      else cell += c;
    }
    if (cell || row.length) rows.push([...row, cell]);
    return rows.filter((r) => r.some((x) => x.trim()));
  }
  const detectSep = (line) => [";", ",", "\t"].map((s) => [s, line.split(s).length]).sort((a, b) => b[1] - a[1])[0][0];
  function toNumber(s) {
    let t = String(s ?? "").replace(/[€\s\u00a0]/g, "");
    if (!t) return NaN;
    const neg = /^\(.*\)$/.test(t); t = t.replace(/[()]/g, "");
    const lc = t.lastIndexOf(","), ld = t.lastIndexOf(".");
    if (lc > ld) t = t.replace(/\./g, "").replace(",", ".");
    else if (ld > lc && lc !== -1) t = t.replace(/,/g, "");
    const n = Number(t); return neg ? -n : n;
  }
  function toDate(s) {
    const t = String(s ?? "").trim();
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/); if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/); if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
    return null;
  }
  const ALIASES = {
    data: ["data", "data mov", "data mov.", "data movimento", "data lancamento", "data operacao", "data valor", "date"],
    desc: ["descricao", "descritivo", "movimento", "designacao", "description", "detalhes"],
    valor: ["valor", "montante", "montante (eur)", "importancia", "amount", "valor (eur)"],
    deb: ["debito", "debito (eur)", "debit"], cred: ["credito", "credito (eur)", "credit"],
  };
  function importCsv(text, acc, custom) {
    text = text.replace(/^\uFEFF/, "");
    const names = (k) => (custom[k] ? [fold(custom[k])] : ALIASES[k]);
    const lines = text.split(/\r?\n/);
    const at = lines.findIndex((l) => {
      const cells = l.split(detectSep(l)).map((c) => fold(c.replace(/"/g, "")));
      return cells.some((c) => names("data").includes(c)) && cells.some((c) => [...names("valor"), ...ALIASES.deb].includes(c));
    });
    if (at === -1) throw new Error("Não encontrei a linha com os nomes das colunas (data e valor/débito). Indica os nomes em \"O banco usa outros nomes de colunas?\".");
    const rows = parseCsv(lines.slice(at).join("\n"), detectSep(lines[at]));
    const head = rows.shift().map(fold);
    const col = (k) => head.findIndex((x) => names(k).includes(x));
    const [iD, iS, iV, iDb, iCr] = [col("data"), col("desc"), col("valor"), col("deb"), col("cred")];
    if (iS === -1) throw new Error(`Não encontrei a coluna da descrição. Colunas: ${head.join(", ")}`);
    const key = (x) => [x.d, fold(x.desc), x.v.toFixed(2), fold(x.acc)].join("|");
    const seen = new Map();
    for (const m of Object.keys(state.months)) for (const x of movOf(m)) seen.set(key(x), (seen.get(key(x)) || 0) + 1);
    const incoming = new Map();
    const add = []; let dup = 0, skipped = 0;
    for (const r of rows) {
      const d = toDate(r[iD]);
      const has = (r[iCr] || "").trim() || (r[iDb] || "").trim();
      const v = iV !== -1 ? toNumber(r[iV]) : has ? (toNumber(r[iCr]) || 0) - Math.abs(toNumber(r[iDb]) || 0) : NaN;
      if (!d || !Number.isFinite(v) || v === 0) { skipped++; continue; }
      const desc = (r[iS] || "").replace(/\s+/g, " ").trim();
      const x = { id: newId(), d, desc, v, cat: categorize(desc), acc };
      const k = key(x);
      const occurrence = (incoming.get(k) || 0) + 1;
      incoming.set(k, occurrence);
      if (occurrence <= (seen.get(k) || 0)) dup++; else add.push(x);
    }
    return { add, dup, skipped };
  }
  $("imp-go").addEventListener("click", async () => {
    const f = $("imp-file").files?.[0];
    const out = $("imp-result");
    out.hidden = false;
    if (!f) { out.textContent = "Escolhe primeiro o ficheiro CSV."; return; }
    if (state.finExample) { out.textContent = "Carrega primeiro em \"Começar com os meus dados\" (no topo), para não misturar com o exemplo."; return; }
    const acc = $("imp-acc").value.trim() || "principal";
    try {
      const months = [...new Set(state.index)];
      if (state.mode === "cloud") {
        const missing = months.filter((m) => !state.months[m]);
        const docs = await Promise.all(missing.map((m) => loadDoc(`fin-${m}`)));
        missing.forEach((m, i) => { state.months[m] = { mov: docs[i]?.mov || [] }; recentLoaded.add(m); });
      }
      let text = await f.text();
      if (text.includes("\uFFFD")) { try { text = new TextDecoder("windows-1252").decode(await f.arrayBuffer()); } catch { /* fica UTF-8 */ } }
      const r = importCsv(text, acc, { data: $("imp-col-date").value, desc: $("imp-col-desc").value, valor: $("imp-col-val").value });
      const touched = addMovements(r.add);
      const uncat = r.add.filter((x) => !x.cat).length;
      out.textContent = `Importados ${r.add.length} movimentos (${[...touched].sort().map(monthLabel).join(", ") || "nenhum mês"}). ${r.dup} já existiam. ${r.skipped} linhas ignoradas.${uncat ? ` ${uncat} ficaram sem categoria: escolhe-a na tabela e a página oferece-se para criar a regra.` : ""}`;
      if (touched.size) { state.month = [...touched].sort().at(-1); watchMonth(state.month); }
      renderMes();
    } catch (e) { out.textContent = e.message || "Não foi possível ler o ficheiro."; }
  });

  // =========================================================== PATRIMÓNIO
  const ACCOUNT_TYPES = ["à ordem", "poupança", "investimento", "dívida", "dinheiro"];
  function renderContas() {
    $("acc-example").hidden = !state.finExample;
    let total = 0, liquid = 0, invested = 0, debt = 0;
    for (const a of state.accounts) {
      const raw = Number(a.saldo) || 0;
      const value = a.tipo === "dívida" ? -Math.abs(raw) : raw;
      total += value;
      if (["à ordem", "poupança", "dinheiro"].includes(a.tipo)) liquid += value;
      if (a.tipo === "investimento") invested += value;
      if (a.tipo === "dívida" || value < 0) debt += Math.abs(Math.min(0, value));
    }
    $("acc-kpis").replaceChildren(
      h("div", { class: "kpi lead" }, h("span", { class: "label", text: "Património líquido" }), h("span", { class: "num", text: money(total) }), h("span", { class: "small", text: "ativos menos dívidas" })),
      h("div", { class: "kpi" }, h("span", { class: "label", text: "Disponível" }), h("span", { class: "num", text: money(liquid) }), h("span", { class: "small muted", text: "ordem, poupança e dinheiro" })),
      h("div", { class: "kpi" }, h("span", { class: "label", text: "Investimentos" }), h("span", { class: "num", text: money(invested) })),
      h("div", { class: "kpi" }, h("span", { class: "label", text: "Dívidas" }), h("span", { class: `num${debt ? " neg-flag" : ""}`, text: money(debt) })),
    );
    $("acc-count").textContent = `${state.accounts.length} ${state.accounts.length === 1 ? "conta" : "contas"}`;
    $("acc-body").replaceChildren(...(state.accounts.length ? state.accounts.map((a) => {
      const age = a.data ? daysBetween(a.data, TODAY) : Infinity;
      const name = h("input", { type: "text", class: "account-edit", value: a.nome, "aria-label": "Nome da conta",
        onchange: (e) => { const v = e.target.value.trim(); if (v) { a.nome = v; saveAccounts(); renderContas(); } else e.target.value = a.nome; } });
      const type = h("select", { class: "account-type", "aria-label": `Tipo de ${a.nome}` }, ...ACCOUNT_TYPES.map((t) => h("option", { value: t, text: t })));
      type.value = ACCOUNT_TYPES.includes(a.tipo) ? a.tipo : "à ordem";
      type.addEventListener("change", () => { a.tipo = type.value; if (a.tipo === "dívida") a.saldo = -Math.abs(Number(a.saldo) || 0); saveAccounts(); renderContas(); });
      const bal = h("input", { type: "number", step: "0.01", class: "limit-input num", value: Number(a.saldo) || 0, "aria-label": `Saldo de ${a.nome}`,
        onchange: (e) => { const v = Number(e.target.value); if (Number.isFinite(v)) { a.saldo = a.tipo === "dívida" ? -Math.abs(v) : v; a.data = TODAY; saveAccounts(); renderContas(); } } });
      return h("tr", {},
        h("td", {}, name), h("td", {}, type), h("td", { class: "v" }, bal),
        h("td", { class: age > 35 ? "warn-text small" : "muted small", text: !Number.isFinite(age) ? "sem data" : age > 35 ? `há ${age} dias` : age === 0 ? "hoje" : shortDate(a.data) }),
        h("td", {}, h("button", { class: "btn small ghost", text: "Apagar", onclick: () => { if (confirm(`Apagar a conta "${a.nome}"?`)) { state.accounts = state.accounts.filter((x) => x !== a); saveAccounts(); renderContas(); } } })));
    }) : [h("tr", {}, h("td", { colspan: "5", class: "muted", text: "Sem contas. Acrescenta a primeira abaixo." }))]));
    const stale = state.accounts.filter((a) => !a.data || daysBetween(a.data, TODAY) > 35);
    const accHealth = $("acc-health"), accAction = $("acc-health-action");
    accHealth.className = `panel finance-health${stale.length || !state.accounts.length ? " warn" : ""}`;
    $("acc-health-mark").textContent = !state.accounts.length ? "1" : stale.length ? "!" : "✓";
    $("acc-health-title").textContent = !state.accounts.length ? "Acrescenta a primeira conta" : stale.length ? `${stale.length} ${stale.length === 1 ? "saldo precisa" : "saldos precisam"} de atualização` : "Saldos atualizados";
    $("acc-health-text").textContent = !state.accounts.length ? "Regista apenas o nome, tipo e saldo atual; não são pedidas credenciais bancárias." : stale.length ? `Mais antigo: ${stale[0].nome}. Atualizar os saldos mantém o património correto.` : "Todas as contas foram revistas nos últimos 35 dias.";
    accAction.hidden = !!state.accounts.length && !stale.length;
    accAction.textContent = !state.accounts.length ? "Adicionar conta" : "Atualizar agora";
    accAction.onclick = !state.accounts.length ? () => $("acc-name").focus() : stale.length ? () => $("acc-body").querySelector("input[type=number]")?.focus() : null;
    if (document.activeElement !== $("goals")) $("goals").value = state.goals;
  }
  $("acc-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.finExample) { flash("Carrega primeiro em \"Começar com os meus dados\", no separador Mês.", 3000); return; }
    const nome = $("acc-name").value.trim(), saldo = Number($("acc-bal").value);
    if (!nome || !Number.isFinite(saldo)) return;
    if (state.accounts.some((a) => fold(a.nome) === fold(nome))) { flash("Já existe uma conta com esse nome.", 2500); return; }
    const tipo = $("acc-type").value;
    state.accounts.push({ id: newId(), nome, tipo, saldo: tipo === "dívida" ? -Math.abs(saldo) : saldo, data: TODAY });
    saveAccounts(); e.target.reset(); renderContas();
  });
  $("goals-save").addEventListener("click", () => { state.goals = $("goals").value.trim(); saveGoals(); $("goals-note").textContent = "Guardado."; setTimeout(() => { $("goals-note").textContent = ""; }, 2000); });

  // =========================================================== INVESTIR
  $("inv-go").addEventListener("click", () => {
    const q = $("inv-q").value.trim(); if (!q) return;
    let ctx = "";
    if ($("inv-ctx").checked) {
      const months = monthsKnown().filter((m) => m < MONTH && state.months[m]).slice(0, 3);
      const avg = months.length ? months.reduce((s, m) => { const x = summary(m); return s + (x.income - x.spent); }, 0) / months.length : null;
      const total = state.accounts.reduce((s, a) => s + (a.tipo === "dívida" ? -Math.abs(Number(a.saldo) || 0) : Number(a.saldo) || 0), 0);
      ctx = [
        "CONTEXTO DA PESSOA (dados dela, podes usar):",
        state.goals ? `Objetivos e perfil: ${state.goals.slice(0, 2000)}` : "Objetivos: não preenchidos.",
        avg !== null ? `Saldo mensal médio (receitas - despesas, últimos ${months.length} meses): ${avg.toFixed(0)} €` : "Saldo mensal médio: sem dados.",
        state.accounts.length ? `Património registado: ${total.toFixed(0)} € (${state.accounts.map((a) => `${a.tipo} ${(Number(a.saldo) || 0).toFixed(0)} €`).join("; ")})` : "Contas: não registadas.",
        state.finExample ? "ATENÇÃO: estes valores são de EXEMPLO, não da pessoa. Diz isso na resposta." : "",
      ].filter(Boolean).join("\n");
    }
    // No painel local, o Claude do computador pesquisa na internet; no claude.ai não pode.
    const comWeb = Boolean(LOCAL_TOKEN);
    const numeros = comWeb
      ? [
        "- Tens pesquisa na internet. Para taxas, rendimentos, escalões, limites ou benefícios fiscais ATUAIS, pesquisa em fontes oficiais ou primárias (Banco de Portugal / Portal do Cliente Bancário, CMVM, IGCP, Portal das Finanças, Diário da República, site do banco ou do emitente).",
        "- Cada número leva a fonte e a data: [Verificado: fonte, data]. Sem fonte oficial ou primária, não dês o número: escreve [Não verificado] e diz onde confirmar.",
        "- Prefere a página oficial a notícias ou blogues. Se as fontes discordarem, mostra as duas.",
      ]
      : [
        "- Nunca indiques taxas, rendimentos, escalões, limites ou benefícios fiscais concretos: marca [Não verificado] e diz onde confirmar (Portal do Cliente Bancário do Banco de Portugal, CMVM, IGCP, Portal das Finanças, documento de informação fundamental do produto).",
      ];
    runAI({ go: $("inv-go"), stop: $("inv-stop"), note: $("inv-note"), work: async (signal) => {
      $("inv-out").hidden = false; $("inv-result").textContent = comWeb ? "A pesquisar fontes atuais…" : "…";
      await sampleFn([
        comWeb ? SAFE.replace(/Não tens acesso à internet\.[^\n]*/, "Pesquisa antes de afirmar factos atuais e indica sempre a fonte e a data.").replace(/^- Se algo depender de informação atual.*\n?/m, "") : SAFE,
        "PAPEL: educador financeiro para uma pessoa em Portugal. NÃO és consultor: não recomendas produtos concretos nem dás ordens de compra.",
        "- Antes de falar em investir, verifica (com o contexto) o fundo de emergência e dívidas com juros altos, e di-lo se faltar informação.",
        `- Explica os TIPOS de opção relevantes (por exemplo: depósitos a prazo, certificados de aforro e do Tesouro, PPR, fundos e ETF, ações, obrigações) com risco, liquidez, custos e horizonte${comWeb ? "" : ", sem valores numéricos atuais"}.`,
        ...numeros,
        "- Termina com: perguntas que a pessoa deve fazer ao banco ou ao intermediário, e a nota de que decisões importantes devem ser confirmadas com um profissional certificado (uma frase, sem sermão).",
        `- Formato: texto simples com títulos curtos e listas com hífen. No máximo ${comWeb ? 450 : 350} palavras.${comWeb ? " Responde só com o texto final, sem descrever as pesquisas." : ""}`,
        "",
        ctx,
        "",
        `PERGUNTA: ${q.slice(0, 3000)}`,
      ].join("\n"), opts({ signal, web: comWeb || undefined, onText: ({ text }) => { if (text) formatar(text, $("inv-result")); } }));
    } });
  });

  // =========================================================== PENSAR
  const PENSAR_RULES = [
    SAFE,
    "PAPEL: parceiro de pensamento. O objetivo é ajudar a pessoa a pensar melhor, não a concordar com ela.",
    "- Na primeira resposta, reformula a posição dela numa frase (\"Se percebi bem, defendes que…\") e diz se a questão é factual, de valores, de previsão ou de definição.",
    "- Em cada resposta, no máximo 3 perguntas que testem pressupostos, evidência ou contra-exemplos. Nomeia uma falácia só se ajudar, com uma linha de explicação.",
    "- Apresenta a versão mais forte da posição contrária quando fizer sentido.",
    "- Etiqueta afirmações: [Facto geralmente aceite], [Disputado], [Não verificado], [Opinião]. Sem internet: não cites números, estudos ou datas concretas.",
    "- Não concordes para agradar. Não fales de outros temas. Respostas curtas (até 180 palavras), conversa por rondas.",
  ].join("\n");
  function renderPensar() {
    const statusLabel = { capturada: "Capturada", "a-desenvolver": "A desenvolver", pronta: "Pronta para escrever" };
    $("ideas-count").textContent = state.ideas.length;
    $("ideas-captured").textContent = state.ideas.filter((x) => x.status === "capturada").length;
    $("ideas-developing").textContent = state.ideas.filter((x) => x.status === "a-desenvolver").length;
    $("ideas-ready").textContent = state.ideas.filter((x) => x.status === "pronta").length;
    $("ideas-list").replaceChildren(...(state.ideas.length ? state.ideas.map((idea) => {
      const status = h("select", { "aria-label": `Estado de ${idea.title}` },
        ...Object.entries(statusLabel).map(([value, label]) => h("option", { value, selected: idea.status === value, text: label })));
      status.addEventListener("change", () => { idea.status = status.value; idea.updated = TODAY; saveIdeas(); renderPensar(); });
      return h("article", { class: "idea-card" },
        h("div", { class: "idea-head" }, h("div", {}, h("div", { class: "title", text: idea.title }), h("div", { class: "meta" },
          h("span", { class: "chip", text: shortDate(idea.updated || idea.created || TODAY) }), ...(idea.tags || []).map((tag) => h("span", { class: "chip", text: tag })))), status),
        idea.body ? h("p", { class: "small", text: idea.body }) : null,
        h("div", { class: "actions" },
          h("button", { class: "btn small primary", type: "button", text: "Desenvolver", onclick: () => developIdea(idea) }),
          h("button", { class: "btn small", type: "button", text: "Levar para Escrita", onclick: () => ideaToWriting(idea) }),
          h("button", { class: "btn small ghost", type: "button", text: "Apagar", onclick: () => { if (confirm(`Apagar a ideia «${idea.title}»?`)) { state.ideas = state.ideas.filter((x) => x !== idea); saveIdeas(); renderPensar(); } } })),
      );
    }) : [h("p", { class: "muted", text: "Ainda não guardaste ideias. Escreve uma frase na captura rápida." })]));
    $("notes-count").textContent = state.notes.length;
    $("notes-list").replaceChildren(...(state.notes.length ? state.notes.map((n, i) => h("li", { class: "task" },
      h("span", { class: "chip", text: shortDate(n.d) }),
      h("details", {}, h("summary", { text: n.tema }), h("div", { class: "result", text: `${n.resumo}${n.proximo ? `\n\nPróximo passo: ${n.proximo}` : ""}` })),
      h("div", { class: "actions" },
        h("button", { class: "btn small", text: "Criar ideia", onclick: () => { state.ideas.unshift({ id: newId(), title: n.tema, body: `${n.resumo}${n.proximo ? `\n\nPróximo passo: ${n.proximo}` : ""}`, tags: [], status: "a-desenvolver", created: n.d || TODAY, updated: TODAY }); saveIdeas(); renderPensar(); } }),
        h("button", { class: "btn small ghost", text: "Apagar", onclick: () => { state.notes.splice(i, 1); saveNotes(); renderPensar(); } })),
    )) : [h("li", { class: "muted", text: "Ainda nada guardado. Usa \"Fechar o tema e resumir\"." })]));
  }
  function ideaToWriting(idea) {
    currentDraftId = null;
    $("wr-title").value = idea.title;
    $("wr-text").value = idea.body;
    $("wr-objective").value = ""; $("wr-audience").value = "";
    idea.status = "pronta"; idea.updated = TODAY; saveIdeas();
    updateWritingStats(); selectTab("escrita"); $("wr-text").focus();
  }
  /** Desenvolver uma ideia é uma conversa nova no separador Conversar, com o tema Pensar. */
  function developIdea(idea) {
    idea.status = "a-desenvolver"; idea.updated = TODAY; saveIdeas();
    novaConversa(TEMAS.find((t) => t.cmd === "/pensar"));
    conversa.push({ role: "user", content: `Quero desenvolver esta ideia.\n\nTítulo: ${idea.title}\n${idea.body}${idea.tags?.length ? `\n\nEtiquetas: ${idea.tags.join(", ")}` : ""}` });
    selectTab("conversar");
    pedirResposta();
  }
  $("idea-save").addEventListener("click", () => {
    const body = $("idea-body").value.trim();
    const typedTitle = $("idea-title").value.trim();
    if (!body && !typedTitle) { $("writing-storage").textContent = "Escreve pelo menos um título ou uma frase."; return; }
    const title = typedTitle || body.split(/\s+/).slice(0, 8).join(" ");
    state.ideas.unshift({ id: newId(), title: title.slice(0, 160), body: body.slice(0, 6000), tags: $("idea-tags").value.split(",").map((x) => x.trim()).filter(Boolean).slice(0, 8), status: "capturada", created: TODAY, updated: TODAY });
    $("idea-title").value = ""; $("idea-body").value = ""; $("idea-tags").value = "";
    saveIdeas(); renderPensar();
  });
  // =========================================================== CONVERSAR
  /**
   * Conversa livre com o Claude. Cada tema (escolhido com "/") traz as regras da área e um
   * resumo dos dados dela — só os que já estão nesta página, nunca inventados.
   */
  const TEMAS = [
    {
      cmd: "/hoje", resumo: "as tuas tarefas e o plano do dia", nome: "Rotina", area: "rotina",
      regras: "PAPEL: ajudas a organizar o dia. No máximo 3 prioridades, e cada uma com um primeiro passo de 2 a 5 minutos, físico e concreto. Sem sermões sobre procrastinação.",
      dados: () => {
        const top = ranked().slice(0, 5).map((t) => `- ${t.t}${t.due ? ` (prazo ${t.due})` : ""}${t.adiada ? ` [adiada ${t.adiada}x]` : ""}`);
        const inbox = state.tasks.filter((t) => t.inbox && !t.feita).length;
        return [state.tasksExample ? "ATENÇÃO: são tarefas de exemplo, não dele." : "", `Tarefas abertas:\n${top.join("\n") || "(nenhuma)"}`, `Caixa de entrada: ${inbox}`].filter(Boolean).join("\n");
      },
    },
    {
      cmd: "/financas", resumo: "o mês, o orçamento e os objetivos", nome: "Finanças", area: "financas",
      regras: "PAPEL: ajudas a perceber os números que estão aqui. Não estimes valores que não existam nos dados. Números do mundo (taxas, impostos) não tens: marca [Não verificado] e diz onde confirmar. Não dás ordens de investimento.",
      dados: () => {
        const s = summary(state.month);
        return [
          state.finExample ? "ATENÇÃO: valores de exemplo, não dele." : "",
          `Mês ${state.month}: receitas ${money(s.income)}, despesas ${money(s.spent)}.`,
          s.limitSum > 0 ? `Orçamento: ${money(s.left)} por gastar de ${money(s.limitSum)}.` : "Sem limites definidos.",
          s.cats.slice(0, 6).map((c) => `- ${c.cat}: ${money(c.spent)}${c.limit ? ` de ${money(c.limit)}` : ""}`).join("\n"),
          state.goals ? `Objetivos dele: ${state.goals.slice(0, 800)}` : "",
        ].filter(Boolean).join("\n");
      },
    },
    {
      cmd: "/emprego", resumo: "o teu CV, cargos e candidaturas", nome: "Carreira", area: "carreira",
      regras: "PAPEL: ajudas na procura de emprego. O CV é a única fonte sobre a experiência dele: não inventes experiências nem competências. Não te candidatas a nada: preparas, ele envia.",
      dados: () => [
        state.cv?.markdown ? `CV:\n${state.cv.markdown.slice(0, 6000)}` : "Sem CV no Rumo.",
        state.cargos?.length ? `Cargos sugeridos: ${state.cargos.map((c) => c.titulo).join(", ")}` : "",
        `Candidaturas em curso: ${state.jobs.filter((j) => J_ACTIVE.includes(j.estado) && !state.jobsExample).length}`,
        `Vagas por decidir: ${vagasAbertas().length}`,
      ].filter(Boolean).join("\n"),
    },
    {
      cmd: "/pensar", resumo: "discutir uma ideia a sério", nome: "Pensar", area: "ideias",
      regras: PENSAR_RULES,
      dados: () => (state.notes?.length ? `Resumos guardados: ${state.notes.slice(0, 5).map((n) => n.tema).join("; ")}` : ""),
      // Atalhos que o separador Ideias tinha: aparecem por baixo da conversa neste tema.
      rapidos: [
        ["Clarificar", "Ajuda-me a clarificar esta ideia: qual é a afirmação central e o que está vago?"],
        ["Testar pressupostos", "Testa os pressupostos desta ideia. O que estou a assumir sem prova?"],
        ["Ver contraponto", "Constrói a versão mais forte do argumento contrário a esta ideia."],
        ["Organizar", "Ajuda-me a organizar esta ideia numa estrutura simples, sem escrever o texto por mim."],
      ],
      resumivel: true,
    },
    {
      cmd: "/lingua", resumo: "corrigir português ou inglês", nome: "Língua", area: "ideias",
      regras: "PAPEL: corriges e melhoras textos em português europeu (AO90) ou inglês. Corriges sem mudar a voz nem o sentido, e explicas cada correção numa linha, com a regra.",
      dados: () => (state.errors?.length ? `Erros frequentes dele: ${state.errors.slice(0, 10).map((e) => `${e.de} → ${e.para}`).join("; ")}` : ""),
    },
    {
      cmd: "/escrita", resumo: "rever um texto na tua voz", nome: "Escrita", area: "ideias",
      regras: "PAPEL: ajudas a escrever sem escrever pela pessoa. Apontas incoerências e desvios de tom, e fazes perguntas que desbloqueiam. Só escreves uma frase de exemplo se ela pedir, marcada como [Sugestão].",
      dados: () => (state.voice?.perfil ? `Perfil de voz dele${state.voice.confirmado ? " (confirmado)" : " (por confirmar)"}:\n${state.voice.perfil.slice(0, 2000)}` : "Sem perfil de voz."),
    },
  ];
  let temaAtual = null;
  let conversa = [];
  let conversaId = null;
  let menuIndice = 0;

  // ---------- texto do Claude → HTML seguro (nada de innerHTML com o que o modelo escreve) ----------
  const linkSeguro = (href) => { try { const u = new URL(href); return u.protocol === "https:" ? u.href : ""; } catch { return ""; } };
  /** Negrito, itálico, código e ligações dentro de uma linha. */
  function comMarcas(texto, destino) {
    const re = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
    let ultimo = 0;
    for (const m of texto.matchAll(re)) {
      if (m.index > ultimo) destino.append(texto.slice(ultimo, m.index));
      const t = m[0];
      if (t.startsWith("**")) destino.append(h("strong", { text: t.slice(2, -2) }));
      else if (t.startsWith("`")) destino.append(h("code", { text: t.slice(1, -1) }));
      else if (t.startsWith("[")) {
        const [, rotulo, href] = t.match(/\[([^\]]+)\]\(([^)]+)\)/);
        const url = linkSeguro(href);
        destino.append(url ? h("a", { href: url, target: "_blank", rel: "noopener noreferrer", text: rotulo }) : rotulo);
      } else destino.append(h("em", { text: t.slice(1, -1) }));
      ultimo = m.index + t.length;
    }
    if (ultimo < texto.length) destino.append(texto.slice(ultimo));
  }
  /** Converte a resposta em títulos, listas, blocos de código e parágrafos. */
  function formatar(texto, caixa) {
    caixa.replaceChildren();
    const linhas = String(texto || "").split("\n");
    let i = 0;
    while (i < linhas.length) {
      const linha = linhas[i];
      if (linha.startsWith("```")) {
        const corpo = [];
        i++;
        while (i < linhas.length && !linhas[i].startsWith("```")) corpo.push(linhas[i++]);
        i++;
        caixa.append(h("pre", {}, h("code", { text: corpo.join("\n") })));
        continue;
      }
      const titulo = linha.match(/^(#{1,4})\s+(.*)$/);
      if (titulo) {
        caixa.append(h(titulo[1].length <= 2 ? "h3" : "h4", { text: titulo[2] }));
        i++;
        continue;
      }
      const lista = /^\s*([-*•]|\d+[.)])\s+/;
      if (lista.test(linha)) {
        const numerada = /^\s*\d/.test(linha);
        const itens = [];
        while (i < linhas.length && lista.test(linhas[i])) {
          const item = h("li", {});
          comMarcas(linhas[i].replace(lista, ""), item);
          itens.push(item);
          i++;
        }
        caixa.append(h(numerada ? "ol" : "ul", {}, ...itens));
        continue;
      }
      if (!linha.trim()) { i++; continue; }
      const p = h("p", {});
      const bloco = [];
      while (i < linhas.length && linhas[i].trim() && !lista.test(linhas[i]) && !linhas[i].startsWith("```") && !/^#{1,4}\s/.test(linhas[i])) bloco.push(linhas[i++]);
      comMarcas(bloco.join(" "), p);
      caixa.append(p);
    }
    if (!caixa.childNodes.length) caixa.append(h("p", { text: String(texto || "") }));
  }

  // ---------- conversas guardadas ----------
  const saveConversas = () => save("conversas", { items: (state.conversas || []).slice(0, 30) });
  const tituloDe = (turnos) => (turnos.find((t) => t.role === "user")?.content || "Conversa").replace(/\s+/g, " ").slice(0, 48);
  function guardarConversa() {
    if (!conversa.length) return;
    const registo = { id: conversaId || newId(), titulo: tituloDe(conversa), tema: temaAtual?.cmd || "", data: TODAY, turnos: conversa.slice(-40) };
    conversaId = registo.id;
    state.conversas = [registo, ...(state.conversas || []).filter((c) => c.id !== registo.id)].slice(0, 30);
    saveConversas();
    renderListaConversas();
  }
  function abrirConversa(c) {
    conversa = [...(c.turnos || [])];
    conversaId = c.id;
    temaAtual = TEMAS.find((t) => t.cmd === c.tema) || null;
    renderConversar();
  }
  function renderListaConversas() {
    const lista = state.conversas || [];
    $("talk-list").replaceChildren(...(lista.length ? lista.map((c) => h("li", { class: `talk-item${c.id === conversaId ? " atual" : ""}` },
      h("button", { type: "button", title: `${c.titulo} · ${shortDate(c.data || TODAY)}`, text: c.titulo, onclick: () => abrirConversa(c) }),
      h("button", { class: "btn small ghost", type: "button", "aria-label": `Apagar "${c.titulo}"`, text: "×", onclick: () => {
        state.conversas = lista.filter((x) => x.id !== c.id);
        saveConversas();
        if (conversaId === c.id) { conversa = []; conversaId = null; }
        renderConversar();
      } }),
    )) : [h("li", { class: "muted small", text: "Ainda nenhuma." })]));
  }

  // ---------- desenhar a conversa ----------
  function bolhaDe(turno, indice) {
    const caixa = h("div", { class: `bubble ${turno.role === "user" ? "me" : "ai"}` });
    if (turno.role === "user") caixa.textContent = turno.content;
    else formatar(turno.content, caixa);
    const acoes = h("div", { class: "msg-acoes" },
      h("button", { class: "btn small ghost", type: "button", text: "Copiar", onclick: async (e) => {
        try { await navigator.clipboard.writeText(turno.content); e.target.textContent = "Copiado"; }
        catch { e.target.textContent = "Ctrl+C"; }
        setTimeout(() => { e.target.textContent = "Copiar"; }, 1500);
      } }),
      turno.role === "assistant" ? h("button", { class: "btn small ghost", type: "button", title: "Guardar como tarefa na caixa de entrada", text: "→ tarefa", onclick: () => {
        const primeira = turno.content.split("\n").find((l) => l.trim()) || "Tarefa da conversa";
        mutateTasks((list) => list.push({ id: newId(), t: primeira.replace(/^[-*#\s]+/, "").slice(0, 120), p: 2, due: "", rep: "", adiada: 0, feita: null, inbox: true }));
        flash("Guardado na caixa de entrada.", 2200);
      } }) : null,
      turno.role === "assistant" && indice === conversa.length - 1
        ? h("button", { class: "btn small ghost", type: "button", text: "Repetir", onclick: () => repetirResposta() })
        : null,
    );
    return h("div", { class: `msg ${turno.role === "user" ? "me" : ""}` }, caixa, acoes);
  }
  function renderConversar() {
    const box = $("talk-chat");
    box.replaceChildren(...(conversa.length
      ? conversa.map(bolhaDe)
      : [h("p", { class: "muted", text: "Escreve uma mensagem. Com / escolhes o tema e o Rumo junta os teus dados dessa área." })]));
    box.scrollTop = box.scrollHeight;
    $("talk-topic").textContent = temaAtual ? temaAtual.nome : "sem tema";
    $("talk-topic").title = temaAtual ? `Usa as regras e os dados de ${temaAtual.nome}` : "Conversa normal, sem dados de nenhuma área";
    $("talk-model").textContent = `modelo ${MODELOS.find((m) => m.id === modelo)?.nome.toLowerCase() || "automático"}`;
    $("talk-regen").hidden = !conversa.some((t) => t.role === "assistant");
    // Funções próprias do tema: atalhos por baixo da conversa e "Resumir e guardar".
    $("talk-summary").hidden = !temaAtual?.resumivel;
    const rapidos = temaAtual?.rapidos || [];
    $("talk-quick").hidden = !rapidos.length;
    $("talk-quick").replaceChildren(...rapidos.map(([rotulo, pedido]) => h("button", {
      class: "chip-pick", type: "button", text: rotulo, title: pedido,
      onclick: () => {
        if (!conversa.length) { $("talk-in").value = `${pedido}\n\n`; $("talk-in").focus(); return; }
        conversa.push({ role: "user", content: pedido });
        renderConversar();
        pedirResposta();
      },
    })));
    $("talk-topics").replaceChildren(...TEMAS.map((t) => h("button", {
      class: "chip-pick", type: "button", "aria-pressed": String(temaAtual?.cmd === t.cmd), text: t.nome,
      title: `${t.cmd} — ${t.resumo}`,
      onclick: () => { temaAtual = temaAtual?.cmd === t.cmd ? null : t; renderConversar(); $("talk-in").focus(); },
    })));
    renderListaConversas();
  }

  // ---------- menu do "/" ----------
  function renderMenuTemas(filtro = "") {
    const f = fold(filtro.replace("/", ""));
    const lista = TEMAS.filter((t) => !f || fold(t.cmd).includes(f) || fold(t.nome).includes(f));
    menuIndice = Math.min(menuIndice, Math.max(0, lista.length - 1));
    $("talk-menu").hidden = !lista.length;
    $("talk-menu").replaceChildren(...lista.map((t, i) => h("button", {
      class: i === menuIndice ? "ativo" : "", type: "button", role: "option", onclick: () => escolherTema(t),
    }, h("span", { class: "cmd", text: t.cmd }), h("span", {}, h("strong", { text: t.nome }), h("span", { class: "muted small", text: ` — ${t.resumo}` })))));
    $("talk-menu").dataset.total = lista.length;
  }
  function escolherTema(tema) {
    temaAtual = tema;
    $("talk-menu").hidden = true;
    $("talk-in").value = $("talk-in").value.replace(/^\s*\/\S*\s*/, "");
    $("talk-in").focus();
    renderConversar();
  }
  $("talk-in").addEventListener("input", (e) => {
    const v = e.target.value;
    if (v.startsWith("/")) { menuIndice = 0; renderMenuTemas(v.split(/\s/)[0]); }
    else $("talk-menu").hidden = true;
  });
  $("talk-in").addEventListener("keydown", (e) => {
    const menu = $("talk-menu");
    if (!menu.hidden) {
      const botoes = [...menu.querySelectorAll("button")];
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        menuIndice = (menuIndice + (e.key === "ArrowDown" ? 1 : -1) + botoes.length) % botoes.length;
        renderMenuTemas($("talk-in").value.split(/\s/)[0]);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); botoes[menuIndice]?.click(); return; }
      if (e.key === "Escape") { menu.hidden = true; return; }
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) $("talk-go").click();
  });

  // ---------- enviar, repetir, exportar, apagar ----------
  function contextoDoTema() {
    const dados = temaAtual?.dados ? temaAtual.dados() : "";
    return [
      SAFE,
      temaAtual ? temaAtual.regras : "PAPEL: assistente pessoal. Respostas curtas e práticas; se não souberes, diz que não sabes.",
      temaAtual && dados ? `DADOS DELE NESTA ÁREA (usa-os; não inventes outros):\n${dados}` : "",
    ].filter(Boolean).join("\n\n");
  }
  function pedirResposta() {
    const bolha = h("div", { class: "bubble ai", text: "…" });
    // A resposta chega palavra a palavra; reformatar tudo a cada pedaço fica pesado numa
    // resposta longa, por isso só se redesenha a cada 80 ms (e no fim, sempre).
    let ultimoDesenho = 0;
    let pendente = null;
    const mostrar = (texto, agora = false) => {
      pendente = texto;
      if (!agora && Date.now() - ultimoDesenho < 80) return;
      ultimoDesenho = Date.now();
      formatar(pendente, bolha);
      $("talk-chat").scrollTop = $("talk-chat").scrollHeight;
    };
    runAI({ go: $("talk-go"), stop: $("talk-stop"), note: $("talk-note"), work: async (signal) => {
      $("talk-chat").append(h("div", { class: "msg" }, bolha));
      $("talk-chat").scrollTop = $("talk-chat").scrollHeight;
      try {
        const { text } = await sampleFn([{ role: "user", content: contextoDoTema() }, ...conversa.slice(-12)],
          opts({ signal, cache: false, onText: ({ text }) => mostrar(text) }));
        mostrar(text, true);
        conversa.push({ role: "assistant", content: text });
        guardarConversa();
      } catch (e) {
        if (e?.text) { conversa.push({ role: "assistant", content: `${e.text}\n\n(interrompido)` }); guardarConversa(); }
        throw e;
      } finally { renderConversar(); }
    } });
  }
  function repetirResposta() {
    if (!conversa.length) return;
    while (conversa.length && conversa.at(-1).role === "assistant") conversa.pop();
    if (!conversa.length) return;
    renderConversar();
    pedirResposta();
  }
  $("talk-regen").addEventListener("click", repetirResposta);
  /** Guarda a conversa atual e começa outra (com um tema, se vier de outro separador). */
  function novaConversa(tema = null) {
    guardarConversa();
    conversa = [];
    conversaId = null;
    temaAtual = tema;
    renderConversar();
  }
  $("talk-new").addEventListener("click", () => { novaConversa(); $("talk-in").focus(); });

  // "Resumir e guardar" (tema Pensar): o resumo vai para o separador Ideias, como antes.
  $("talk-summary").addEventListener("click", () => {
    if (!conversa.some((t) => t.role === "assistant")) { $("talk-note").textContent = "Ainda não há discussão para resumir."; return; }
    runAI({ go: $("talk-summary"), stop: $("talk-stop"), note: $("talk-note"), work: async (signal) => {
      const data = await sampleFn.json([
        { role: "user", content: PENSAR_RULES },
        ...conversa.slice(-12),
        { role: "user", content: 'Fecha o tema. Responde só com JSON: {"tema": string curto, "resumo": string com: ideia central; onde está forte; onde está fraca; o que falta saber, "proximo": string com um próximo passo concreto}. Até 150 palavras no total.' },
      ], opts({ signal, cache: false }));
      const nota = { d: TODAY, tema: String(data?.tema || "Sem título").slice(0, 160), resumo: String(data?.resumo || "").slice(0, 5000), proximo: String(data?.proximo || "").slice(0, 1000) };
      state.notes.unshift(nota);
      saveNotes();
      conversa.push({ role: "assistant", content: `**Resumo guardado em Ideias:** ${nota.tema}\n\n${nota.resumo}${nota.proximo ? `\n\n**Próximo passo:** ${nota.proximo}` : ""}` });
      guardarConversa();
      renderConversar();
    } });
  });
  $("talk-clear").addEventListener("click", () => {
    if (!conversa.length) return;
    if (!confirm("Apagar esta conversa?")) return;
    state.conversas = (state.conversas || []).filter((c) => c.id !== conversaId);
    saveConversas();
    conversa = [];
    conversaId = null;
    renderConversar();
  });
  $("talk-export").addEventListener("click", () => {
    if (!conversa.length) { $("talk-note").textContent = "Não há nada para exportar."; return; }
    const texto = [
      `# ${tituloDe(conversa)}`,
      `_${temaAtual ? `Tema: ${temaAtual.nome} · ` : ""}${TODAY}_`,
      "",
      ...conversa.map((t) => `## ${t.role === "user" ? "Eu" : "Claude"}\n\n${t.content}`),
    ].join("\n");
    offerFile(`conversa-${TODAY}.md`, texto, $("talk-note"));
  });
  $("talk-go").addEventListener("click", () => {
    const texto = $("talk-in").value.trim();
    if (!texto) return;
    // "/tema" escrito à mão, sem passar pelo menu.
    const atalho = TEMAS.find((t) => texto.toLowerCase().startsWith(`${t.cmd} `) || texto.toLowerCase() === t.cmd);
    if (atalho) {
      temaAtual = atalho;
      $("talk-in").value = texto.slice(atalho.cmd.length).trim();
      renderConversar();
      if (!$("talk-in").value) return;
    }
    const mensagem = $("talk-in").value.trim();
    if (!mensagem) return;
    conversa.push({ role: "user", content: mensagem.slice(0, 4000) });
    $("talk-in").value = "";
    $("talk-menu").hidden = true;
    renderConversar();
    pedirResposta();
  });

  // =========================================================== CORRETOR
  let lang = "pt", reg = "profissional";
  segGroup("lang-seg", (v) => { lang = v; });
  segGroup("reg-seg", (v) => { reg = v; });
  function renderCorretor() {
    const items = [...state.errors].sort((a, b) => b.vezes - a.vezes);
    $("err-count").textContent = items.length;
    $("err-list").replaceChildren(...(items.length ? items.map((x) => h("li", { class: "task" },
      h("span", { class: "chip", text: x.lang === "pt" ? "PT" : "EN" }),
      h("div", {}, h("div", {}, h("del", { text: x.de }), " → ", h("ins", { text: x.para }), x.vezes > 1 ? h("span", { class: "chip chronic", text: ` ${x.vezes}×` }) : null), h("div", { class: "muted small", text: x.regra })),
      h("button", { class: "btn small ghost", text: "Apagar", onclick: () => { state.errors = state.errors.filter((y) => y !== x); saveErrors(); renderCorretor(); } }),
    )) : [h("li", { class: "muted", text: "Ainda nada guardado." })]));
  }
  function keepError(c) {
    const l = lang === "pt" ? "pt" : "en";
    const found = state.errors.find((x) => x.lang === l && fold(x.de) === fold(c.de) && fold(x.para) === fold(c.para));
    if (found) found.vezes += 1; else state.errors.push({ lang: l, de: String(c.de), para: String(c.para), regra: String(c.regra || ""), vezes: 1 });
    saveErrors(); renderCorretor();
  }
  $("fix-go").addEventListener("click", () => {
    const text = $("fix-text").value.trim(); if (!text) return;
    const isPt = lang === "pt";
    const who = isPt ? "revisor de português europeu (norma de Portugal, Acordo Ortográfico de 1990)" : `reviewer of ${lang === "en-uk" ? "British" : "American"} English`;
    const focus = isPt ? "ortografia, acentuação, gramática, concordância, pontuação, colocação pronominal (norma europeia) e brasileirismos"
      : "spelling (consistent with the chosen variant), grammar, punctuation, prepositions, articles, and literal translations from Portuguese";
    const known = state.errors.filter((x) => x.lang === (isPt ? "pt" : "en")).slice(0, 20).map((x) => `"${x.de}" → "${x.para}"`).join("; ");
    runAI({ go: $("fix-go"), stop: $("fix-stop"), note: $("fix-note"), work: async (signal) => {
      const data = await sampleFn.json([
        `És um ${who}. Registo pretendido: ${reg}.`,
        `Corrige APENAS erros de ${focus}. Não mudes o sentido, a estrutura nem a voz do autor.`,
        reg === "profissional" ? "Se houver uma informalidade clara para um contexto profissional, podes corrigi-la e explicar." : "Mantém o tom informal.",
        "Se o texto estiver certo, devolve-o igual com uma lista vazia. Não inventes correções. Se a norma aceitar duas formas, não corrijas.",
        known ? `Erros que esta pessoa costuma dar (atenção especial): ${known}` : "",
        'Responde só com JSON: {"corrigido": string, "correcoes": [{"de": string, "para": string, "regra": string}]}',
        "Cada regra: uma linha, em português de Portugal, com a razão gramatical.",
        "", "Texto:", '"""', text.slice(0, 12000), '"""',
      ].filter(Boolean).join("\n"), opts({ signal }));
      const list = Array.isArray(data?.correcoes) ? data.correcoes : [];
      $("fix-out").hidden = false;
      $("fix-result").textContent = typeof data?.corrigido === "string" ? data.corrigido : text;
      $("fix-list").replaceChildren(...(list.length ? list.map((c) => {
        const keep = h("button", { class: "btn small ghost", text: "Guardar nos meus erros" });
        keep.addEventListener("click", () => { keepError(c); keep.disabled = true; keep.textContent = "Guardado"; });
        return h("div", { class: "fix" },
          h("div", {}, h("div", {}, h("del", { text: String(c.de ?? "") }), " → ", h("ins", { text: String(c.para ?? "") })), h("div", { class: "muted small", text: String(c.regra ?? "") })),
          keep);
      }) : [h("p", { class: "muted", text: "Não encontrei erros." })]));
    } }).then(() => { if (!$("fix-out").hidden) $("fix-note").textContent = "Confirma as correções antes de enviar o texto."; });
  });
  $("fix-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("fix-result").textContent); $("fix-copy").textContent = "Copiado"; }
    catch { const r = document.createRange(); r.selectNodeContents($("fix-result")); const s = getSelection(); s.removeAllRanges(); s.addRange(r); $("fix-copy").textContent = "Selecionado: Ctrl+C"; }
    setTimeout(() => { $("fix-copy").textContent = "Copiar"; }, 2000);
  });
  $("fix-to-writing").addEventListener("click", () => {
    const text = $("fix-result").textContent.trim(); if (!text) return;
    currentDraftId = null; $("wr-text").value = text; updateWritingStats(); selectTab("escrita");
  });

  // =========================================================== ESCRITA
  let wrMode = "planear", currentDraftId = null;
  const wrLabels = { planear: "Planear", coerencia: "Rever coerência", tom: "Comparar voz", desbloquear: "Desbloquear" };
  segGroup("wr-seg", (v) => {
    wrMode = v; $("wr-go").textContent = wrLabels[v];
    $("wr-text").placeholder = v === "planear" ? "Descreve a ideia, notas soltas ou pontos que queres incluir." : v === "desbloquear" ? "Descreve o que já tens e onde paraste." : "Cola ou escreve o texto.";
  });
  function updateWritingStats() {
    const text = $("wr-text").value.trim(); const words = text ? text.split(/\s+/).length : 0;
    $("wr-words").textContent = `${words} ${words === 1 ? "palavra" : "palavras"}`;
    const draft = state.drafts.find((x) => x.id === currentDraftId);
    $("wr-saved").textContent = draft ? `A editar: ${draft.title}` : "Ainda não guardado";
  }
  function clearWriting() {
    currentDraftId = null;
    for (const id of ["wr-title", "wr-objective", "wr-audience", "wr-text"]) $(id).value = "";
    $("wr-out").hidden = true; $("wr-note").textContent = ""; updateWritingStats();
  }
  function openDraft(draft) {
    currentDraftId = draft.id; $("wr-title").value = draft.title; $("wr-text").value = draft.content;
    $("wr-objective").value = draft.objective || ""; $("wr-audience").value = draft.audience || "";
    updateWritingStats(); selectTab("escrita"); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function renderEscrita() {
    const v = state.voice;
    const n = v.amostras.length;
    $("voice-state").textContent = v.perfil ? (v.confirmado ? `confirmado · ${n} textos` : `por confirmar · ${n} textos`) : n ? `${n} texto${n > 1 ? "s" : ""}` : "por construir";
    $("voice-samples").replaceChildren(...v.amostras.map((a, i) => h("li", { class: "task" },
      h("span", { class: "chip", text: String(i + 1) }),
      h("span", { class: "muted small", text: `${a.slice(0, 120)}${a.length > 120 ? "…" : ""}` }),
      h("button", { class: "btn small ghost", text: "Retirar", onclick: () => { v.amostras.splice(i, 1); saveVoice(); renderEscrita(); } }),
    )));
    $("voice-profile-wrap").hidden = !v.perfil;
    $("voice-profile").textContent = v.perfil;
    $("voice-ok").checked = !!v.confirmado;
    $("voice-build").disabled = n < 1;
    $("draft-count").textContent = state.drafts.length;
    $("draft-list").replaceChildren(...(state.drafts.length ? state.drafts.map((draft) => {
      const status = h("select", { "aria-label": `Estado de ${draft.title}` },
        ...[["rascunho", "Rascunho"], ["em-revisao", "Em revisão"], ["final", "Final"]].map(([value, label]) => h("option", { value, selected: draft.status === value, text: label })));
      status.addEventListener("change", () => { draft.status = status.value; draft.updated = TODAY; saveDrafts(); renderEscrita(); });
      const words = draft.content.trim() ? draft.content.trim().split(/\s+/).length : 0;
      return h("article", { class: "draft-card" },
        h("div", { class: "idea-head" }, h("div", {}, h("div", { class: "title", text: draft.title }), h("div", { class: "meta" }, h("span", { class: "chip", text: `${words} palavras` }), h("span", { class: "chip", text: shortDate(draft.updated || draft.created || TODAY) }))), status),
        draft.objective || draft.audience ? h("p", { class: "muted small", text: [draft.objective && `Objetivo: ${draft.objective}`, draft.audience && `Para: ${draft.audience}`].filter(Boolean).join(" · ") }) : null,
        h("div", { class: "actions" }, h("button", { class: "btn small primary", type: "button", text: "Abrir", onclick: () => openDraft(draft) }),
          h("button", { class: "btn small ghost", type: "button", text: "Apagar", onclick: () => { if (confirm(`Apagar o rascunho «${draft.title}»?`)) { state.drafts = state.drafts.filter((x) => x !== draft); if (currentDraftId === draft.id) clearWriting(); saveDrafts(); renderEscrita(); } } })),
      );
    }) : [h("p", { class: "muted", text: "Ainda não tens rascunhos guardados." })]));
    updateWritingStats();
  }
  $("wr-text").addEventListener("input", updateWritingStats);
  $("draft-new").addEventListener("click", () => { if (!$("wr-text").value.trim() || confirm("Começar um rascunho novo? Confirma que guardaste o atual se o queres manter.")) clearWriting(); });
  $("draft-save").addEventListener("click", () => {
    const content = $("wr-text").value.trim(); if (!content) { $("wr-note").textContent = "Escreve alguma coisa antes de guardar."; return; }
    const title = $("wr-title").value.trim() || content.split(/\s+/).slice(0, 8).join(" ");
    let draft = state.drafts.find((x) => x.id === currentDraftId);
    if (!draft) { draft = { id: newId(), created: TODAY, status: "rascunho" }; state.drafts.unshift(draft); currentDraftId = draft.id; }
    Object.assign(draft, { title: title.slice(0, 160), content: content.slice(0, 20000), objective: $("wr-objective").value.trim().slice(0, 300), audience: $("wr-audience").value.trim().slice(0, 200), updated: TODAY });
    $("wr-title").value = draft.title; saveDrafts(); renderEscrita(); $("wr-note").textContent = "Rascunho guardado.";
  });
  $("voice-add").addEventListener("click", () => {
    const t = $("voice-sample").value.trim(); if (!t) return;
    if (state.voice.amostras.length >= 5) { $("voice-note").textContent = "Já tens 5 textos. Retira um para acrescentar outro."; return; }
    state.voice.amostras.push(t.slice(0, 4000)); state.voice.confirmado = false;
    saveVoice(); $("voice-sample").value = ""; $("voice-note").textContent = state.voice.amostras.length < 3 ? "Com 3 ou mais textos o perfil fica mais fiável." : ""; renderEscrita();
  });
  $("voice-ok").addEventListener("change", (e) => { state.voice.confirmado = e.target.checked; saveVoice(); renderEscrita(); });
  $("voice-build").addEventListener("click", () => {
    const v = state.voice;
    runAI({ go: $("voice-build"), stop: $("voice-stop"), note: $("voice-note"), work: async (signal) => {
      $("voice-profile-wrap").hidden = false; $("voice-profile").textContent = "…";
      const { text } = await sampleFn([
        SAFE,
        "Descreve a VOZ de escrita desta pessoa a partir dos textos dela. Não a compares com autores. Cada característica leva um exemplo curto tirado dos textos (entre aspas).",
        "Secções (títulos curtos): Tom; Ritmo e frases; Vocabulário (o que usa e o que evita); Imagens e metáforas; Humor; Pessoa e distância narrativa; Temas recorrentes.",
        v.amostras.length < 3 ? "Há menos de 3 textos: começa com a linha [Incerto: poucos textos]." : "",
        "No máximo 300 palavras.",
        "", ...v.amostras.map((a, i) => `TEXTO ${i + 1}:\n"""\n${a}\n"""`),
      ].filter(Boolean).join("\n"), opts({ signal, onText: ({ text }) => { $("voice-profile").textContent = text; } }));
      v.perfil = text; v.confirmado = false; saveVoice(); renderEscrita();
    } });
  });
  $("wr-go").addEventListener("click", () => {
    const text = $("wr-text").value.trim(); if (!text) return;
    const v = state.voice;
    const task = {
      planear: [
        "Ajuda a PLANEAR este texto sem o escrever. Identifica a ideia central e propõe uma estrutura com 3 a 7 blocos.",
        "Em cada bloco indica: objetivo, pergunta a responder e material que ainda falta. Termina com o melhor primeiro passo de 10 minutos.",
        "Se as notas forem vagas, faz primeiro até 3 perguntas essenciais. Não inventes factos nem conteúdo.",
      ],
      coerencia: [
        "Verifica a COERÊNCIA INTERNA do texto: quem sabe o quê e quando; tempo e lugar; causa e efeito; personagens que agem contra o que o texto estabeleceu; objetos que aparecem ou desaparecem.",
        "Para cada problema: citação curta, porque é um problema, e severidade (grave / médio / menor). Diz também 1–2 coisas que funcionam.",
        "NÃO reescrevas o texto. No máximo 7 pontos.",
      ],
      tom: [
        "Compara o texto com o PERFIL DE VOZ da pessoa (abaixo). Aponta onde o texto se afasta da voz dela, com citação curta, e pergunta se o desvio é intencional.",
        v.perfil ? `PERFIL DE VOZ${v.confirmado ? " (confirmado pela pessoa)" : " (ainda não confirmado)"}:\n${v.perfil}` : "Não existe perfil de voz: diz isso na primeira linha, marca tudo como [Incerto] e sugere construir o perfil em \"A minha voz\".",
        v.amostras.length < 3 ? "O perfil tem menos de 3 textos: marca as observações como [Incerto]." : "",
        "NÃO reescrevas o texto. No máximo 7 pontos.",
      ],
      desbloquear: [
        "A pessoa está bloqueada. Faz no máximo 3 perguntas abertas que a ajudem a avançar (o que quer a personagem agora; o pior que pode acontecer; o que ninguém diz).",
        "Depois, 3 direções possíveis numa linha cada: A) conservadora, B) alternativa, C) radical. Descreve-as, não as escrevas em prosa.",
        v.perfil ? `Respeita esta voz:\n${v.perfil}` : "",
      ],
    }[wrMode];
    runAI({ go: $("wr-go"), stop: $("wr-stop"), note: $("wr-note"), work: async (signal) => {
      $("wr-out").hidden = false; $("wr-result").textContent = "…";
      $("wr-out-title").textContent = wrLabels[wrMode];
      await sampleFn([
        SAFE,
        "PAPEL: editor que ajuda a pessoa a escrever como ELA escreve. Nunca escreves por ela.",
        ...task.filter(Boolean),
        $("wr-objective").value.trim() ? `OBJETIVO: ${$("wr-objective").value.trim().slice(0, 300)}` : "",
        $("wr-audience").value.trim() ? `PÚBLICO: ${$("wr-audience").value.trim().slice(0, 200)}` : "",
        "", "TEXTO:", '"""', text.slice(0, 16000), '"""',
      ].filter(Boolean).join("\n"), opts({ signal, onText: ({ text }) => { $("wr-result").textContent = text; } }));
    } });
  });
  $("wr-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("wr-result").textContent); $("wr-copy").textContent = "Copiado"; }
    catch { $("wr-copy").textContent = "Seleciona e copia"; }
    setTimeout(() => { $("wr-copy").textContent = "Copiar"; }, 2000);
  });

  // =========================================================== ficheiros e pesquisa fora da página
  let downloadsNs = null;
  async function offerFile(filename, data, note) {
    if (!downloadsNs) {
      note.textContent = LOCAL_TOKEN
        ? "Aqui os dados já estão no teu computador: usa /sincronizar no Claude Code para os juntar aos ficheiros do Rumo."
        : "Descarregar só funciona dentro do Claude.";
      return;
    }
    try { await downloadsNs.save({ filename, data }); note.textContent = "Ficheiro entregue."; }
    catch (e) {
      note.textContent = e?.code === "declined" ? "Cancelado." : e?.code === "rate_limited" ? "Já há um pedido aberto. Tenta daqui a pouco." : "Não foi possível descarregar nesta vista.";
    }
  }

  const MD_HEADER = [
    "# Tarefas",
    "",
    "<!--",
    "Formato: - [ ] Título !1 @contexto ^AAAA-MM-DD ≈15m *mensal ~2 id:abc123",
    "!1 alta · !3 baixa · ^prazo · *diaria|*semanal|*mensal|*anual · ~vezes adiada · id: sincronização (não mexer)",
    "Exportado do Rumo. No computador: node scripts/rotina.mjs hoje",
    "-->",
  ].join("\n");
  function taskLine(t) {
    return [
      `- [${t.feita ? "x" : " "}] ${t.t}`,
      Number(t.p) !== 2 ? `!${t.p}` : "",
      ...(t.ctx || []).map((c) => `@${c}`),
      t.due ? `^${t.due}` : "", t.est ? `≈${t.est}` : "", t.rep ? `*${t.rep}` : "",
      t.adiada ? `~${t.adiada}` : "", t.feita ? `✓${t.feita}` : "", `id:${t.id}`,
    ].filter(Boolean).join(" ");
  }
  function tasksToMd(list) {
    const block = (title, items) => [`## ${title}`, ...items.map(taskLine)].join("\n");
    return `${[MD_HEADER,
      block("Caixa de entrada", list.filter((t) => t.inbox)),
      block("Tarefas", list.filter((t) => !t.inbox && !t.algumDia)),
      block("Algum dia", list.filter((t) => !t.inbox && t.algumDia)),
    ].join("\n\n")}\n`;
  }
  function mdToTasks(text) {
    const out = [];
    let section = "", inC = false;
    for (const line of text.split(/\r?\n/)) {
      const o = line.includes("<!--"), c = line.includes("-->");
      if (inC || o) { inC = !c && (inC || o); continue; }
      const hh = line.match(/^##\s+(.*)$/);
      if (hh) { section = hh[1].trim(); continue; }
      const m = line.match(/^\s*- \[( |x|X)\] (.*)$/);
      if (!m) continue;
      let s = m[2];
      const take = (re) => { const r = s.match(re); if (r) s = s.replace(r[0], ""); return r?.[1]; };
      const feita = take(/(?:^|\s+)✓(\d{4}-\d{2}-\d{2})(?!\S)/);
      const due = take(/(?:^|\s+)\^(\d{4}-\d{2}-\d{2})(?!\S)/);
      const prio = take(/(?:^|\s+)!([123])(?!\S)/);
      const adiada = take(/(?:^|\s+)~(\d+)(?!\S)/);
      const est = take(/(?:^|\s+)≈(\d+[mh])(?!\S)/);
      const rep = take(/(?:^|\s+)\*(diaria|semanal|mensal|anual)(?!\S)/);
      const id = take(/(?:^|\s+)id:([a-z0-9]+)(?!\S)/);
      const ctx = [...s.matchAll(/(?:^|\s)@([\p{L}\p{N}_-]+)/gu)].map((x) => x[1]);
      s = s.replace(/(?:^|\s+)@[\p{L}\p{N}_-]+/gu, "").trim();
      if (!s) continue;
      out.push({
        id: id || newId(), t: s, p: prio ? Number(prio) : 2, due: due || "", rep: rep || "", adiada: Number(adiada) || 0,
        feita: feita || (m[1] !== " " ? TODAY : null), inbox: section === "Caixa de entrada", algumDia: section === "Algum dia", ctx, est: est || "",
      });
    }
    return out;
  }
  $("md-export").addEventListener("click", () => {
    if (state.tasksExample) { $("md-note").textContent = "Isto ainda é o exemplo. Carrega em \"Começar a minha lista\" primeiro."; return; }
    offerFile("tarefas.md", tasksToMd(state.tasks), $("md-note"));
  });
  $("md-file").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    try {
      const list = mdToTasks(await f.text());
      if (!list.length) { $("md-note").textContent = "Não encontrei tarefas no ficheiro (linhas do tipo \"- [ ] …\")."; return; }
      const current = state.tasksExample ? 0 : state.tasks.length;
      if (!confirm(`Substituir ${current ? `as ${current} tarefas desta página` : "a lista desta página"} pelas ${list.length} do ficheiro?`)) return;
      state.tasks = list; state.tasksExample = false; saveTasks(); renderAll();
      $("md-note").textContent = `Importadas ${list.length} tarefas.`;
    } catch { $("md-note").textContent = "Não foi possível ler o ficheiro."; }
  });
  $("csv-export").addEventListener("click", () => {
    const m = state.month;
    const cell = (v) => (/[;"\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const rows = [...movOf(m)].sort((a, b) => a.d.localeCompare(b.d))
      .map((x) => [x.d, x.desc, Number(x.v).toFixed(2).replace(".", ","), x.cat || "", x.acc || ""].map(cell).join(";"));
    if (!rows.length) { $("csv-note").textContent = "Sem movimentos neste mês."; return; }
    offerFile(`${m}.csv`, `${["data;descricao;valor;categoria;conta", ...rows].join("\n")}\n`, $("csv-note"));
  });

  /** Copia um pedido para uma conversa normal do Claude (que pode pesquisar na web). */
  async function copyForClaude(prompt, outEl) {
    outEl.hidden = false;
    const area = h("textarea", { readonly: true, "aria-label": "Pedido para colar no Claude", style: "min-height: 90px" });
    area.value = prompt;
    let copied = false;
    try { await navigator.clipboard.writeText(prompt); copied = true; } catch { /* sem acesso à área de transferência */ }
    outEl.replaceChildren(
      h("p", { class: "note", text: copied
        ? "Copiado. Abre uma conversa nova no Claude (com a pesquisa na web ativa), cola e envia. A resposta vem com fontes."
        : "Seleciona o texto abaixo, copia-o, e cola-o numa conversa nova no Claude (com a pesquisa na web ativa)." }),
      area,
    );
    if (!copied) { area.focus(); area.select(); }
  }
  const WEB_RULES = [
    "Responde em português europeu.",
    "Pesquisa na web antes de responder. Cada número ou facto (taxas, impostos, limites, estatísticas, datas) leva a fonte e a data de consulta.",
    "Dá preferência a fontes oficiais ou primárias. Se não encontrares, diz \"não encontrado\" em vez de estimar.",
    "Separa facto, opinião e sugestão. Termina com a lista de fontes (com links).",
  ].join("\n");
  $("inv-web").addEventListener("click", () => {
    const q = $("inv-q").value.trim();
    if (!q) { $("inv-note").textContent = "Escreve primeiro a pergunta."; return; }
    const ctx = $("inv-ctx").checked && state.goals && !state.finExample ? `\nO meu contexto (dados meus): ${state.goals.slice(0, 1500)}` : "";
    copyForClaude([
      WEB_RULES,
      "Estou em Portugal e quero perceber opções de poupança e investimento. Não quero recomendações de produtos concretos: explica tipos de opção, riscos, liquidez, custos e fiscalidade atual, e que perguntas devo fazer ao banco ou ao intermediário.",
      "Fontes de referência: Portal do Cliente Bancário (Banco de Portugal), CMVM, IGCP (certificados de aforro e do Tesouro), Portal das Finanças.",
      ctx,
      "",
      `Pergunta: ${q}`,
    ].filter(Boolean).join("\n"), $("inv-web-out"));
  });
  $("talk-verify").addEventListener("click", () => {
    const ultimas = conversa.slice(-8);
    if (!ultimas.length) { $("talk-note").textContent = "Ainda não há conversa para verificar."; return; }
    copyForClaude([
      WEB_RULES,
      "Verifica os factos de que depende esta conversa. Para cada afirmação factual: [Verificado: fonte, data], [Disputado: o que dizem as fontes] ou [Não encontrado].",
      "Depois diz, com base nesses factos, o que se mantém e o que cai. Não concordes só para agradar.",
      "",
      "Conversa até agora:",
      ...ultimas.map((t) => `${t.role === "user" ? "Eu" : "Claude"}: ${t.content.slice(0, 1500)}`),
    ].join("\n"), $("talk-verify-out"));
  });

  // =========================================================== CARREIRA
  // As mesmas regras do scripts/carreira.mjs, para a página e o computador contarem igual.
  const J_STATES = ["guardada", "candidatei", "entrevista", "proposta", "aceite", "recusada", "sem-resposta", "desisti"];
  const J_ACTIVE = ["guardada", "candidatei", "entrevista", "proposta"];
  // Singular para uma vaga (seletor, avisos); plural para os títulos dos grupos.
  const J_LABEL = { guardada: "Guardada", candidatei: "Candidatei", entrevista: "Entrevista", proposta: "Proposta", aceite: "Aceite", recusada: "Recusada", "sem-resposta": "Sem resposta", desisti: "Desisti" };
  const J_GROUP = { guardada: "Guardadas", candidatei: "Candidatei", entrevista: "Entrevistas", proposta: "Propostas" };
  const J_FOLLOW = { candidatei: 7, entrevista: 3 };
  const J_STALE = 21;
  const jobKey = (x) => `${fold(x.empresa).replace(/[^a-z0-9]/g, "")}|${fold(x.cargo).replace(/[^a-z0-9]/g, "")}`;
  const safeJobLink = (value) => { try { const u = new URL(value); return ["http:", "https:"].includes(u.protocol) ? u.href : ""; } catch { return ""; } };

  $("job-state").replaceChildren(...J_STATES.map((s) => h("option", { value: s, text: J_LABEL[s] })));

  function mutateJobs(fn) { fn(state.jobs); saveJobs(); renderCandidaturas(); }
  function moveJob(job, estado) {
    mutateJobs(() => {
      const changed = estado !== job.estado;
      job.estado = estado;
      job.data = TODAY;
      if (!J_ACTIVE.includes(estado)) job.proximo = "";
      else if (changed && J_FOLLOW[estado]) job.proximo = addDays(TODAY, J_FOLLOW[estado]);
    });
  }
  function saveFoundJob(v) {
    if (state.jobsExample) { flash("Começa primeiro a tua lista, para não misturar dados reais com o exemplo.", 3000); return; }
    mutateJobs((list) => list.push({ id: v.id, empresa: v.empresa, cargo: v.cargo, local: v.local || "", estado: "guardada", nota: "", data: TODAY, proximo: "", fonte: v.fonte || "", link: safeJobLink(v.link), obs: "" }));
  }
  // ---------- Candidaturas: um passo de cada vez ----------
  // 1 Preparar (CV) · 2 Encontrar (procurar) · 3 Decidir (vagas) · 4 Acompanhar (candidaturas).
  // Cada secção pertence a UMA etapa: nada do "preparar" aparece no "encontrar".
  const ETAPAS = {
    1: ["cv-panel"],
    2: ["j-li-panel"],
    3: ["j-vagas-link", "j-add-panel"],
    4: ["jobs-example", "j-kpis", "j-due-panel", "j-board", "j-closed-panel"],
  };
  const TODAS_AS_SECCOES = Object.values(ETAPAS).flat();
  let etapaEscolhida = null; // o que ele carregou na barra; null = a etapa sugerida
  function etapaSugerida() {
    if (!state.cv?.markdown) return 1;
    if (state.jobs.length && !state.jobsExample) return 4;
    if (vagasAbertas().length) return 3;
    return 2;
  }
  const etapaCarreira = () => etapaEscolhida ?? etapaSugerida();

  /** Mostra só as secções desta etapa e marca a barra: feita, atual, por fazer. */
  function aplicarEtapa(etapa) {
    const sugerida = etapaSugerida();
    for (const el of $("j-flow").querySelectorAll(".flow-step")) {
      const n = Number(el.dataset.step);
      el.classList.toggle("atual", n === etapa);
      el.classList.toggle("feito", n < sugerida);
      el.setAttribute("aria-selected", String(n === etapa));
    }
    const desta = new Set(ETAPAS[etapa] || []);
    for (const id of TODAS_AS_SECCOES) {
      const el = $(id);
      if (!el) continue;
      const mostra = desta.has(id);
      // A agenda e o aviso do exemplo têm regra própria de conteúdo: aqui só se podem esconder.
      el.hidden = ["j-due-panel", "jobs-example"].includes(id) ? el.hidden || !mostra : !mostra;
    }
    // Na etapa do CV, a caixa abre logo; nas outras fica fechada para não roubar a atenção.
    if (etapa === 1) $("cv-panel").open = true;
    if (etapa === 2) $("j-li-panel").open = true;
    $("j-showall-row").hidden = etapa === sugerida;
    $("j-showall-note").textContent = etapa === sugerida ? "" : `Estás a ver o passo ${etapa}; o teu passo é o ${sugerida}.`;
  }
  $("j-next-kpi").addEventListener("click", () => selectTab("vagas"));
  for (const b of document.querySelectorAll("#j-flow .flow-step")) {
    b.addEventListener("click", () => { etapaEscolhida = Number(b.dataset.step); renderCandidaturas(); });
  }
  $("j-showall").addEventListener("click", () => { etapaEscolhida = null; renderCandidaturas(); });

  // ---------- separador Vagas: decidir, descartar e preparar a candidatura ----------
  const saveDropped = () => save("vagas-fora", { items: state.dropped });
  const dropJob = (v) => { state.dropped = [...new Set([...state.dropped, v.id])]; saveDropped(); renderVagas(); };
  /** Vagas ainda por decidir: tira as que já estão na lista de candidaturas e as descartadas. */
  function vagasAbertas() {
    const taken = new Set([...state.jobs.map((j) => j.id), ...state.jobs.map(jobKey)]);
    return state.found.filter((v) => !taken.has(v.id) && !taken.has(jobKey(v)) && !state.dropped.includes(v.id));
  }
  function renderVagas() {
    const abertas = vagasAbertas();
    const filtro = fold($("v-filter").value);
    const lista = filtro ? abertas.filter((v) => fold([v.cargo, v.empresa, v.local, v.fonte].join(" ")).includes(filtro)) : abertas;
    $("v-open").textContent = abertas.length;
    $("v-kept").textContent = state.jobs.filter((j) => !state.jobsExample).length;
    $("v-dropped").textContent = state.dropped.length;
    $("v-dropped-sub").textContent = state.dropped.length ? "não voltam a aparecer" : "";
    $("v-restore").hidden = !state.dropped.length;
    $("v-list").replaceChildren(...(lista.length ? lista.map((v) => {
      const link = safeJobLink(v.link);
      // O que a pesquisa devolve vem longo (locais com listas de estados): uma linha chega,
      // e o resto fica no title, para a lista não virar um muro de texto.
      const detalhe = [v.local, v.fonte].filter(Boolean).join(" · ");
      return h("li", { class: "vaga" },
        h("div", { class: "vaga-head" },
          h("h4", {}, v.cargo, h("span", { class: "muted", text: ` · ${v.empresa}` })),
          h("span", { class: "chip", text: v.visto ? shortDate(v.visto) : "nova" })),
        detalhe ? h("p", { class: "muted small vaga-meta", title: detalhe, text: detalhe }) : null,
        h("div", { class: "vaga-acoes" },
          h("button", { class: "btn small accent", text: "Candidatar-me", title: "Prepara o texto e abre a vaga; o envio é teu", onclick: () => openApply(v) }),
          h("button", { class: "btn small", text: "Guardar", title: "Fica na lista para decidires depois", onclick: () => { saveFoundJob(v); renderVagas(); } }),
          link ? h("a", { class: "btn small ghost", href: link, target: "_blank", rel: "noopener noreferrer", text: "Abrir vaga" }) : null,
          h("button", { class: "btn small ghost", text: "Descartar", "aria-label": `Descartar ${v.cargo} na ${v.empresa}`, onclick: () => dropJob(v) }),
        ),
      );
    }) : [h("li", { class: "muted", text: abertas.length ? "Nada com esse filtro." : "Sem vagas por decidir. No computador, pede ao Rumo para procurar vagas e depois atualiza o painel." })]));
    $("v-note").textContent = state.mode === "cloud"
      ? "A procura corre no computador; esta página não tem acesso à internet."
      : "Liga este painel ao Rumo no computador para receberes vagas novas.";
  }
  $("v-filter").addEventListener("input", renderVagas);
  $("v-restore").addEventListener("click", () => { state.dropped = []; saveDropped(); renderVagas(); });

  let applying = null;
  $("v-apply-close").addEventListener("click", () => { $("v-apply-panel").hidden = true; applying = null; });
  $("v-apply-copy").addEventListener("click", async () => {
    try { await navigator.clipboard.writeText($("v-apply-text").textContent); $("v-apply-note").textContent = "Copiado."; }
    catch { $("v-apply-note").textContent = "Copia o texto à mão (Ctrl+C)."; }
  });
  $("v-apply-done").addEventListener("click", () => {
    if (!applying) return;
    saveFoundJob(applying);
    const guardada = state.jobs.find((j) => j.id === applying.id || jobKey(j) === jobKey(applying));
    if (guardada) moveJob(guardada, "candidatei");
    $("v-apply-note").textContent = "Marcada como candidatura enviada. O seguimento fica marcado para daqui a 7 dias.";
    $("v-apply-panel").hidden = true;
    applying = null;
    renderVagas();
  });
  function openApply(v) {
    applying = v;
    const link = safeJobLink(v.link);
    $("v-apply-panel").hidden = false;
    $("v-apply-title").textContent = `Candidatura: ${v.cargo} · ${v.empresa}`;
    $("v-apply-open").href = link || "#";
    $("v-apply-open").hidden = !link;
    $("v-apply-note").textContent = "";
    $("v-apply-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
    const cv = state.cv?.markdown || "";
    if (!cv) {
      $("v-apply-text").textContent = "Ainda não tens o CV no Rumo. Vai a Candidaturas → O meu CV, ou usa /cv no computador: sem CV, qualquer texto meu seria inventado.";
      return;
    }
    if (!sampleFn) { $("v-apply-text").textContent = "O Claude não está disponível aqui para escrever o rascunho."; return; }
    runAI({ go: $("v-apply-done"), stop: $("v-apply-close"), note: $("v-apply-note"), work: async (signal) => {
      $("v-apply-text").textContent = "…";
      await sampleFn([
        SAFE,
        "PAPEL: escreves o rascunho de uma candidatura curta, em nome da pessoa, para ELA rever e enviar.",
        "- Usa só o que está no CV dela. Não inventes experiências, números, motivações nem conhecimentos sobre a empresa.",
        "- No máximo 150 palavras: porque se candidata, as duas ou três experiências do CV que mais encaixam, e uma frase final de disponibilidade.",
        "- Tom profissional e direto, em português de Portugal, sem fórmulas gastas ('venho por este meio').",
        "- Se o CV não encaixar mesmo na vaga, di-lo numa primeira linha entre parênteses, em vez de floreares.",
        "",
        `VAGA: ${v.cargo} · ${v.empresa}${v.local ? ` · ${v.local}` : ""}${link ? ` · ${link}` : ""}`,
        "", "CV:", '"""', cv.slice(0, 12000), '"""',
      ].join("\n"), opts({ signal, onText: ({ text }) => { $("v-apply-text").textContent = text; } }));
    } });
  }

  const actionFor = (job) => job.estado === "guardada" ? "Decidir se te candidatas" : job.estado === "candidatei" ? "Fazer seguimento" : job.estado === "entrevista" ? "Preparar a próxima conversa" : "Rever a proposta";
  function careerActions(jobs, found) {
    const out = [];
    for (const j of jobs) {
      if (!J_ACTIVE.includes(j.estado)) continue;
      if (j.proximo && j.proximo <= TODAY) out.push({ priority: 0, job: j, title: actionFor(j), reason: j.proximo < TODAY ? `Em atraso desde ${shortDate(j.proximo)}.` : "Marcado para hoje." });
      else if (j.estado === "guardada" && !j.proximo) out.push({ priority: 1, job: j, title: actionFor(j), reason: j.nota ? `Tem avaliação de ${j.nota}/5.` : "Ainda não foi avaliada." });
      else if (["entrevista", "proposta"].includes(j.estado) && !j.proximo) out.push({ priority: 2, job: j, title: actionFor(j), reason: "Ainda não tem uma data para o próximo passo." });
    }
    for (const v of found) out.push({ priority: 3, found: v, title: "Ver uma vaga nova", reason: `${v.cargo} · ${v.empresa}` });
    return out.sort((a, b) => a.priority - b.priority || ((a.job?.proximo || "9999").localeCompare(b.job?.proximo || "9999")));
  }
  function actionButtons(action) {
    const item = action.job || action.found;
    const buttons = [];
    const link = safeJobLink(item.link);
    if (link) buttons.push(h("a", { class: "btn small", href: link, target: "_blank", rel: "noopener noreferrer", text: "Abrir vaga" }));
    if (action.found) buttons.push(h("button", { class: "btn small accent", text: "Guardar para decidir", onclick: () => saveFoundJob(action.found) }));
    else if (action.job.estado === "guardada") buttons.push(h("button", { class: "btn small accent", text: "Já me candidatei", onclick: () => moveJob(action.job, "candidatei") }));
    else if (action.job.estado === "candidatei") buttons.push(h("button", { class: "btn small accent", text: "Já contactei", onclick: () => mutateJobs(() => { action.job.proximo = addDays(TODAY, 7); action.job.obs = [action.job.obs, `${TODAY}: contactei`].filter(Boolean).join(" | "); }) }));
    else buttons.push(h("button", { class: "btn small accent", text: "Lembrar em 3 dias", onclick: () => mutateJobs(() => { action.job.proximo = addDays(TODAY, 3); }) }));
    return buttons;
  }
  function jobCard(job) {
    const age = job.data ? daysBetween(job.data, TODAY) : null;
    const due = J_ACTIVE.includes(job.estado) && job.proximo && job.proximo <= TODAY;
    const sel = h("select", { class: "state-select", "aria-label": `Estado de ${job.cargo} na ${job.empresa}` },
      ...J_STATES.map((s) => h("option", { value: s, text: J_LABEL[s] })));
    sel.value = job.estado;
    sel.addEventListener("change", () => moveJob(job, sel.value));
    return h("li", { class: "task" },
      h("span", { class: `grade${job.nota ? "" : " unrated"}`, title: job.nota ? "Nota da avaliação (1 a 5)" : "Ainda sem avaliação; pede ao Rumo para analisar esta vaga", text: job.nota || "—" }),
      h("div", {},
        h("div", { class: "title" }, job.cargo, h("span", { class: "muted", text: ` · ${job.empresa}` })),
        h("div", { class: "meta" },
          job.local ? h("span", { class: "chip", text: job.local }) : null,
          age !== null ? h("span", { class: "chip", text: age === 0 ? "hoje" : `há ${age} d` }) : null,
          job.proximo && J_ACTIVE.includes(job.estado)
            ? h("span", { class: `chip ${due ? (job.proximo < TODAY ? "late" : "today") : ""}`, text: due ? `contactar${job.proximo < TODAY ? ` (desde ${shortDate(job.proximo)})` : " hoje"}` : `contactar a ${shortDate(job.proximo)}` })
            : null,
          job.estado === "candidatei" && age !== null && age >= J_STALE ? h("span", { class: "chip chronic", text: `sem notícias há ${age} d` }) : null,
          h("span", { class: "chip", text: job.fonte || "manual" }),
        ),
        job.obs ? h("div", { class: "muted small", text: job.obs }) : null,
      ),
      h("span", { class: "actions" },
        safeJobLink(job.link) ? h("a", { class: "btn small ghost", href: safeJobLink(job.link), target: "_blank", rel: "noopener noreferrer", text: "Abrir vaga" }) : null,
        sel,
        h("button", { class: "btn small ghost", text: "Apagar", onclick: () => { if (confirm(`Apagar "${job.cargo} · ${job.empresa}"?`)) mutateJobs((list) => list.splice(list.indexOf(job), 1)); } }),
      ),
    );
  }

  function renderCandidaturas() {
    $("jobs-example").hidden = !state.jobsExample;
    const jobs = state.jobs;
    const active = jobs.filter((j) => J_ACTIVE.includes(j.estado));
    const sent = jobs.filter((j) => j.estado !== "guardada");
    const replied = jobs.filter((j) => ["entrevista", "proposta", "aceite", "recusada"].includes(j.estado));
    const due = active.filter((j) => j.proximo && j.proximo <= TODAY).sort((a, b) => a.proximo.localeCompare(b.proximo));
    const count = (s) => jobs.filter((j) => j.estado === s).length;
    const taken = new Set([...jobs.map((j) => j.id), ...jobs.map(jobKey)]);
    const found = state.found.filter((v) => !taken.has(v.id) && !taken.has(jobKey(v)));
    const next = careerActions(jobs, found);

    $("j-next-count").textContent = next.length;
    $("j-active").textContent = active.length;
    $("j-active-sub").textContent = [count("entrevista") && `${count("entrevista")} em entrevista`, count("proposta") && `${count("proposta")} com proposta`].filter(Boolean).join(" · ");
    $("j-rate").textContent = sent.length ? `${Math.round((replied.length / sent.length) * 100)}%` : "—";
    $("j-rate-sub").textContent = sent.length ? `${replied.length} de ${sent.length} enviadas` : "ainda nada enviado";
    // O "o que fazer agora" segue a etapa: primeiro o CV, depois procurar, depois decidir.
    const etapa = etapaCarreira();
    const guia = {
      1: {
        titulo: "Começa pelo teu CV",
        razao: "Sem CV, o Rumo não sabe o que tens para oferecer: não avalia vagas nem escreve candidaturas. Envia o ficheiro (PDF, Markdown ou texto) ou cola o texto aqui em baixo. Depois de guardado, o Claude diz-te a que cargos te podes candidatar.",
        botoes: () => [h("button", { class: "btn accent", text: "Enviar o meu CV", onclick: () => { $("cv-panel").open = true; $("cv-panel").scrollIntoView({ behavior: "smooth", block: "nearest" }); $("cv-file").focus(); } })],
      },
      2: {
        titulo: "Procurar vagas",
        razao: LOCAL_TOKEN
          ? "O CV está no Rumo. Escreve o que procuras aqui em baixo e carrega em «Procurar agora»: o Claude pesquisa as vagas públicas e mete-as no separador Vagas."
          : "O CV está no Rumo. A procura corre no computador: pede ao Rumo «procura vagas de…» e depois atualiza este painel.",
        botoes: () => [h("button", { class: "btn accent", text: "Procurar vagas", onclick: () => { $("j-li-panel").open = true; $("li-words").focus(); $("j-li-panel").scrollIntoView({ behavior: "smooth", block: "nearest" }); } })],
      },
      3: {
        titulo: vagasAbertas().length ? `Decidir ${vagasAbertas().length} ${vagasAbertas().length === 1 ? "vaga" : "vagas"}` : "Nada por decidir",
        razao: vagasAbertas().length
          ? "A procura trouxe vagas por decidir. Descarta o que não serve e candidata-te ao que interessa; o Rumo prepara o texto a partir do teu CV."
          : "Ainda não há vagas por decidir. Volta ao passo 2 e procura, ou acrescenta uma vaga à mão aqui em baixo.",
        botoes: () => [h("button", { class: "btn accent", text: "Ver as vagas", onclick: () => selectTab("vagas") })],
      },
    }[etapa];
    const first = next[0];
    if (guia) {
      $("j-next-title").textContent = guia.titulo;
      $("j-next-reason").textContent = guia.razao;
      $("j-next-actions").replaceChildren(...guia.botoes());
    } else {
      $("j-next-title").textContent = first ? first.title : "Procurar oportunidades";
      $("j-next-reason").textContent = first ? `${first.reason} ${first.job ? `${first.job.cargo} · ${first.job.empresa}` : ""}`.trim() : "Não tens nada pendente. No computador, pede ao Rumo para procurar vagas adequadas ao teu perfil.";
      $("j-next-actions").replaceChildren(...(first ? actionButtons(first) : []));
    }

    $("j-due-panel").hidden = !due.length;
    $("j-due-list").replaceChildren(...due.map((j) => h("li", { class: "task" },
      h("span", { class: `grade${j.nota ? "" : " unrated"}`, text: j.nota || "—" }),
      h("div", {}, h("div", { class: "title", text: `${j.cargo} · ${j.empresa}` }), h("div", { class: "muted small", text: `${actionFor(j)} · marcado para ${shortDate(j.proximo)}` })),
      h("span", { class: "actions" },
        h("button", { class: "btn small", text: "Contactei", title: "Volta a lembrar daqui a 7 dias", onclick: () => mutateJobs(() => { j.proximo = addDays(TODAY, 7); j.obs = [j.obs, `${TODAY}: contactei`].filter(Boolean).join(" | "); }) }),
        h("button", { class: "btn small ghost", text: "+3 dias", onclick: () => mutateJobs(() => { j.proximo = addDays(TODAY, 3); }) }),
        j.estado === "candidatei" ? h("button", { class: "btn small ghost", text: "Sem resposta", onclick: () => moveJob(j, "sem-resposta") }) : null,
      ),
    )));

    const order = (a, b) => (a.proximo || "9999").localeCompare(b.proximo || "9999") || (b.data || "").localeCompare(a.data || "");
    const stages = J_ACTIVE.map((s) => [s, active.filter((j) => j.estado === s).sort(order)]).filter(([, list]) => list.length);
    $("j-board").replaceChildren(...(stages.length ? stages.map(([s, list]) => h("div", { class: "panel stage" },
      h("div", { class: "stage-head" }, h("h3", { text: J_GROUP[s] }), h("span", { class: "chip", text: String(list.length) })),
      h("ul", { class: "task-list" }, list.map(jobCard)),
    )) : [h("p", { class: "banner plain", text: "Sem candidaturas em curso. Guarda uma das vagas encontradas, ou acrescenta uma em \"Acrescentar uma candidatura\"." })]));

    // As vagas encontradas têm separador próprio (Vagas), com descartar e candidatar.
    renderVagas();
    aplicarEtapa(etapaCarreira());

    const closed = jobs.filter((j) => !J_ACTIVE.includes(j.estado)).sort((a, b) => (b.data || "").localeCompare(a.data || ""));
    $("j-closed-count").textContent = closed.length;
    $("j-closed-list").replaceChildren(...(closed.length ? closed.map(jobCard) : [h("li", { class: "muted", text: "Nenhuma." })]));
    renderCv();
    renderCargos();
  }

  $("jobs-start").addEventListener("click", () => { state.jobs = []; state.jobsExample = false; saveJobs(); renderCandidaturas(); });
  $("job-form").addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.jobsExample) { flash("Carrega primeiro em \"Começar a minha lista\", no topo.", 3000); return; }
    const empresa = $("job-company").value.trim(), cargo = $("job-role").value.trim();
    if (!empresa || !cargo) return;
    const dup = state.jobs.find((j) => jobKey(j) === jobKey({ empresa, cargo }));
    if (dup) { flash(`Já está na lista (${J_LABEL[dup.estado]}).`, 3000); return; }
    const estado = $("job-state").value;
    mutateJobs((list) => list.push({
      id: `c-${newId()}`, empresa, cargo, local: $("job-place").value.trim(), estado, nota: "", data: TODAY,
      proximo: J_FOLLOW[estado] ? addDays(TODAY, J_FOLLOW[estado]) : "", fonte: $("job-source").value, link: safeJobLink($("job-link").value.trim()), obs: "",
    }));
    e.target.reset();
  });
  // ---------- CV: o Claude organiza o CV dele nas secções da área Carreira ----------
  const CV_SECTIONS = [
    "Cabeçalho: nome no título (# Nome), e por baixo cidade · email · LinkedIn · GitHub (só o que o CV tiver).",
    "## Resumo — duas ou três frases, tiradas do CV.",
    "## Experiência — um ### por cargo: \"### Cargo — Empresa (AAAA-MM a AAAA-MM)\" e pontos com o que fez e o resultado.",
    "## Projetos — um ### por projeto, com link se houver.",
    "## Formação — um ### por curso: \"### Curso — Instituição (AAAA)\".",
    "## Competências — pontos: Linguagens, Ferramentas, Línguas.",
  ].join("\n");
  // ---------- cargos sugeridos a partir do CV ----------
  const cargosEscolhidos = new Set();
  function renderCargos() {
    const cargos = state.cargos || [];
    $("cv-roles-wrap").hidden = !cargos.length;
    $("li-roles-wrap").hidden = !cargos.length;
    $("cv-roles").replaceChildren(...cargos.map((c) => h("li", { class: "task" },
      h("span", {}),
      h("div", {}, h("div", { class: "title", text: c.titulo }), c.porque ? h("div", { class: "muted small", text: c.porque }) : null),
      h("button", { class: "btn small", text: "Procurar este", onclick: () => {
        cargosEscolhidos.clear();
        cargosEscolhidos.add(c.titulo);
        $("li-words").value = c.titulo;
        etapaEscolhida = 2;
        renderCandidaturas();
        renderLinkedin();
        $("j-li-panel").open = true;
        $("j-li-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
      } }),
    )));
    $("li-roles").replaceChildren(...cargos.map((c) => h("button", {
      class: "chip-pick", type: "button", "aria-pressed": String(cargosEscolhidos.has(c.titulo)), text: c.titulo,
      onclick: () => {
        cargosEscolhidos.has(c.titulo) ? cargosEscolhidos.delete(c.titulo) : cargosEscolhidos.add(c.titulo);
        // O que está escolhido aparece na caixa de pesquisa: vê-se logo o que vai ser procurado.
        $("li-words").value = [...cargosEscolhidos].join(" OR ");
        renderCargos();
        renderLinkedin();
      },
    })));
  }
  /** Pede ao Claude os cargos a que este CV dá acesso. Só do CV; nada inventado. */
  function sugerirCargos() {
    const cv = state.cv?.markdown;
    if (!cv) { $("cv-roles-note").textContent = "Preenche primeiro o CV."; return; }
    runAI({ go: $("cv-roles-go"), stop: $("cv-stop"), note: $("cv-roles-note"), work: async (signal) => {
      const data = await sampleFn.json([
        SAFE,
        "PAPEL: a partir do CV desta pessoa, dizes a que cargos ela se pode candidatar HOJE.",
        "- Usa só o que está no CV: experiência, projetos, formação e competências. Não inventes senioridade nem áreas.",
        "- Entre 3 e 6 cargos, com os nomes que aparecem nos anúncios de emprego (ex.: \"Machine Learning Engineer\", \"Data Analyst\").",
        "- Para cada um, uma linha curta com a evidência no CV que o justifica.",
        "- Ordena do encaixe mais forte para o mais fraco.",
        'Responde só com JSON: {"cargos": [{"titulo": string, "porque": string}]}',
        "", "CV:", '"""', cv.slice(0, 12000), '"""',
      ].join("\n"), opts({ signal }));
      const cargos = (Array.isArray(data?.cargos) ? data.cargos : [])
        .map((c) => ({ titulo: String(c.titulo || "").slice(0, 80), porque: String(c.porque || "").slice(0, 200) }))
        .filter((c) => c.titulo).slice(0, 6);
      if (!cargos.length) throw Object.assign(new Error("sem cargos"), { code: "empty_completion" });
      state.cargos = cargos;
      save("cargos", { items: cargos });
      renderCargos();
      $("cv-roles-note").textContent = "Escolhe-os no passo Encontrar para procurar vagas.";
    } });
  }
  $("cv-roles-go").addEventListener("click", sugerirCargos);

  function renderCv() {
    const cv = state.cv;
    $("cv-state").textContent = cv?.markdown
      ? (cv.origem ? `de ${cv.origem}` : `preenchido · ${shortDate(cv.data || TODAY)}`)
      : "por preencher";
  }
  // O PDF é lido aqui no navegador (pdf.js), carregado só quando faz falta.
  const PDFJS_VER = "3.11.174";
  let pdfjs = null;
  async function loadPdfjs() {
    if (pdfjs) return pdfjs;
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.min.js`;
      s.onload = resolve;
      s.onerror = () => reject(new Error("sem-biblioteca"));
      document.head.append(s);
    });
    pdfjs = window.pdfjsLib;
    if (!pdfjs) throw new Error("sem-biblioteca");
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VER}/pdf.worker.min.js`;
    return pdfjs;
  }
  async function pdfToText(file, onPage) {
    const lib = await loadPdfjs();
    const doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false }).promise;
    const paginas = [];
    for (let n = 1; n <= doc.numPages; n++) {
      onPage?.(n, doc.numPages);
      const content = await (await doc.getPage(n)).getTextContent();
      // Junta os fragmentos e quebra a linha quando o PDF o indica (EOL).
      paginas.push(content.items.map((it) => (it.str || "") + (it.hasEOL ? "\n" : " ")).join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim());
    }
    return paginas.join("\n\n");
  }
  $("cv-file").addEventListener("change", async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const note = $("cv-file-note");
    const ehPdf = f.type === "application/pdf" || /\.pdf$/i.test(f.name);
    try {
      if (ehPdf) {
        note.textContent = "A ler o PDF…";
        const texto = await pdfToText(f, (n, total) => { note.textContent = `A ler o PDF… página ${n} de ${total}`; });
        if (!texto.trim()) {
          note.textContent = "Este PDF não tem texto (deve ser digitalizado). Cola o texto à mão, ou usa /cv no computador.";
          return;
        }
        $("cv-text").value = texto.slice(0, 40000);
      } else {
        $("cv-text").value = (await f.text()).slice(0, 40000);
      }
      note.textContent = `${f.name} lido. Carrega em "Preencher com o Claude".`;
    } catch (err) {
      note.textContent = err?.message === "sem-biblioteca"
        ? "Não foi possível carregar o leitor de PDF. Cola o texto, ou usa /cv no computador."
        : "Não foi possível ler o ficheiro.";
    }
  });
  $("cv-go").addEventListener("click", () => {
    const text = $("cv-text").value.trim();
    if (!text) { $("cv-note").textContent = "Cola o CV ou envia o ficheiro primeiro."; return; }
    runAI({ go: $("cv-go"), stop: $("cv-stop"), note: $("cv-note"), work: async (signal) => {
      const data = await sampleFn.json([
        SAFE,
        "PAPEL: passas a limpo o CV de uma pessoa. TRANSCREVES, não escreves.",
        "- Não acrescentes experiências, resultados, números, tecnologias, datas nem contactos que o texto não tenha.",
        "- Podes cortar repetições, uniformizar datas (AAAA-MM) e passar parágrafos a pontos.",
        "- O que o CV não disser fica \"(por preencher)\".",
        "- Mantém a língua do CV.",
        "ESTRUTURA (Markdown, por esta ordem):",
        CV_SECTIONS,
        'Responde só com JSON: {"markdown": string com o CV completo, "porPreencher": [string, ...] com o que faltou}',
        "", "CV:", '"""', text.slice(0, 40000), '"""',
      ].join("\n"), opts({ signal }));
      const md = typeof data?.markdown === "string" ? data.markdown : "";
      if (!md) throw Object.assign(new Error("vazio"), { code: "empty_completion" });
      const falta = Array.isArray(data?.porPreencher) ? data.porPreencher.map(String) : [];
      $("cv-out").hidden = false;
      $("cv-result").textContent = md;
      $("cv-missing").textContent = falta.length ? `Por preencher: ${falta.join(" · ")}` : "Nada ficou por preencher.";
      $("cv-save-note").textContent = "Confere antes de guardar: o CV é teu e é a única fonte usada para avaliar vagas.";
    } });
  });
  /** Grava o CV onde der: no painel local vai direto para carreira/cv.md (com cópia de segurança). */
  async function guardarCv(markdown) {
    state.cv = { markdown, data: TODAY };
    save("cv", state.cv);
    renderCv();
    if (!LOCAL_TOKEN) {
      return state.mode === "cloud"
        ? "Guardado nesta página. No computador, corre /cv para o pôr em carreira/cv.md."
        : "Guardado neste navegador.";
    }
    await localRequest("/api/files/cv", { method: "PUT", body: JSON.stringify({ content: markdown }) });
    // Com o CV guardado, os cargos saem logo: é o que o passo seguinte precisa.
    if (sampleFn) sugerirCargos();
    return "Guardado em carreira/cv.md, no teu computador. A versão anterior ficou em .sync/backups/.";
  }
  $("cv-save").addEventListener("click", () => {
    const markdown = $("cv-result").textContent;
    if (!markdown) return;
    comSpinner($("cv-save"), $("cv-save-note"), () => guardarCv(markdown), { minimo: 250 });
  });
  $("cv-download").addEventListener("click", () => {
    const markdown = $("cv-result").textContent;
    if (!markdown) return;
    // Sem a função de descarregar (painel local), grava no repositório em vez de falhar.
    if (LOCAL_TOKEN) return comSpinner($("cv-download"), $("cv-save-note"), () => guardarCv(markdown), { minimo: 250 });
    offerFile("cv.md", markdown, $("cv-save-note"));
  });

  /**
   * Procura já, no painel local: o servidor pede ao Claude Code uma pesquisa na web
   * (vagas públicas, sem sessão iniciada) e o resultado entra na lista de Vagas.
   */
  // Filtros como os do LinkedIn. Os códigos são os que o site usa nos links de pesquisa.
  const LI_FILTROS = [
    ["li-remote", "f_WT", { 1: "presencial", 2: "remoto", 3: "híbrido" }],
    ["li-when", "f_TPR", { r86400: "publicada nas últimas 24 horas", r604800: "publicada na última semana", r2592000: "publicada no último mês" }],
    ["li-level", "f_E", { 1: "nível de estágio", 2: "início de carreira", 3: "júnior ou associado", 4: "sénior", 5: "direção" }],
    ["li-type", "f_JT", { F: "a tempo inteiro", P: "part-time", C: "contrato ou freelance", I: "estágio", T: "temporário" }],
  ];
  function linkedinEstado() {
    // A caixa de pesquisa é a única fonte: os cargos escolhidos escrevem-se lá.
    const words = $("li-words").value.trim();
    const place = $("li-place").value.trim();
    const params = new URLSearchParams();
    if (words) params.set("keywords", words);
    if (place) params.set("location", place);
    const frases = [];
    for (const [id, param, nomes] of LI_FILTROS) {
      const v = $(id).value;
      if (!v) continue;
      params.set(param, v);
      frases.push(nomes[v]);
    }
    return { words, place, frases, url: `https://www.linkedin.com/jobs/search/?${params.toString()}` };
  }
  function renderLinkedin() {
    const { words, url } = linkedinEstado();
    $("li-open").href = url;
    $("li-open").hidden = !words;
    try { localStorage.setItem("rumo-linkedin-v1", JSON.stringify(Object.fromEntries(["li-words", "li-place", ...LI_FILTROS.map((f) => f[0])].map((id) => [id, $(id).value])))); } catch { /* sem armazenamento */ }
  }
  for (const id of ["li-words", "li-place", ...LI_FILTROS.map((f) => f[0])]) $(id).addEventListener("input", renderLinkedin);
  // Se ele escrever à mão algo diferente, as etiquetas deixam de estar marcadas.
  $("li-words").addEventListener("input", () => {
    if ($("li-words").value.trim() !== [...cargosEscolhidos].join(" OR ")) {
      cargosEscolhidos.clear();
      renderCargos();
    }
  });
  try {
    const guardado = JSON.parse(localStorage.getItem("rumo-linkedin-v1") || "null");
    if (guardado) for (const [id, v] of Object.entries(guardado)) if ($(id)) $(id).value = v;
  } catch { /* sem armazenamento */ }
  renderLinkedin();

  async function procurarLinkedIn() {
    const { words, place, frases, url } = linkedinEstado();
    if (!words) { $("li-note").textContent = "Escreve primeiro o que procuras."; return; }
    const pedido = [
      "Pesquisa na web vagas de emprego públicas, sem iniciar sessão em lado nenhum e sem usar contas.",
      `Procura por: ${words}${place ? ` em ${place}` : ""}.`,
      "Faz primeiro uma pesquisa própria por site:linkedin.com/jobs/view e só depois procura noutros sites de emprego.",
      "Nos resultados do LinkedIn, não abras a página: guarda o URL direto, o título, a empresa e o local que aparecem no resultado da pesquisa. A página pode pedir sessão, mas o resultado público da pesquisa continua válido.",
      "Se encontrares resultados válidos do LinkedIn, inclui até 5; completa depois com até 5 resultados de outras fontes.",
      frases.length
        ? [
          `Filtros pedidos: ${frases.join("; ")}.`,
          "Confirma-os pelo que o anúncio diz — no resultado da pesquisa ou, fora do LinkedIn, na página pública.",
          "Para o LinkedIn, decide pelo título e pelo excerto da pesquisa; se um dado não aparecer, escreve \"não confirmado\". Só deixas a vaga de fora se o resultado contrariar claramente um filtro.",
        ].join(" ")
        : "",
      `Pesquisa do LinkedIn com estes filtros: ${url}`,
      "No máximo 10 vagas. Usa apenas links que tenham aparecido nos resultados da pesquisa; não inventes vagas nem links.",
      'Responde só com JSON: {"vagas": [{"cargo": string, "empresa": string, "local": string, "link": string, "fonte": string, "modalidade": string}]}',
      "Se não encontrares nada, devolve uma lista vazia.",
    ].filter(Boolean).join("\n");
    await comSpinner($("li-search"), $("li-note"), async () => {
      const data = await localRequest("/api/claude", {
        method: "POST",
        body: JSON.stringify({ prompt: pedido, web: true, modelo: MODELOS.find((m) => m.id === modelo)?.cli || "" }),
      });
      let lista = [];
      try {
        lista = extrairJson(data.text).vagas || [];
      } catch { return "A resposta não veio no formato esperado. Tenta outra vez."; }
      const novas = lista
        .filter((v) => v && v.cargo && v.empresa)
        .map((v) => ({
          id: `li-${Math.abs([...`${v.link || ""}${v.cargo}${v.empresa}`].reduce((h, c) => (h * 31 + c.codePointAt(0)) | 0, 7)).toString(36)}`,
          cargo: String(v.cargo), empresa: String(v.empresa),
          local: [v.local, v.modalidade].filter(Boolean).map(String).join(" · "),
          link: safeJobLink(v.link) || "",
          fonte: /(^|\.)linkedin\.com$/i.test((() => { try { return new URL(String(v.link || "")).hostname; } catch { return ""; } })()) ? "LinkedIn" : String(v.fonte || "pesquisa"),
          visto: TODAY,
        }));
      // As vagas ficam em carreira/vagas.csv: continuam cá quando voltares, sem pesquisar de novo.
      const guardado = await localRequest("/api/vagas", { method: "POST", body: JSON.stringify({ items: novas }) });
      state.found = guardado.items || state.found;
      localSave();
      renderVagas();
      renderCandidaturas();
      const linkedin = novas.filter((v) => v.fonte === "LinkedIn").length;
      return guardado.guardadas
        ? `${guardado.guardadas} ${guardado.guardadas === 1 ? "vaga nova guardada" : "vagas novas guardadas"} em carreira/vagas.csv${linkedin ? ` · ${linkedin} do LinkedIn` : ""}${novas.length - guardado.guardadas ? ` (${novas.length - guardado.guardadas} já lá estavam)` : ""}.`
        : novas.length ? "Todas as vagas encontradas já estavam guardadas." : "Sem resultados para essa pesquisa.";
    }, { minimo: 600, aCorrer: "a pesquisar e a confirmar cada vaga… (1 a 4 minutos)" });
  }
  $("li-search").addEventListener("click", procurarLinkedIn);

  $("li-go").addEventListener("click", () => {
    const { words, place, frases } = linkedinEstado();
    if (!words) { $("li-out").hidden = false; $("li-out").replaceChildren(h("p", { class: "note", text: "Escreve primeiro o que procuras." })); return; }
    copyForClaude([
      WEB_RULES,
      "Procura vagas de emprego públicas no LinkedIn, sem iniciar sessão e sem usar nenhuma conta.",
      `Pesquisa na web por: ${words}${place ? ` ${place}` : ""} site:linkedin.com/jobs`,
      frases.length ? `Só vagas que cumpram: ${frases.join("; ")}. Se não conseguires confirmar um destes pontos, não incluas a vaga.` : "",
      "Faz no máximo uma pesquisa e, se precisares, lê uma vez a página pública de resultados. Não abras as vagas uma a uma nem repitas a pesquisa.",
      "Responde com uma tabela: cargo · empresa · local · link. No máximo 10 vagas, só as que batem com a pesquisa. Não inventes vagas: se não encontrares, diz isso.",
    ].filter(Boolean).join("\n"), $("li-out"));
  });

  // =========================================================== CONFIGURAÇÃO LOCAL
  let cfgList = [], cfgCurrent = null, cfgTitle = "Documento";
  async function localRequest(path, options = {}) {
    if (!LOCAL_TOKEN) throw new Error("O painel local não está ligado.");
    const res = await fetch(path, { ...options, headers: { "Content-Type": "application/json", "X-Rumo-Token": LOCAL_TOKEN, ...(options.headers || {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Não foi possível falar com o painel local.");
    return data;
  }
  async function writeAllLocalFinance() {
    await Promise.all([
      ...Object.keys(state.months).map((m) => localRequest(`/api/financas/month/${m}`, { method: "PUT", body: JSON.stringify({ items: state.months[m]?.mov || [] }) })),
      localRequest("/api/financas/budget", { method: "PUT", body: JSON.stringify({ limits: state.budget }) }),
      localRequest("/api/financas/rules", { method: "PUT", body: JSON.stringify({ items: state.rules }) }),
      localRequest("/api/financas/accounts", { method: "PUT", body: JSON.stringify({ items: state.accounts }) }),
      localRequest("/api/financas/goals", { method: "PUT", body: JSON.stringify({ content: state.goals }) }),
    ]);
  }
  const FIN_FILE_MIGRATION_KEY = "rumo-finance-files-v1";
  function mergeFinanceForMigration(files, browser) {
    const months = structuredClone(files.months || {});
    for (const [month, source] of Object.entries(browser.months || {})) {
      const target = [...(months[month]?.mov || [])];
      const positions = new Map();
      target.forEach((x, index) => {
        const key = [x.d, fold(x.desc), Number(x.v).toFixed(2), fold(x.acc)].join("|");
        const list = positions.get(key) || []; list.push(index); positions.set(key, list);
      });
      // A cópia do navegador ganha quando é o mesmo movimento já categorizado/editado na UI.
      for (const x of source.mov || []) {
        const key = [x.d, fold(x.desc), Number(x.v).toFixed(2), fold(x.acc)].join("|");
        const at = positions.get(key)?.shift();
        if (at === undefined) target.push(x); else target[at] = x;
      }
      months[month] = { mov: target };
    }
    const ruleMap = new Map((files.rules || []).map((x) => [`${fold(x.p)}|${fold(x.cat)}`, x]));
    for (const x of browser.rules || []) ruleMap.set(`${fold(x.p)}|${fold(x.cat)}`, x);
    const accountMap = new Map((files.accounts || []).map((x) => [fold(x.nome), x]));
    for (const x of browser.accounts || []) accountMap.set(fold(x.nome), x);
    return {
      months, index: Object.keys(months).sort(),
      budget: { ...(files.budget || {}), ...(browser.budget || {}) },
      rules: [...ruleMap.values()], accounts: [...accountMap.values()],
    };
  }
  /**
   * No painel local, os CSV/Markdown são a fonte principal. Se esta versão encontrar dados
   * antigos apenas no navegador, migra-os uma vez para os ficheiros em vez de os perder.
   */
  async function loadLocalFinance() {
    if (!LOCAL_TOKEN) return;
    const browserReal = !state.finExample;
    const browser = browserReal ? structuredClone({
      months: state.months, index: state.index, budget: state.budget, rules: state.rules, accounts: state.accounts, goals: state.goals,
    }) : null;
    const data = await localRequest("/api/financas");
    let alreadyMigrated = false;
    try { alreadyMigrated = localStorage.getItem(FIN_FILE_MIGRATION_KEY) === "1"; } catch { /* sem armazenamento */ }
    if (browser && !alreadyMigrated) {
      const merged = data.exists ? mergeFinanceForMigration(data.fin || {}, browser) : browser;
      applyFinance(merged);
      state.goals = browser.goals?.trim() ? browser.goals : String(data.goals || "");
      await writeAllLocalFinance();
      try { localStorage.setItem(FIN_FILE_MIGRATION_KEY, "1"); } catch { /* sem armazenamento */ }
      localSave(); renderMes(); renderContas();
      flash(data.exists ? "Finanças do navegador e dos ficheiros foram reunidas e guardadas localmente." : "Finanças migradas do navegador para os ficheiros locais.", 5000);
      return;
    }
    if (!data.exists) return;
    const present = data.present || {};
    const fromFiles = data.fin || {};
    applyFinance({
      months: present.movements || !browser ? fromFiles.months : browser.months,
      index: present.movements || !browser ? fromFiles.index : browser.index,
      budget: present.budget || !browser ? fromFiles.budget : browser.budget,
      rules: present.rules || !browser ? fromFiles.rules : browser.rules,
      accounts: present.accounts || !browser ? fromFiles.accounts : browser.accounts,
    });
    state.goals = present.goals || !browser ? String(data.goals || "") : browser.goals;
    // Completa apenas os ficheiros que ainda não existiam; nunca substitui aqui um ficheiro real pelos dados do navegador.
    if (browser && Object.values(present).some((value) => !value)) await writeAllLocalFinance();
    try { localStorage.setItem(FIN_FILE_MIGRATION_KEY, "1"); } catch { /* sem armazenamento */ }
    localSave();
    renderMes(); renderContas();
  }
  const WRITING_FILE_MIGRATION_KEY = "rumo-writing-files-v1";
  function mergeById(fileItems, browserItems) {
    const out = new Map((fileItems || []).map((x) => [x.id || JSON.stringify(x), x]));
    for (const x of browserItems || []) out.set(x.id || JSON.stringify(x), x);
    return [...out.values()];
  }
  async function loadLocalWriting() {
    if (!LOCAL_TOKEN) return;
    const data = await localRequest("/api/escrita");
    const file = data.data || {};
    let migrated = false;
    try { migrated = localStorage.getItem(WRITING_FILE_MIGRATION_KEY) === "1"; } catch { /* sem armazenamento */ }
    const browserHasData = state.ideas.length || state.notes.length || state.drafts.length || state.errors.length || state.voice.amostras.length || state.voice.perfil;
    if (!migrated && browserHasData) {
      state.ideas = mergeById(file.ideas, state.ideas).slice(0, 100);
      state.drafts = mergeById(file.drafts, state.drafts).slice(0, 40);
      state.notes = mergeById(file.notes, state.notes).slice(0, 60);
      const errors = new Map((file.errors || []).map((x) => [`${x.lang}|${fold(x.de)}|${fold(x.para)}`, x]));
      for (const x of state.errors) errors.set(`${x.lang}|${fold(x.de)}|${fold(x.para)}`, x);
      state.errors = [...errors.values()].slice(0, 200);
      if (!(state.voice.amostras.length || state.voice.perfil)) state.voice = file.voice || state.voice;
      await localRequest("/api/escrita", { method: "PUT", body: JSON.stringify(writingPayload()) });
      flash(data.exists ? "Ideias e textos do navegador e do ficheiro foram reunidos." : "Ideias e textos migrados para um ficheiro local.", 5000);
    } else if (data.exists) {
      state.ideas = file.ideas || []; state.notes = file.notes || []; state.drafts = file.drafts || [];
      state.errors = file.errors || []; state.voice = file.voice || state.voice;
    } else if (browserHasData) {
      await localRequest("/api/escrita", { method: "PUT", body: JSON.stringify(writingPayload()) });
    }
    try { localStorage.setItem(WRITING_FILE_MIGRATION_KEY, "1"); } catch { /* sem armazenamento */ }
    localSave(); renderPensar(); renderCorretor(); renderEscrita();
    if ($("writing-storage")) $("writing-storage").textContent = "Guardado em escrita/painel.json · versão anterior em .sync/backups/escrita/.";
  }
  async function loadLocalEmails() {
    if (!LOCAL_TOKEN) return 0;
    const data = await localRequest("/api/emails");
    gmailState.items = Array.isArray(data.items) ? data.items : [];
    gmailState.updatedAt = data.updatedAt || null;
    gmailState.index = Math.min(gmailState.index, Math.max(0, gmailState.items.length - 1));
    renderGmail();
    if (gmailState.items.length) $("inbox-panel").open = true;
    if (data.error) $("gmail-help").textContent = data.error;
    return gmailState.items.length;
  }
  // No painel local relê o ficheiro do /hoje; no claude.ai vai buscar ao Gmail, se houver conector.
  const atualizarEmails = (btn) => comSpinner(btn, $("gmail-help"), async () => {
    if (mcpNs) { await fetchGmail(); return ""; }
    if (LOCAL_TOKEN) {
      await lerGoogleLocal();
      const n = gmailState.items.length;
      return n ? `${n} ${n === 1 ? "email por triar" : "emails por triar"}.` : "Sem emails que peçam ação.";
    }
    return "Liga o Gmail ao Claude e executa /hoje. Os emails aparecem aqui um de cada vez.";
  });
  $("gmail-refresh").addEventListener("click", () => atualizarEmails($("gmail-refresh")));
  $("inbox-refresh").addEventListener("click", () => atualizarEmails($("inbox-refresh")));
  /**
   * Ponte para o Claude Code deste computador, com a mesma forma do `sample` do claude.ai
   * (função que devolve {text}, mais `.json()`), para o resto da página não notar a diferença.
   */
  /** Tira o JSON de uma resposta, mesmo com blocos de código ou texto à volta. */
  function extrairJson(texto) {
    const limpo = String(texto || "").replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
    try { return JSON.parse(limpo); } catch { /* tenta o primeiro objeto */ }
    const inicio = limpo.indexOf("{");
    const fim = limpo.lastIndexOf("}");
    if (inicio === -1 || fim <= inicio) throw Object.assign(new Error("resposta sem JSON"), { code: "invalid_json" });
    return JSON.parse(limpo.slice(inicio, fim + 1));
  }

  function localSample() {
    const textoDe = (input) => (typeof input === "string" ? input
      : input.map((t) => (t.role === "assistant" ? `Assistente: ${t.content}` : `Pessoa: ${t.content}`)).join("\n\n"));
    const fn = async (input, options = {}) => {
      options.onText?.({ text: "", delta: "" });
      // `web`: o Claude do computador pode pesquisar na internet (só WebSearch e WebFetch).
      const pedido = { prompt: textoDe(input), modelo: MODELOS.find((m) => m.id === modelo)?.cli || "", web: options.web === true };
      if (!options.onText) {
        const data = await localRequest("/api/claude", { method: "POST", body: JSON.stringify(pedido), signal: options.signal });
        return { text: String(data.text || ""), truncated: false };
      }
      // Com quem mostre o texto, a resposta vem aos bocados (uma linha JSON por bocado),
      // para a primeira frase aparecer logo em vez de só no fim.
      if (!LOCAL_TOKEN) throw new Error("O painel local não está ligado.");
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Rumo-Token": LOCAL_TOKEN },
        body: JSON.stringify({ ...pedido, stream: true }),
        signal: options.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Não foi possível falar com o painel local.");
      }
      const leitor = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let resto = "";
      let text = "";
      let final = null;
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        resto += value;
        const linhas = resto.split("\n");
        resto = linhas.pop();
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const msg = JSON.parse(linha);
          if (msg.error) throw new Error(msg.error);
          if (typeof msg.delta === "string") { text += msg.delta; options.onText({ text, delta: msg.delta }); }
          if (typeof msg.text === "string") final = msg.text;
        }
      }
      if (final === null) throw new Error("A resposta do Claude ficou a meio. Tenta outra vez.");
      if (final !== text) options.onText({ text: final, delta: "" });
      return { text: final, truncated: false };
    };
    fn.json = async (input, options = {}) => {
      const pedido = `${textoDe(input)}\n\nResponde só com o JSON pedido, sem texto à volta e sem blocos de código.`;
      const { text } = await fn(pedido, options);
      try { return extrairJson(text); } catch { /* segue para a segunda tentativa */ }
      // Uma segunda tentativa: pede-se só o JSON, a partir do que veio. Resolve a maioria
      // dos casos (texto antes, explicações no fim) sem repetir o trabalho todo.
      const segunda = await fn([
        "Converte isto no JSON pedido. Só o JSON, sem texto à volta, sem blocos de código.",
        "Se não houver dados, devolve o JSON com listas vazias.",
        "", "PEDIDO ORIGINAL:", pedido.slice(0, 2000), "", "RESPOSTA A CONVERTER:", text.slice(0, 8000),
      ].join("\n"), { ...options, onText: undefined });
      return extrairJson(segunda.text);
    };
    fn.limits = async () => ({ images: false });
    return fn;
  }

  /**
   * No painel local, o CV verdadeiro é o ficheiro carreira/cv.md. Se já existir, o Rumo
   * reconhece-o e a procura de emprego avança de etapa sem ele ter de o enviar outra vez.
   */
  async function loadLocalCv() {
    if (!LOCAL_TOKEN) return;
    try {
      const doc = await localRequest("/api/files/cv");
      if (doc.exists && doc.content.trim()) {
        state.cv = { markdown: doc.content, data: TODAY, origem: "carreira/cv.md" };
        renderCandidaturas();
      }
    } catch { /* sem painel local: fica como estava */ }
  }

  /** Vagas guardadas no computador (carreira/vagas.csv), o mesmo ficheiro que a procura usa. */
  async function loadLocalVagas() {
    if (!LOCAL_TOKEN) return;
    try {
      const d = await localRequest("/api/vagas");
      if (Array.isArray(d.items) && d.items.length) {
        state.found = d.items;
        renderVagas();
        renderCandidaturas();
      }
    } catch { /* sem painel local: fica o que veio da página */ }
  }

  /** Limites do Claude: a cópia que o Claude Code guardou da última consulta. */
  function pintaLimites(d) {
      const linha = (nome, janela) => {
        if (!janela) return null;
        const pct = Math.max(0, Math.min(100, Math.round(janela.utilizacao)));
        const cls = pct >= 90 ? "bad" : pct >= 70 ? "warn" : "";
        let quando = "";
        try { quando = janela.reposicao ? new Date(janela.reposicao).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" }) : ""; } catch { /* data estranha */ }
        return h("div", { class: "row-lim", title: quando ? `Repõe em ${quando}` : "" },
          h("span", { class: "who", text: nome }),
          h("span", { class: "bar" }, h("span", { class: cls, style: `width:${pct}%` })),
          h("span", { class: `pct ${cls}`, text: `${pct}%` }));
      };
      const linhas = [linha("5h", d.cincoHoras), linha("7d", d.seteDias), linha("opus", d.opus)].filter(Boolean);
      if (!linhas.length) return false;
      $("limits-body").replaceChildren(...linhas);
      let lido = "";
      try { lido = d.lidoEm ? new Date(d.lidoEm).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : ""; } catch { /* data estranha */ }
      const idade = d.lidoEm ? Math.round((Date.now() - new Date(d.lidoEm).getTime()) / 60000) : null;
      const antiguidade = idade !== null && idade > 1 ? ` (há ${idade < 60 ? `${idade} min` : `${Math.round(idade / 60)} h`})` : "";
      $("limits-when").textContent = d.origem === "direto"
        ? `medido agora${lido ? `, às ${lido}` : ""}`
        : lido ? `cópia do Claude Code de ${lido}${antiguidade}` : "cópia do Claude Code";
      // Minimizado: o pior dos valores, com um ponto verde, laranja ou vermelho.
      const pior = Math.max(...[d.cincoHoras, d.seteDias, d.opus].filter(Boolean).map((x) => Math.round(x.utilizacao)));
      $("limits-short").textContent = `${pior}%`;
      $("limits-dot").className = `dot-lim ${pior >= 90 ? "bad" : pior >= 70 ? "warn" : ""}`;
      $("limits-pill").title = `Limites do Claude: ${pior}% no pior dos períodos. Clica para atualizar.`;
      $("limits").hidden = false;
      return true;
  }
  async function loadLimits() {
    if (!LOCAL_TOKEN) return;
    try { pintaLimites(await localRequest("/api/limites")); } catch { /* sem painel local: fica escondido */ }
  }
  /** Clicar abre e volta a medir: pede ao Claude Code uma resposta mínima, que é o que o leva a reler os limites. */
  async function refreshLimits() {
    const pill = $("limits-pill");
    const aberto = !$("limits-open").hidden;
    $("limits-open").hidden = false;
    pill.setAttribute("aria-expanded", "true");
    if (aberto) return; // já estava aberto: o clique seguinte é para minimizar
    pill.classList.add("loading");
    $("limits-when").textContent = "a medir…";
    try {
      pintaLimites(await localRequest("/api/limites", { method: "POST" }));
    } catch (e) {
      $("limits-when").textContent = e.message;
    } finally { pill.classList.remove("loading"); }
  }
  $("limits-pill").addEventListener("click", () => {
    if ($("limits-open").hidden) refreshLimits();
    else { $("limits-open").hidden = true; $("limits-pill").setAttribute("aria-expanded", "false"); }
  });
  $("limits-close").addEventListener("click", (e) => {
    e.stopPropagation();
    $("limits-open").hidden = true;
    $("limits-pill").setAttribute("aria-expanded", "false");
  });

  /** No painel local não há conectores: a agenda vem do ficheiro que o /hoje deixou. */
  async function loadLocalAgenda() {
    if (!LOCAL_TOKEN) return;
    try {
      const data = await localRequest("/api/agenda");
      if (Array.isArray(data.items)) setAgenda(eventsFromPayload(data.items), "hoje", data.updatedAt);
      if (data.error) $("agenda-note").textContent = data.error;
    } catch (e) { $("agenda-note").textContent = e.message; }
  }
  function cleanTemplate(text) {
    return text.replace(/<!--[\s\S]*?-->/g, "").replace(/^>.*$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  }
  function markdownSections(text, fromModel) {
    const src = fromModel ? cleanTemplate(text) : text.trim();
    const lines = src.split(/\r?\n/);
    const titleAt = lines.findIndex((line) => /^#\s+/.test(line));
    cfgTitle = titleAt >= 0 ? lines[titleAt].replace(/^#\s+/, "").trim() : "Documento";
    if (titleAt >= 0) lines.splice(titleAt, 1);
    const sections = [];
    let current = { heading: "Informação principal", body: [] };
    for (const line of lines) {
      const h2 = line.match(/^##\s+(.+)/);
      if (h2) {
        if (current.heading !== "Informação principal" || current.body.join("\n").trim()) sections.push(current);
        current = { heading: h2[1].trim(), body: [] };
      } else current.body.push(line);
    }
    if (current.heading !== "Informação principal" || current.body.join("\n").trim() || !sections.length) sections.push(current);
    return sections.map((s) => ({ ...s, body: s.body.join("\n").trim() }));
  }
  function buildMarkdown() {
    const blocks = [`# ${cfgTitle}`];
    for (const section of $("cfg-form").querySelectorAll(".editor-section[data-heading]")) {
      const heading = section.dataset.heading;
      const field = section.querySelector("textarea");
      const table = section.querySelector(".cfg-table-editor");
      let body = field ? field.value.trim() : "";
      if (table) {
        const headers = JSON.parse(table.dataset.headers);
        const rows = [...table.querySelectorAll(".cfg-table-row[data-row]")].map((row) => [...row.querySelectorAll("input")].map((x) => x.value.trim())).filter((row) => row.some(Boolean));
        const cell = (v) => String(v).replace(/\|/g, "\\|");
        body = [`| ${headers.map(cell).join(" | ")} |`, `|${headers.map(() => "---").join("|")}|`, ...rows.map((row) => `| ${row.map(cell).join(" | ")} |`)].join("\n");
      }
      if (heading === "Informação principal") { if (body) blocks.push(body); }
      else blocks.push(`## ${heading}${body ? `\n${body}` : ""}`);
    }
    return `${blocks.join("\n\n")}\n`;
  }
  const tableCells = (line) => line.trim().replace(/^\||\|$/g, "").split(/(?<!\\)\|/).map((x) => x.trim().replace(/\\\|/g, "|"));
  function tableData(body) {
    const lines = body.split("\n").filter((x) => x.trim());
    if (lines.length < 2 || !lines[0].trim().startsWith("|") || !/^\|?[\s:|-]+\|?$/.test(lines[1].trim())) return null;
    const headers = tableCells(lines[0]);
    return { headers, rows: lines.slice(2).filter((x) => x.trim().startsWith("|")).map(tableCells) };
  }
  function cfgTableRow(headers, values = []) {
    const row = h("div", { class: "cfg-table-row", "data-row": "", style: `--cols:${headers.length}` },
      ...headers.map((head, i) => h("input", { type: "text", value: values[i] || "", placeholder: head, "aria-label": head })),
      h("button", { class: "btn small ghost", type: "button", title: "Apagar linha", "aria-label": "Apagar linha", text: "×", onclick: () => row.remove() }));
    return row;
  }
  function renderCfgSections(doc) {
    const sections = markdownSections(doc.content, !doc.exists);
    $("cfg-form").replaceChildren(...sections.map((s) => {
      const table = tableData(s.body);
      if (!table) return h("label", { class: "editor-section", "data-heading": s.heading },
        h("strong", { text: s.heading }),
        h("textarea", { class: s.body.split("\n").length > 5 ? "tall" : "", value: s.body, placeholder: "Escreve aqui…" }));
      const editor = h("div", { class: "cfg-table-editor", "data-headers": JSON.stringify(table.headers) },
        h("div", { class: "cfg-table-row header", style: `--cols:${table.headers.length}` }, ...table.headers.map((x) => h("span", { text: x })), h("span")),
        ...(table.rows.length ? table.rows : [[]]).map((row) => cfgTableRow(table.headers, row)));
      return h("div", { class: "editor-section", "data-heading": s.heading },
        h("strong", { text: s.heading }),
        h("div", { class: "cfg-table-scroll" }, editor),
        h("div", {}, h("button", { class: "btn small", type: "button", text: "+ Acrescentar linha", onclick: () => editor.append(cfgTableRow(table.headers)) })));
    }));
  }
  async function openCfg(id) {
    try {
      $("cfg-note").textContent = "A abrir…";
      const doc = await localRequest(`/api/files/${id}`);
      cfgCurrent = doc.id;
      $("cfg-title").textContent = doc.label;
      $("cfg-description").textContent = doc.description;
      renderCfgSections(doc);
      $("cfg-note").textContent = doc.exists ? "Guardado neste computador." : "Ainda usa o modelo; guarda para criar o teu ficheiro.";
      for (const b of $("cfg-files").querySelectorAll("button")) b.setAttribute("aria-pressed", String(b.dataset.id === id));
    } catch (e) { $("cfg-note").textContent = e.message; }
  }
  async function connectLocalFiles() {
    if (!LOCAL_TOKEN) return;
    try {
      const data = await localRequest("/api/files");
      cfgList = data.files || [];
      $("cfg-offline").hidden = true;
      $("cfg-local").hidden = false;
      $("cfg-files").replaceChildren(...cfgList.map((f) => h("button", { class: "btn", type: "button", "data-id": f.id, "aria-pressed": "false", onclick: () => openCfg(f.id) },
        h("span", { text: f.label }), f.exists ? null : h("span", { class: "small muted", text: "por preencher" }))));
      if (cfgList[0]) await openCfg(cfgList[0].id);
      await loadLocalEmails();
      await loadLocalAgenda();
      // O computador atualiza a agenda e os emails de 30 em 30 minutos; a página relê-os
      // de 5 em 5 e sempre que voltas a este separador, para nunca ficarem para trás.
      const reler = () => { loadLocalAgenda(); loadLocalEmails().catch(() => {}); };
      setInterval(reler, 5 * 60 * 1000);
      document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reler(); });
      await loadLocalFinance();
      await loadLocalWriting();
      await loadLocalDados();
      await loadLocalCv();
      await loadLocalVagas();
      await loadLimits();
    } catch (e) {
      $("cfg-offline").querySelector("span").textContent = `Não foi possível ligar aos ficheiros locais: ${e.message}`;
    }
  }
  $("cfg-save").addEventListener("click", async () => {
    if (!cfgCurrent) return;
    try {
      $("cfg-save").disabled = true; $("cfg-note").textContent = "A guardar…";
      await localRequest(`/api/files/${cfgCurrent}`, { method: "PUT", body: JSON.stringify({ content: buildMarkdown() }) });
      $("cfg-note").textContent = "Guardado no computador. A cópia de segurança também ficou feita.";
      const item = cfgList.find((x) => x.id === cfgCurrent); if (item) item.exists = true;
    } catch (e) { $("cfg-note").textContent = e.message; }
    finally { $("cfg-save").disabled = false; }
  });
  for (const b of document.querySelectorAll("[data-go-view]")) b.addEventListener("click", () => selectTab(b.dataset.goView));

  // =========================================================== arranque
  function renderView(name) {
    ({ hoje: renderHoje, foco: renderFoco, semana: renderSemana, mes: renderMes, contas: renderContas, investir: () => {}, vagas: renderVagas, candidaturas: renderCandidaturas, pensar: renderPensar, corretor: renderCorretor, escrita: renderEscrita, conversar: renderConversar, config: () => {} })[name]?.();
  }
  /** Um erro a desenhar uma vista não pode deixar a página em branco e calada. */
  function renderAll() {
    try {
      renderHoje();
      renderView(currentView);
      if (currentView === "foco") renderFocusSelect();
    } catch (e) {
      console.error("Rumo: falha a desenhar", e);
      flash("Algo correu mal a mostrar esta secção. Os teus dados estão guardados; recarrega a página.", 8000);
    }
  }

  $("mov-date").value = TODAY;
  fillCats();
  paintClock(25 * 60000, 25 * 60000);
  let startTab = "hoje";
  try {
    const requested = new URLSearchParams(location.search).get("view");
    const remembered = sessionStorage.getItem("rumo-tab");
    const t = requested || remembered;
    if (t && VIEWS.some((v) => v.id === t)) startTab = t;
  } catch { /* sem armazenamento */ }
  selectTab(startTab);

  connect().catch(() => toLocal());
  connectLocalFiles();
  if (LOCAL_TOKEN) {
    $("footer-storage").textContent = "Este painel está ligado apenas aos ficheiros pessoais autorizados na pasta do Rumo. Nada é publicado por este servidor local.";
    $("footer-ai").textContent = "As funções com Claude (Investir, Pensar, Corretor, Escrita e CV) falam com o Claude Code deste computador, com a tua conta. Para desligar o painel: npm run painel:parar.";
  }
  (async () => {
    const c = window.claude;
    const hasUse = c && typeof c.use === "function";
    [sampleFn, downloadsNs, mcpNs] = hasUse ? await Promise.all([c.use("sample"), c.use("downloads"), c.use("mcp")]) : [null, null, null];
    // No painel local não há Claude no navegador, mas há Claude Code no computador:
    // o servidor local fala com ele e estas funções passam a funcionar na mesma.
    if (!sampleFn && LOCAL_TOKEN) sampleFn = localSample();
    if (!sampleFn) {
      for (const id of ["fix-note", "inv-note", "chat-note", "wr-note", "voice-note", "cv-note"]) $(id).textContent = "Esta função só funciona dentro do Claude.";
    }
    // O botão do Gmail só aparece onde há conectores; sem eles fica a lista do /hoje.
    if (mcpNs) {
      $("gmail-connector").hidden = false;
      fetchAgenda({ silent: true });
    } else if (!agendaState.source && !LOCAL_TOKEN) {
      $("agenda-note").textContent = "Sem calendário ligado aqui. Corre /hoje no computador para trazer a agenda.";
    }
    // No painel local há internet e ficheiros: procura-se já e grava-se no repositório.
    if (LOCAL_TOKEN) {
      $("fin-storage").textContent = "Guardado automaticamente em ficheiros na pasta financas/. Antes de cada alteração, a versão anterior fica em .sync/backups/financas/.";
      $("li-search").hidden = false;
      $("li-help").textContent = "«Procurar agora» importa resultados públicos (incluindo LinkedIn) sem usar a tua conta. «Pesquisar no LinkedIn (minha sessão)» abre os mesmos filtros no navegador; se já tiveres sessão iniciada, o LinkedIn reconhece-a, mas o Rumo não lê a conta nem os cookies.";
      $("inv-banner").textContent = "Aqui, no computador, o Claude pesquisa na internet as taxas e regras atuais e indica a fonte e a data de cada número (demora até um minuto). Confirma sempre na fonte antes de decidir e fala com um profissional certificado antes de decisões importantes.";
      $("cv-download").textContent = "Guardar em carreira/cv.md";
      $("cv-save").textContent = "Guardar";
    } else {
      $("li-help").textContent = "Esta página não tem acesso à internet, por isso a procura automática só existe no painel local (Rumo no computador). Aqui, o botão prepara o pedido para colares numa conversa normal do Claude.";
    }
  })();
})();
