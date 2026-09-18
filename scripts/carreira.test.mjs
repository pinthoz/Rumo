// Testes da área Carreira (scripts/carreira.mjs). Sem rede: as respostas das fontes vêm de ficheiros.
// Os campos de cada resposta foram copiados de respostas reais (setembro de 2026), reduzidas ao essencial.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { PARSERS, requestFor, matches, changeState, summarize, nextActions, sameJobKey, addDays, ESTADOS } from './carreira.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
let root;
let fixtures;
const DAY = '2026-09-17';
const run = (...args) => {
  const r = spawnSync(process.execPath, [path.join(here, 'carreira.mjs'), ...args], {
    env: { ...process.env, ASSISTENTE_ROOT: root, ROTINA_HOJE: DAY, CARREIRA_FIXTURES: fixtures, ITJOBS_API_KEY: '' },
    encoding: 'utf8',
  });
  return { code: r.status, out: r.stdout + r.stderr };
};
const file = (...p) => path.join(root, ...p);
const write = (rel, text) => {
  fs.mkdirSync(path.dirname(file(rel)), { recursive: true });
  fs.writeFileSync(file(rel), text);
};
const csv = (rel) => fs.readFileSync(file(rel), 'utf8').trim().split('\n');

const SAMPLES = {
  landing: [
    {
      id: 19066,
      title: 'Senior Machine Learning Engineer',
      url: 'https://landing.jobs/at/ki-performance/senior-machine-learning-engineer',
      remote: false,
      published_at: '2026-09-10T09:38:38.127Z',
      locations: [{ city: 'Lisbon', country_code: 'PT' }, { city: 'Munich', country_code: 'DE' }],
    },
    { id: 19067, title: 'Senior Java Developer', url: 'https://landing.jobs/at/inscale/senior-java-developer', remote: true, published_at: '2026-09-11T00:00:00Z', locations: [] },
  ],
  greenhouse: {
    jobs: [
      { id: 5421031008, title: 'Research Engineer, Interpretability', company_name: 'Anthropic', location: { name: 'London, UK' }, absolute_url: 'https://job-boards.greenhouse.io/anthropic/jobs/5421031008', first_published: '2026-09-17T13:05:33-04:00' },
      { id: 5421031009, title: 'Accommodations Partner', company_name: 'Anthropic', location: { name: 'San Francisco, CA' }, absolute_url: 'https://job-boards.greenhouse.io/anthropic/jobs/5421031009', first_published: '2026-09-17T13:05:33-04:00' },
    ],
    meta: { total: 2 },
  },
  ashby: {
    apiVersion: '1',
    jobs: [
      { id: 'a571b8e4-8176', title: 'Machine Learning Engineer ', location: 'Remote', secondaryLocations: [{ location: 'London' }], isListed: true, isRemote: true, jobUrl: 'https://jobs.ashbyhq.com/elevenlabs/a571b8e4-8176', publishedAt: '2026-07-21T16:03:51.100+00:00' },
      { id: 'hidden-1', title: 'Machine Learning Engineer, Unlisted', location: 'Remote', isListed: false, jobUrl: 'https://jobs.ashbyhq.com/elevenlabs/hidden-1' },
    ],
  },
  lever: [{ id: 'ac978161', text: 'Machine Learning Engineer', categories: { location: 'London, United Kingdom' }, workplaceType: 'hybrid', hostedUrl: 'https://jobs.lever.co/palantir/ac978161', createdAt: 1711403416463 }],
  remotive: {
    '0-legal-notice': 'Please link back…',
    jobs: [{ id: 1919265, title: 'Senior Machine Learning Engineer', company_name: 'A.Team', candidate_required_location: 'Europe', url: 'https://remotive.com/remote-jobs/x/1919265', publication_date: '2026-09-16T10:10:59' }],
  },
  remoteok: [
    { last_updated: 1789585202, legal: 'API Terms of Service: Please link back…' },
    { id: '1137399', position: 'Machine Learning Engineer', company: 'Sticker Mule', location: '', url: 'https://remoteOK.com/remote-jobs/1137399', date: '2026-09-16T12:44:27+00:00' },
  ],
  arbeitnow: { data: [{ slug: 'ml-engineer-berlin-470407', company_name: 'ZeinPharma', title: 'Machine Learning Engineer (m/w/d)', location: 'Berlin', remote: true, url: 'https://www.arbeitnow.com/jobs/ml-engineer-berlin-470407', created_at: 1789662631 }] },
  himalayas: { jobs: [{ title: 'Machine Learning Engineer', companyName: 'SmartLogic', locationRestrictions: ['Portugal', 'Spain'], applicationLink: 'https://himalayas.app/companies/smartlogic/jobs/ml', guid: 'https://himalayas.app/companies/smartlogic/jobs/ml', pubDate: 1789663514 }] },
  itjobs: { total: 1, results: [{ id: 491108, title: 'Machine Learning Developer', slug: 'machine-learning-developer', company: { id: 1, name: 'KWAN' }, locations: [{ id: 29, name: 'Lisboa' }], publishedAt: '2026-09-15 10:00:00' }] },
};

before(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'carreira-'));
  fixtures = path.join(root, '_fixtures');
  fs.mkdirSync(fixtures, { recursive: true });
  fs.writeFileSync(path.join(fixtures, 'landing.json'), JSON.stringify(SAMPLES.landing));
  fs.writeFileSync(path.join(fixtures, 'greenhouse-anthropic.json'), JSON.stringify(SAMPLES.greenhouse));
  fs.writeFileSync(path.join(fixtures, 'ashby-elevenlabs.json'), JSON.stringify(SAMPLES.ashby));
});
after(() => fs.rmSync(root, { recursive: true, force: true }));

// ---------------------------------------------------------------- leitura das fontes

test('parsers: cada fonte dá empresa, cargo, local, link e data', () => {
  const src = (fonte, alvo = '', nome = '') => ({ fonte, alvo, nome });
  const one = (fonte, s = src(fonte)) => PARSERS[fonte](SAMPLES[fonte], s)[0];

  assert.deepEqual(one('landing'), {
    id: 'lj-19066', empresa: 'Ki Performance', cargo: 'Senior Machine Learning Engineer',
    local: 'Lisbon, Munich', link: 'https://landing.jobs/at/ki-performance/senior-machine-learning-engineer', publicada: '2026-09-10',
  });
  assert.equal(one('greenhouse').empresa, 'Anthropic');
  assert.equal(one('greenhouse').publicada, '2026-09-17');
  assert.equal(one('ashby', src('ashby', 'elevenlabs', 'ElevenLabs')).empresa, 'ElevenLabs', 'o Ashby não traz o nome: vem de fontes.csv');
  assert.equal(one('ashby', src('ashby', 'elevenlabs')).empresa, 'Elevenlabs', 'sem nome, usa o identificador');
  assert.equal(one('ashby', src('ashby', 'x')).cargo, 'Machine Learning Engineer', 'espaços a mais no título');
  assert.equal(one('ashby', src('ashby', 'x')).local, 'Remote, London, Remoto');
  assert.equal(one('lever', src('lever', 'palantir')).publicada, '2024-03-25', 'createdAt em milissegundos');
  assert.match(one('remotive').local, /^Remoto \(Europe\)$/);
  assert.equal(one('remoteok').id, 'ro-1137399');
  assert.equal(one('arbeitnow').publicada, '2026-09-17', 'created_at em segundos');
  assert.match(one('himalayas').local, /Portugal, Spain/);
  assert.equal(one('itjobs').link, 'https://www.itjobs.pt/oferta/491108/machine-learning-developer');
  assert.equal(one('itjobs').local, 'Lisboa');
});

test('parsers: o aviso legal do Remote OK e as vagas escondidas do Ashby não contam', () => {
  assert.equal(PARSERS.remoteok(SAMPLES.remoteok).length, 1);
  assert.equal(PARSERS.ashby(SAMPLES.ashby, { alvo: 'x' }).length, 1);
});

test('parsers: respostas vazias ou estranhas não rebentam', () => {
  for (const [name, parse] of Object.entries(PARSERS)) {
    for (const bad of [null, {}, [], { jobs: null }, 'erro']) assert.deepEqual(parse(bad, { alvo: 'x' }), [], `${name} com ${JSON.stringify(bad)}`);
  }
});

test('requestFor: URLs verificadas e erros claros', () => {
  assert.equal(requestFor({ fonte: 'landing' }).url, 'https://landing.jobs/api/v1/jobs?limit=50');
  assert.equal(requestFor({ fonte: 'greenhouse', alvo: 'anthropic' }).url, 'https://boards-api.greenhouse.io/v1/boards/anthropic/jobs');
  assert.equal(requestFor({ fonte: 'lever', alvo: 'palantir' }).url, 'https://api.lever.co/v0/postings/palantir?mode=json');
  assert.equal(requestFor({ fonte: 'remoteok', alvo: 'machine-learning' }).url, 'https://remoteok.com/api?tag=machine-learning');
  assert.equal(requestFor({ fonte: 'himalayas', palavras: 'machine learning, data' }).url, 'https://himalayas.app/jobs/api/search?q=machine%20learning');
  assert.throws(() => requestFor({ fonte: 'greenhouse' }), /falta o identificador/);
  assert.throws(() => requestFor({ fonte: 'linkedin' }), /fonte desconhecida/);
  assert.match(requestFor({ fonte: 'itjobs', palavras: 'ml' }, {}).skip, /ITJOBS_API_KEY/);
  const it = requestFor({ fonte: 'itjobs', palavras: 'machine learning, python' }, { ITJOBS_API_KEY: 'k' });
  assert.equal(it.method, 'POST');
  assert.equal(it.body, 'api_key=k&q=machine%20learning%2Cpython&limit=50');
});

test('matches: palavras no cargo, locais no local, "remoto" apanha "Remote"', () => {
  const job = { cargo: 'Senior Machine Learning Engineer', local: 'Remote, London' };
  assert.ok(matches(job, { palavras: 'data scientist, machine learning' }));
  assert.ok(!matches(job, { palavras: 'frontend' }));
  assert.ok(matches(job, { palavras: '', local: '' }), 'sem filtros, tudo entra');
  assert.ok(matches(job, { local: 'lisboa, remoto' }));
  assert.ok(!matches({ cargo: 'ML Engineer', local: 'Berlin' }, { local: 'lisboa, porto' }));
  assert.ok(matches({ cargo: 'Engenheiro de Machine Learning', local: 'Lisboa' }, { palavras: 'machine learning', local: 'lisboa' }), 'acentos e maiúsculas');
});

test('sameJobKey: a mesma vaga em duas fontes é reconhecida', () => {
  assert.equal(sameJobKey({ empresa: 'ElevenLabs', cargo: 'Machine Learning Engineer' }), sameJobKey({ empresa: 'elevenlabs', cargo: 'Machine-Learning Engineer ' }));
  assert.notEqual(sameJobKey({ empresa: 'A', cargo: 'ML Engineer' }), sameJobKey({ empresa: 'A', cargo: 'ML Engineer II' }));
});

// ---------------------------------------------------------------- estados

test('changeState: datas de seguimento por omissão, e sem seguimento quando fecha', () => {
  const app = { id: 'x', estado: 'guardada', data: '2026-09-01', proximo: '', obs: '' };
  const sent = changeState(app, 'candidatei', DAY);
  assert.equal(sent.proximo, addDays(DAY, 7));
  assert.equal(sent.data, DAY);
  assert.equal(changeState(sent, 'entrevista', DAY).proximo, addDays(DAY, 3));
  assert.equal(changeState(sent, 'recusada', DAY).proximo, '', 'fechada não tem próximo contacto');
  assert.equal(changeState(sent, 'candidatei', DAY).proximo, sent.proximo, 'o mesmo estado não mexe na data');
  assert.equal(changeState(app, 'candidatei', DAY, { proximo: '2026-10-01' }).proximo, '2026-10-01');
  assert.equal(changeState(app, 'candidatei', DAY, { proximo: 'nao' }).proximo, '');
  assert.equal(changeState(app, 'candidatei', DAY, { obs: 'enviei CV' }).obs, `${DAY}: enviei CV`);
  assert.throws(() => changeState(app, 'contratada', DAY), /estado desconhecido/);
  assert.equal(app.estado, 'guardada', 'não altera o original');
});

test('summarize: taxa de resposta conta só as enviadas; recusa também é resposta', () => {
  const apps = [
    { estado: 'guardada', data: DAY },
    { estado: 'candidatei', data: '2026-08-20', proximo: '2026-08-27' },
    { estado: 'candidatei', data: DAY, proximo: '2026-09-24' },
    { estado: 'entrevista', data: DAY, proximo: DAY },
    { estado: 'recusada', data: DAY },
    { estado: 'sem-resposta', data: DAY },
  ];
  const s = summarize(apps, [{ visto: '2026-09-15' }, { visto: '2026-09-01' }], DAY);
  assert.equal(s.active, 4);
  assert.equal(s.sent, 5);
  assert.equal(s.replied, 2);
  assert.equal(s.responseRate, 2 / 5);
  assert.equal(s.due.length, 2, 'atrasada + hoje');
  assert.equal(s.stale.length, 1, 'candidatei há 28 dias');
  assert.equal(s.newWeek, 1);
  assert.equal(summarize([], [], DAY).responseRate, null);
  assert.deepEqual(Object.keys(s.byState), ESTADOS);
});

test('nextActions: ordena urgentes, guardadas e vagas novas sem repetir', () => {
  const apps = [
    { id: 'saved', empresa: 'B', cargo: 'Data Scientist', estado: 'guardada', nota: '4,5', data: DAY, proximo: '' },
    { id: 'due', empresa: 'A', cargo: 'ML Engineer', estado: 'candidatei', data: '2026-09-01', proximo: DAY },
    { id: 'closed', empresa: 'C', cargo: 'Analyst', estado: 'recusada', data: DAY, proximo: '' },
  ];
  const seen = [
    { id: 'new', empresa: 'D', cargo: 'AI Engineer', visto: DAY },
    { id: 'saved', empresa: 'B', cargo: 'Data Scientist', visto: DAY },
  ];
  const a = nextActions(apps, seen, DAY);
  assert.deepEqual(a.map((x) => x.item.id), ['due', 'saved', 'new']);
  assert.equal(a[0].action, 'fazer seguimento');
  assert.equal(a[1].action, 'avaliar e decidir candidatura');
});

// ---------------------------------------------------------------- CLI

test('CLI: procurar cria fontes.csv do modelo e avisa quando está vazio', () => {
  write('carreira/fontes.modelo.csv', 'fonte;alvo;nome;palavras;local\n');
  const r = run('procurar');
  assert.equal(r.code, 2);
  assert.match(r.out, /fontes\.csv está vazio/);
  assert.ok(fs.existsSync(file('carreira/fontes.csv')), 'copiado do modelo');
});

test('CLI: procurar → novas → guardar → mudar → lista → resumo', () => {
  write('carreira/fontes.csv', [
    'fonte;alvo;nome;palavras;local',
    'landing;;;machine learning,data scientist;lisbon,lisboa',
    'greenhouse;anthropic;Anthropic;research engineer;',
    'ashby;elevenlabs;ElevenLabs;machine learning;',
    '# ashby;comentada;;;',
    'itjobs;;;machine learning;',
  ].join('\n'));

  let r = run('procurar', '--forcar');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /landing "machine learning,data scientist": 1 com as palavras, 1 nova/);
  assert.match(r.out, /greenhouse\/anthropic "research engineer": 1 com as palavras, 1 nova/);
  assert.match(r.out, /itjobs .*sem ITJOBS_API_KEY/);
  assert.match(r.out, /3 vaga\(s\) nova\(s\)/);
  assert.equal(csv('carreira/vagas.csv').length, 4, 'cabeçalho + 3');

  r = run('procurar');
  assert.match(r.out, /consultada há menos de 20 h/, 'no máximo uma vez por dia');
  assert.match(r.out, /0 vaga\(s\) nova\(s\)/);

  r = run('procurar', '--forcar');
  assert.match(r.out, /0 vaga\(s\) nova\(s\)/, 'as já vistas não voltam a contar');

  r = run('novas');
  assert.match(r.out, /3 vaga\(s\) por decidir/);

  r = run('guardar', 'gh-', '--nota', '4,5');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Guardada: gh-5421031008/);
  assert.match(run('guardar', 'gh-5421031008').out, /já está na lista/);
  assert.match(run('guardar', 'nada').out, /não encontrei a vaga/);
  assert.match(run('novas').out, /2 vaga\(s\) por decidir/);

  r = run('mudar', 'gh-54', 'candidatei', '--obs', 'enviei pelo site');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /guardada → candidatei · próximo contacto 2026-09-24/);

  r = run('adicionar', '--empresa', 'Catawiki', '--cargo', 'Senior Data Scientist', '--fonte', 'linkedin', '--link', 'https://pt.linkedin.com/jobs/view/4442855950', '--estado', 'entrevista');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /entrevista, próximo contacto 2026-09-20/);
  assert.match(run('adicionar', '--empresa', 'catawiki', '--cargo', 'Senior Data-Scientist').out, /já está na lista/, 'duplicado entre fontes');
  assert.match(run('adicionar', '--empresa', 'X').out, /Uso: adicionar/);
  assert.match(run('adicionar', '--empresa', 'X', '--cargo', 'Y', '--nota', '9').out, /de 1 a 5/);

  const rows = csv('carreira/candidaturas.csv');
  assert.equal(rows[0], 'id;empresa;cargo;local;estado;nota;data;proximo;fonte;link;obs');
  assert.match(rows[1], /^gh-5421031008;Anthropic;Research Engineer, Interpretability;London, UK;candidatei;4,5;2026-09-17;2026-09-24;greenhouse;/);
  assert.match(rows[1], /2026-09-17: enviei pelo site$/);

  r = run('lista');
  assert.match(r.out, /candidatei \(1\)/);
  assert.match(r.out, /entrevista \(1\)/);
  assert.match(r.out, /4,5\/5/);

  r = run('agenda');
  assert.match(r.out, /Próximos passos/);
  assert.match(r.out, /começa pelo primeiro/i);

  r = run('mudar', 'c-', 'recusada');
  assert.equal(r.code, 0, r.out);
  assert.doesNotMatch(run('lista').out, /Catawiki/, 'fechadas não aparecem por omissão');
  assert.match(run('lista', '--todas').out, /recusada \(1\)/);

  r = run('resumo', '--data', '2026-09-25');
  assert.match(r.out, /Em curso: 1/);
  assert.match(r.out, /Taxa de resposta: 50% \(1 de 2 enviadas\)/);
  assert.match(r.out, /Contactar agora \(1\)/);

  assert.match(run('mudar', 'gh-54', 'contratada').out, /estado desconhecido/);
  assert.match(run('mudar', 'zzz', 'aceite').out, /não encontrei a candidatura/);
});

test('CLI: --dry mostra os pedidos sem os fazer nem gravar', () => {
  const before = fs.readFileSync(file('carreira/vagas.csv'), 'utf8');
  const r = run('procurar', '--dry', '--forcar', '--fonte', 'greenhouse');
  assert.match(r.out, /\[consultaria\] greenhouse\/anthropic "research engineer": https:\/\/boards-api\.greenhouse\.io\/v1\/boards\/anthropic\/jobs/);
  assert.equal(fs.readFileSync(file('carreira/vagas.csv'), 'utf8'), before);

  const filtered = run('procurar', '--dry', '--forcar', '--fonte', 'greenhouse', '--palavras', 'data platform', '--local', 'remote');
  assert.match(filtered.out, /greenhouse\/anthropic "data platform"/);
});

test('CLI: uma fonte que falha não impede as outras', () => {
  write('carreira/fontes.csv', 'fonte;alvo;nome;palavras;local\nlever;semficheiro;;;\nlanding;;;java;\n');
  const r = run('procurar', '--forcar');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /✗ lever\/semficheiro: sem ficheiro de teste/);
  assert.match(r.out, /landing "java": 1 com as palavras, 1 nova/);
});

test('CLI: fonte desconhecida é um erro claro', () => {
  write('carreira/fontes.csv', 'fonte;alvo;nome;palavras;local\nlinkedin;;;ml;\n');
  const r = run('procurar', '--forcar');
  assert.equal(r.code, 2);
  assert.match(r.out, /fonte desconhecida "linkedin"/);
});
