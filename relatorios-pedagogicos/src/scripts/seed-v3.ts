/**
 * Seed v3 — Popula o banco com dados iniciais.
 *
 * Idempotente: pode rodar várias vezes (usa upsert / skipDuplicates).
 * Cobre o schema v3: AnoLetivo, Bimestre, Conceito, login de professor.
 *
 * Uso:
 *   cd relatorios-pedagogicos
 *   npx tsx src/scripts/seed-v3.ts
 */

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ---------- Helpers ----------
function gerarLogin(nomeCompleto: string, existentes: Set<string>): string {
  const semAcento = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const nomes = semAcento(nomeCompleto).toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (nomes.length === 0) throw new Error(`Nome inválido: ${nomeCompleto}`)

  let base: string
  if (nomes.length === 1) {
    base = nomes[0]
  } else {
    base = `${nomes[0]}.${nomes[nomes.length - 1]}`
  }

  let login = base
  let n = 1
  while (existentes.has(login)) {
    login = `${base}${n++}`
  }
  return login
}

// ---------- Dados ----------
const MATERIAS = [
  { name: 'Artes', codigo: 'ART-001' },
  { name: 'Educação Física', codigo: 'EF-001' },
  { name: 'Espanhol', codigo: 'ESP-001' },
  { name: 'Geografia', codigo: 'GEO-001' },
  { name: 'História', codigo: 'HIS-001' },
  { name: 'Matemática', codigo: 'MAT-001' },
  { name: 'Português', codigo: 'POR-001' },
] as const

const TURMAS = ['1601', '1602', '1701', '1702', '1801', '1802', '1803', '1901', '1902']

type ProfDef = { name: string; email: string; materias: string[]; turmas: string[] }
const PROFESSORES: ProfDef[] = [
  { name: 'Ana Paula de Almeida Ducatti', email: 'ana.ducatti@escola.com', materias: ['Artes'], turmas: ['1702','1801','1802','1803','1901','1902'] },
  { name: 'Vivian Fernanda Lacerda Monteiro', email: 'vivian.monteiro@escola.com', materias: ['Artes'], turmas: ['1601','1602','1701'] },
  { name: 'Rosa Maria Moura', email: 'rosa.moura@escola.com', materias: ['Educação Física'], turmas: TURMAS },
  { name: 'Fabíola Guimarães Estima Paiva', email: 'fabiola.paiva@escola.com', materias: ['Espanhol'], turmas: TURMAS },
  { name: 'José Guilherme de Castro Nóbrega', email: 'jose.nobrega@escola.com', materias: ['Geografia'], turmas: ['1601','1602','1701','1702','1801','1802','1803','1901'] },
  { name: 'Michele Nascimento Shpakovsky', email: 'michele.shpakovsky@escola.com', materias: ['Geografia'], turmas: ['1902'] },
  { name: 'Shelley Muniz Azanbuja Neves', email: 'shelley.neves@escola.com', materias: ['História'], turmas: ['1801','1802','1803','1901','1902'] },
  { name: 'Dunstana Farias de Mello', email: 'dunstana.mello@escola.com', materias: ['História'], turmas: ['1601','1602','1701','1702'] },
  { name: 'Eduardo Moraes Carvalho', email: 'eduardo.carvalho@escola.com', materias: ['Matemática'], turmas: ['1801','1802','1803','1901','1902'] },
  { name: 'Luciana Felix da Costa Santos', email: 'luciana.santos@escola.com', materias: ['Matemática'], turmas: ['1601','1602','1701','1702'] },
  { name: 'Cristiane Teixeira de Carvalho', email: 'cristiane.carvalho@escola.com', materias: ['Português'], turmas: ['1601','1602'] },
  { name: 'Maria de Fátima da Silva Leal Azevedo', email: 'maria.azevedo@escola.com', materias: ['Português'], turmas: ['1702','1801','1802','1803','1901','1902'] },
  { name: 'José Roberto Santana de Carvalho', email: 'jose.carvalho@escola.com', materias: ['Português'], turmas: ['1701'] },
]

// Lista de alunos por turma (copiada de src/scripts/seed.js)
const ALUNOS_POR_TURMA: Record<string, string[]> = {
  '1601': ['ANA LIVIA SANTOS DE AZEVEDO','BÁRBARA GEOVANA DOS SANTOS FERNANDES','DAVI DE SOUZA BENJAMIN','DAVI SOUZA DE OLIVEIRA','GUSTAVO SOUZA DOS SANTOS','HELLENA LAURENTINO DE LIMA','IASMIM COSTA MORAIS','ISABELLE ABREU DE LIMA','JOÃO PEDRO DOS SANTOS DA SILVA','LARISSA CORRÊA DOS SANTOS','LAYNÁ VITÓRIA NASCIMENTO NOGUEIRA','LIZ HELLEN ELONA CUNHA','LUDMYLLA VIEIRA DOS SANTOS ESPÍNDOLA','MARIANA PEREIRA DA SILVA','MICAELLY DA SILVA NUNES DOS SANTOS','MIRELLA PASSOS DO NASCIMENTO','PIETRO LUCAS DA CRUZ VINHAES','RYAN VINICIUS SOUZA DA SILVA','SOPHIA ANDRESSA NUNES DOS SANTOS','SOPHIA SOUSA DIAS','SOPHIE LORRANY DE SOUZA DA MOTTA MACHADO','VALENTINA BAIA CRUZ DA SILVA'],
  '1602': ['ALEXSANDRO DA SILVA FÉLIX','ANA JULIA DE OLIVEIRA AIOLFE','ANA LUIZA ROSA TAVARES','ARTHUR FERREIRA SANTOS','CARLOS GUTEMBERG DE CARVALHO','CLARYSSE VITÓRIA PEREIRA DOS SANTOS','DANIEL LUCAS MOLINA DO NASCIMENTO','DAVI MOTA DE SOUZA','ESTER RAQUELY ALVES DA SILVA','IGOR HENRIQUE DE AMORIM ASSIS','ISABELLE QUIRINO DOS SANTOS','KETELLYN VIEIRA DOS SANTOS DA SILVA','LARA BAPTISTA SICA','LÍVIA VITÓRIA MENDES DA SILVA','LUCAS RAMALHO DE OLIVEIRA','LUIZ RICKELME SANTOS OLIVEIRA','MARCELO VITOR XAVIER DE BRITO','MARIA LUIZA CANDIDO CRUZ','MARIA VITÓRIA ALCANTARA TANOS DA CUNHA','MARIANA MOURA VERAS','MATHEUS FIEL DE ARAUJO','MIGUEL DE SALES CORRÊA','MIKAELA ALVES MESQUITA','NATHALY VITORIA DA SILVA GOMES','RAFAEL DA SILVA MARTINS','RAYSSA CRISTINA DA SILVA GONÇALVES','VITORIA DE SALES CORRÊA','YAGO DUARTE DE ALMEIDA'],
  '1701': ['ANA BEATRIZ COSTA BRITO','ANA CLARA TORRES ROMERO','ANA FLAVIA DE SOUZA DA SILVA','ANNA CAROLINA ALVES BARBOZA','EDUARDA DA SILVA MATTOS','ENZO MIGUEL DE OLIVEIRA AMARAL','GIOVANNA VICTORIA DE MIRANDA','GUILHERME DE PAULA GARCIA MEDEIROS','ISABELLY DE ALMEIDA OLIVEIRA','ISADORA BRITO FRIAS DE OLIVEIRA','JONATHAN ALVES LOURENÇO','JULIA CLAUDINA DA SILVA','KARIELLY VITORIA DA SILVA BARROS','KAUÊ DOS SANTOS RODRIGUES','LILIAN DE MORAES ALVES','LUANA SILVA DE SOUZA FIDALGO','LUCAS SANTOS DE MELO','LUIZ FERNANDO BENTO','LUYZ ANTONIO DE JESUS DA SILVA','MARCELO VINICIUS FRANZI DOS SANTOS','MARIA EDUARDA DA SILVA SANTOS','MARIA EDUARDA GUIMARÃES DA SILVA MARTINS','MARIA EDUARDA SOARES DOS SANTOS','MARIA PAULA DE LIMA SILVA','MARINA AVELLAR GOMES DA CONCEIÇÃO','MIGUEL ELISIÁRIO COELHO','MIGUEL SILVA DA CRUZ','MIRELLA TEIXEIRA ZUMBA','NATHÁLIA ALBINO DA SILVA','PEDRO HENRIQUE DA SILVA OLIVEIRA','RIANA MAIRA RAMOS DOS SANTOS','SAMUEL LANNA LIMA PINTO','THIEGO FERREIRA DE SOUZA','VICTOR PIRAGIBE DE OLIVEIRA COSTA CAVALCANTE','YANNAYARA SAMYRA ALVES RICARTE'],
  '1702': ['ANA JULIA FERREIRA DA COSTA','ASHLEY CRISTINA MAMEDE CORRÊA','CASSIANE NASCIMENTO BARBOSA','DANIEL DA ROCHA DUTRA','DAVI DA SILVA DOS PASSOS','DAVI DE PAULO PEREIRA','ENZO GABRIEL LESSA DE SOUZA DOS REIS','FABIANO ANDRADE DE MÉLO MORAES DA LUZ','GABRIEL FERNANDO DO CARMO DOS SANTOS','GABRIELLE MELLO DOS SANTOS','GIOVANNA FERREIRA RIBEIRO SILVA','JAMILLY ASHLEY RODRIGUES DA SILVA','JOÃO HENRIQUE CANCIO SARAIVA','LUANNA DA SILVA SANTOS','LUIS HENRIQUE SILVA OLIVEIRA','LUIZ CLAUDIO SEIXAS ALVARENGA BERNARDO','MANUELE FIEL DE ARAUJO','MÁRCIO JOSÉ DA SILVA NETO','MIGUEL WENDELL DA SILVA BATISTA','MYKAELLA DE JESUS','NICOLE VERAS DOS SANTOS','PEDRO OGAWA DA CUNHA','PEDRO RICHARD DIONISIO LOURENÇO','RAFAEL DE JESUS CORDEIRO SILVA','RAFAELLA OLIVEIRA DOS ANJOS','REBECA SANT`ANNA RIBAS','SAMUEL RODRIGO DE ANDRADE ALVES','SOFIA MARYNEUSA SILVA DOS SANTOS','SOPHIA PRATES DOS SANTOS NASCIMENTO','SOPHIA VITÓRIA MORAES NASCIMENTO','VALENTINA LOPES GOMES NAVARRO MENDES','VALENTINA MOREIRA DE SOUZA','VICTOR MATHEUS GAMA DA SILVA','YASMIM VITÓRIA FRAGA RÊGO','YASMIN DE SALES CORRÊA'],
  '1801': ['ALÍCIA DE FREITAS CALVENTE NILTON','ADRIELLE OLIVEIRA DAS NEVES','ALYSON DE SOUZA BERLINDO','ANA CAROLINA GOMES DA SILVA','ANA CLARA GONÇALVES PIMENTA','CAUÃ MIGUEL DE JESUS DA SILVA','DAVI FERREIRA RIBEIRO JUSTO','EDUARDA CRISTYNE SILVEIRA DE OLIVEIRA','EDUARDA PATROCINIO TORRES','ELIZA VITORIA DE OLIVEIRA','EMILI MOURA DE ARAUJO','GABRIEL SERÊJO DA SILVA','KETHELLEN DA SILVA SOUZA','LARISSA OLIVEIRA DA SILVA','LAYANE MAGALHAES DOS SANTOS','LEONARDO FRANCELINO MARQUES DA SILVA','LISANDRO BRITO DA SILVA','LÍVIA SANTANA NOGUEIRA','LUIZ OCTAVIO MOÇO COSTA','MARCOS PAULO FIGUEIREDO NUNES DA SILVA','MIGUEL ARTUR RIBEIRO CONSTANTE','NATHALLY MAGALHÃES DE OLIVEIRA','NICOLE BEATRIZ DOS SANTOS MARQUES','NICOLE CORRÊA DOS SANTOS','PAULO HENRIQUE DA SILVA FERREIRA','SAMUEL BRAYAN DE OLIVEIRA GOMES',"SAMUEL XAVIER SANT'ANA DE MELO",'VALENTINA DA SILVA MORAES','VITOR HUGO OLIVEIRA DA SILVA','WALLACE DE JESUS CORDEIRO SILVA','WELLINGTON BRAYAN BRITO DE SOUZA'],
  '1802': ['ÁGATHA CRISTINI JESÚS FERREIRA','ÁGATHA LORENA CRISTINA MENDES LEAL','EMANUELE ALVES GOUVEIA','EMILLY VICTÓRIA DA SILVA SANTANA','ENZO NERI PRADO','ERICKE GABRIEL LEMOS DO PRADO','EWERTON FIDELES','FLÁVIO RODRIGUES CORRÊA','GABRIEL KAUE DA CRUZ VINHAES','GABRIEL MENEZES COELHO HONORIO','GUSTAVO CARLOS DOS SANTOS','JEFFERSON MARTINS DE PAULA JUNIOR','JOÃO PEDRO SIQUEIRA CAVALCANTE','JOÃO VITOR DA SILVA LIMA','LARAH SANTOS GONÇALVES','LARISSA LIMA DE OLIVEIRA','MARIA EDUARDA DE OLIVEIRA DA SILVA','MARIA EDUARDA FIGUEIREDO NUNES DOS SANTOS','MIGUEL DOS SANTOS LOPES','MIGUEL RIBEIRO CONCEIÇÃO','MYLENA ROSA DE GONZAGA SILVA','NATASHA CARDOSO DOS SANTOS','NICHOLAS DANIEL SOUZA DA SILVA','PÂMELA KAMYLLY DA SILVA DE ALMEIDA','PEDRO HENRIQUE ROBERTO MAGALHÃES','RAFAELA SOFIE SANTOS DA SILVA','RAQUEL PEREIRA MARTINS','RAYANE SANTOS','REBECCA SALES GUAIANO','TAYNARA LUIZ BRAGA','VICTÓRIA LARA DE ALMEIDA CABRAL COSTA','WALLACE COELHO GOMES','YASMIN VICTÓRIA DA SILVA NEVES'],
  '1803': ['ANA CAROLINA SANTOS RIBEIRO DA SILVA','ANA CLARA CHAGUES GONÇALVES','ANA CLARA VILLAS BOAS MANSO','ANA MANUELA VASCONCELOS DA SILVA','ANNY VITÓRIA ANSELMO LOPES','CAIO VINICIUS DA SILVA DOMICIANO','CHARLES GABRIEL PIRASSOLI DE OLIVEIRA','DAVI ANDERSON RODRIGUES DO NASCIMENTO','ELIONAY ALMEIDA BARBOSA','EMILLY SOUSA DIAS','EMILLY VITORIA DA SILVA','ESTHER DA SILVA LÚCIO BASTOS','GABRIEL CALOIERO FERNANDES','GUILHERME MONTEZ COSTA','IRANILDO LUCAS DE SANTANA MARINHO','JÚLIO CESAR CAVALCANTI DA SILVA','KAMILLY VITÓRIA FERREIRA VIANA SIMÕES','KAUÃ JORGE LOPES SANTOS','LUCAS GABRIEL SILVA DE FRANÇA','LUIS FERNANDO MAURICIO DOS SANTOS','LUIZ DAVI GALVÃO FREITAS','MARCELLA PEREIRA DA SILVA','MARIA EDUARDA DA SILVA DE MEDEIROS','MARIA SOFIA MORAES DA SILVA','MAYSA FERREIRA PASSOS DA SILVA','MYCHAEL VICTHOR FRANZI DOS SANTOS','RAFAEL FERNANDO DO CARMO DOS SANTOS','ROSANA VICTÓRIA DA CONCEIÇÃO FARIAS','SAMUEL FARIAS HONORIO','YURI DA SILVA LINS'],
  '1901': ['ARTHUR GABRIEL LOPES FERREIRA','BEATRIZ GOES DA CRUZ','BERNARDO DE OLIVEIRA ANDRADE','CAIO JOSÉ NASCIMENTO FERREIRA','DAVI NASCIMENTO SILVA','EDUARDA DE QUEIROZ DA SILVA','EMANUEL MATEUS DA SILVA BORGES','ESTHER CRISTAL DE ABREU MENDES','GABRIEL VITÓRIO QUEIROZ MACEDO','GIOVANNA ROSA FRANCISCO','GUILHERME AMORIM PEREIRA','GUSTAVO DE MORAES ALVES','GUSTAVO HENRY NORONHA DE SIQUEIRA DE ARAUJO','JAMES PEREIRA DE PINHO','JOÃO GABRIEL DOS SANTOS CARDOSO','JONATHAN CHAGUES GONÇALVES','JUAN FELIPE GOMES RODRIGUES','JULIANA CORDEIRO DA SILVA SANTOS','JULYA DE ALMEIDA DE CARVALHO','KAYKE FERREIRA GRIGORIO','LUIZA MEL DOS SANTOS RIBEIRO','MARCOS VINICIUS PEREIRA MACHADO','MATHEUS NASCIMENTO DA SILVA','MATHEUS SOUZA DA SILVA','MAYARA JENIFFER MACEDO DE SOUZA','SAMUEL MAGALHÃES BARBOSA','SARA NAUANNY DA SILVA','SILVIO RODRIGUES SILVA','THAIS SANTOS DA CRUZ','VITÓRIA GOMES DA SILVA','VITTÓRIA LANNA LIMA PINTO','YASMIN MICHELLE SANTOS GUIMARÃES MOURA'],
  '1902': ['ANA HELOIZA DE PAULA GONÇALVES DE LIMA','ARTHUR SANTOS DE MELO','BERNARDO PASSOS DO NASCIMENTO ROBERTO','CAIQUE DA CONCEIÇÃO DOS SANTOS TITO','CARLOS EDUARDO SOUZA ANTUNES','DAVI COSTA REZENDE','DIOGO MIGUEL DE OLIVEIRA ROCHA','EDUARDA SILVA DE JESUS','EDUARDO LOPES DE MIRANDA','ELOA JUSTINO VIEIRA DE SANTANA','FERNANDA COSTA MORAIS','FRANCIELA DA SILVA PASSOS','GABRIELA SOUZA VIEIRA','GRASIELI DE LIMA ALVES','HEBERT LUIS GONÇALVES DA SILVA','HELOIZA LOPES DE MIRANDA','IVY LUÍZA ALVES DA SILVA','JHULIA GARCÍA MONTEIRO','JULIANA PEREIRA COSTA','JULIO CESAR DOS SANTOS DA SILVA JUNIOR','KÍRIA DA SILVA VASCONCELOS','LETÍCIA DIAS DA COSTA LIRA','LUAN MOURA DE ARAÚJO','MARCELA VITORIA CLAUDIANO DE OLIVEIRA','MARIA CLARA DO VALE FERREIRA','MYRELLA NASCIMENTO DOS SANTOS','NATÁLIA DE SIQUEIRA BRITO','NICOLLY SANTIAGO DA SILVA','PEDRO HENRIQUE DE PAULA MOREIRA DA SILVA','PIETRA MIRELLA MESQUITA DUARTE','RODRIGO CHAGUES MENEZES DE SOUZA','SAMUEL ELISÁRIO COELHO','SAMUEL LINHARES DA SILVA RAPOSO','VICCENZO ROCCO TAVARES BURGOS','YASMIN VALENTINE PEREIRA DE SOUZA'],
}

const USUARIOS = [
  { email: 'superadmin@ppi.com',     senha: 'SuperAdmin@2026!', nome: 'Super Administrador',                  matricula: '000001',    login: 'superadmin',  role: 'ADMIN' as const },
  { email: 'admin@ppi.com',           senha: '123456',     nome: 'Administrador do Sistema',         matricula: 'ADM001',    login: 'admin',       role: 'ADMIN' as const },
  { email: 'coordenador@ppi.com',     senha: '123456',     nome: 'Coordenador Pedagógico',            matricula: 'COORD001',  login: 'coordenador', role: 'COORDENADOR' as const },
  { email: 'paula.rlessa@rioeduca.net', senha: '260914Pd@', nome: 'Paula Regina de Andrade Lessa',     matricula: '2719524',   login: 'paula.lessa',  role: 'COORDENADOR' as const },
]

// ---------- Seed ----------
async function main() {
  console.log('🌱 ===== SEED V3 — INICIANDO =====')

  // 0) Anos letivos + bimestres
  console.log('\n📅 [1/7] Ano letivo 2025 + bimestres...')
  const anoLetivo = await prisma.anoLetivo.upsert({
    where: { ano: '2025' },
    update: { ativo: true },
    create: { ano: '2025', ativo: true },
  })
  console.log(`   ✅ AnoLetivo id=${anoLetivo.id} ano=${anoLetivo.ano} ativo=${anoLetivo.ativo}`)

  for (let n = 1; n <= 4; n++) {
    await prisma.bimestre.upsert({
      where: { numero_anoLetivoId: { numero: n, anoLetivoId: anoLetivo.id } },
      update: {},
      create: { numero: n, anoLetivoId: anoLetivo.id, ativo: n === 1 },
    })
  }
  const bimestres = await prisma.bimestre.findMany({ where: { anoLetivoId: anoLetivo.id }, orderBy: { numero: 'asc' } })
  console.log(`   ✅ Bimestres: ${bimestres.map(b => `${b.numero}º${b.ativo ? '*' : ''}`).join(', ')} (* = ativo)`)

  // 1) Matérias
  console.log('\n📚 [2/7] Matérias...')
  for (const m of MATERIAS) {
    await prisma.materia.upsert({ where: { name: m.name }, update: { codigo: m.codigo }, create: m })
  }
  const materias = await prisma.materia.findMany()
  console.log(`   ✅ ${materias.length} matérias`)

  // 2) Turmas
  console.log('\n🏫 [3/7] Turmas...')
  for (const nome of TURMAS) {
    await prisma.turma.upsert({
      where: { name: nome },
      update: { anoLetivoId: anoLetivo.id },
      create: { name: nome, anoLetivoId: anoLetivo.id },
    })
  }
  const turmas = await prisma.turma.findMany()
  const turmaByName = new Map(turmas.map(t => [t.name, t]))
  console.log(`   ✅ ${turmas.length} turmas`)

  // 3) Professores (com login auto-gerado)
  console.log('\n👩‍🏫 [4/7] Professores...')
  const loginsExistentes = new Set<string>(
    (await prisma.professor.findMany({ select: { login: true } }))
      .map(p => p.login).filter((l): l is string => Boolean(l))
  )
  let profCount = 0
  for (const p of PROFESSORES) {
    const existing = await prisma.professor.findFirst({ where: { OR: [{ email: p.email }, { name: p.name }] } })
    const login = existing?.login ?? gerarLogin(p.name, loginsExistentes)
    loginsExistentes.add(login)

    const materiaIds = materias.filter(m => p.materias.includes(m.name)).map(m => ({ id: m.id }))
    const turmaIds = p.turmas.map(t => ({ id: turmaByName.get(t)!.id }))

    if (existing) {
      await prisma.professor.update({
        where: { id: existing.id },
        data: {
          name: p.name,
          email: p.email,
          login,
          materias: { set: materiaIds },
          turmas: { set: turmaIds },
        },
      })
    } else {
      await prisma.professor.create({
        data: {
          name: p.name,
          email: p.email,
          login,
          materias: { connect: materiaIds },
          turmas: { connect: turmaIds },
        },
      })
    }
    profCount++
  }
  console.log(`   ✅ ${profCount} professores (login auto-gerado quando ausente)`)

  // 4) Conectar matérias↔turmas (com base nas relações professor→turma+matéria)
  console.log('\n🔗 [5/7] Conectando matérias ↔ turmas...')
  const turmaMaterias: Record<number, Set<number>> = {}
  for (const p of PROFESSORES) {
    const matIds = materias.filter(m => p.materias.includes(m.name)).map(m => m.id)
    for (const tNome of p.turmas) {
      const tId = turmaByName.get(tNome)!.id
      if (!turmaMaterias[tId]) turmaMaterias[tId] = new Set()
      for (const mId of matIds) turmaMaterias[tId].add(mId)
    }
  }
  for (const [tIdStr, matSet] of Object.entries(turmaMaterias)) {
    await prisma.turma.update({
      where: { id: parseInt(tIdStr) },
      data: { materias: { set: Array.from(matSet).map(id => ({ id })) } },
    })
  }
  console.log(`   ✅ Vínculos turma↔matéria atualizados (${Object.keys(turmaMaterias).length} turmas)`)

  // 5) Alunos
  console.log('\n👧 [6/7] Alunos...')
  let alunosNovos = 0
  let alunosExist = 0
  for (const [tNome, lista] of Object.entries(ALUNOS_POR_TURMA)) {
    const turma = turmaByName.get(tNome)
    if (!turma) continue
    for (const nome of lista) {
      const existe = await prisma.aluno.findFirst({ where: { name: nome, turmaId: turma.id } })
      if (existe) { alunosExist++; continue }
      await prisma.aluno.create({
        data: {
          name: nome,
          turmaId: turma.id,
          matricule: `ALU-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          active: true,
        },
      })
      alunosNovos++
    }
  }
  console.log(`   ✅ Alunos: criados=${alunosNovos}  já existentes=${alunosExist}`)

  // 6) Usuários (admin / coordenador)
  console.log('\n🔐 [7/7] Usuários (admin/coordenadores)...')
  for (const u of USUARIOS) {
    const hash = await bcrypt.hash(u.senha, 10)
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        nome: u.nome,
        matricula: u.matricula,
        login: u.login,
        role: u.role,
        password: hash,
      },
      create: {
        email: u.email,
        nome: u.nome,
        matricula: u.matricula,
        login: u.login,
        role: u.role,
        password: hash,
      },
    })
    console.log(`   ✅ ${u.role.padEnd(11)}  login=${u.login.padEnd(15)}  ${u.email}`)
  }

  // Resumo final
  console.log('\n📊 ===== RESUMO =====')
  const counts = {
    anosLetivos: await prisma.anoLetivo.count(),
    bimestres: await prisma.bimestre.count(),
    materias: await prisma.materia.count(),
    turmas: await prisma.turma.count(),
    professores: await prisma.professor.count(),
    alunos: await prisma.aluno.count(),
    usuarios: await prisma.user.count(),
  }
  for (const [k, v] of Object.entries(counts)) {
    console.log(`   ${k.padEnd(15)} ${v}`)
  }

  console.log('\n✅ Seed v3 concluído com sucesso.')
}

main()
  .catch((err) => {
    console.error('❌ Falha no seed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
