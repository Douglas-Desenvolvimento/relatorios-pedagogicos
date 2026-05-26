const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.info('🚀 Iniciando seed do banco de dados...');

  // 1. Limpar dados existentes
  console.info('🧹 Limpando dados existentes...');
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "relatorios",
      "alunos",
      "professores",
      "turmas",
      "materias",
      "users",
      "_ProfessorMateria",
      "_ProfessorTurma",
      "_MateriaTurma"
    RESTART IDENTITY CASCADE;
  `);

  // 2. Criar matérias
  console.info('📚 Criando matérias...');
  const materias = {
    ARTES: await prisma.materia.create({ data: { name: 'Artes', codigo: 'ART-001' } }),
    EDUCACAO_FISICA: await prisma.materia.create({ data: { name: 'Educação Física', codigo: 'EF-001' } }),
    ESPANHOL: await prisma.materia.create({ data: { name: 'Espanhol', codigo: 'ESP-001' } }),
    GEOGRAFIA: await prisma.materia.create({ data: { name: 'Geografia', codigo: 'GEO-001' } }),
    HISTORIA: await prisma.materia.create({ data: { name: 'História', codigo: 'HIS-001' } }),
    MATEMATICA: await prisma.materia.create({ data: { name: 'Matemática', codigo: 'MAT-001' } }),
    PORTUGUES: await prisma.materia.create({ data: { name: 'Português', codigo: 'POR-001' } }),
  };

  // 3. Criar turmas
  console.info('🏫 Criando turmas...');
  const turmasNomes = ['1601', '1602', '1701', '1702', '1801', '1802', '1803', '1901', '1902'];
  const turmasMap = {};
  for (const nome of turmasNomes) {
    const turma = await prisma.turma.create({ data: { name: nome, anoLetivo: '2025' } });
    turmasMap[nome] = turma.id;
  }

  // 4. Criar professores
  console.info('👩‍🏫 Criando professores...');
  const professores = [
    { name: 'Ana Paula de Almeida Ducatti', email: 'ana.ducatti@escola.com', materias: [materias.ARTES], turmas: ['1702','1801','1802','1803','1901','1902'] },
    { name: 'Vivian Fernanda Lacerda Monteiro', email: 'vivian.monteiro@escola.com', materias: [materias.ARTES], turmas: ['1601','1602','1701'] },
    { name: 'Rosa Maria Moura', email: 'rosa.moura@escola.com', materias: [materias.EDUCACAO_FISICA], turmas: turmasNomes },
    { name: 'Fabíola Guimarães Estima Paiva', email: 'fabiola.paiva@escola.com', materias: [materias.ESPANHOL], turmas: turmasNomes },
    { name: 'José Guilherme de Castro Nóbrega', email: 'jose.nobrega@escola.com', materias: [materias.GEOGRAFIA], turmas: ['1601','1602','1701','1702','1801','1802','1803','1901'] },
    { name: 'Michele Nascimento Shpakovsky', email: 'michele.shpakovsky@escola.com', materias: [materias.GEOGRAFIA], turmas: ['1902'] },
    { name: 'Shelley Muniz Azanbuja Neves', email: 'shelley.neves@escola.com', materias: [materias.HISTORIA], turmas: ['1801','1802','1803','1901','1902'] },
    { name: 'Dunstana Farias de Mello', email: 'dunstana.mello@escola.com', materias: [materias.HISTORIA], turmas: ['1601','1602','1701','1702'] },
    { name: 'Eduardo Moraes Carvalho', email: 'eduardo.carvalho@escola.com', materias: [materias.MATEMATICA], turmas: ['1801','1802','1803','1901','1902'] },
    { name: 'Luciana Felix da Costa Santos', email: 'luciana.santos@escola.com', materias: [materias.MATEMATICA], turmas: ['1601','1602','1701','1702'] },
    { name: 'Cristiane Teixeira de Carvalho', email: 'cristiane.carvalho@escola.com', materias: [materias.PORTUGUES], turmas: ['1601','1602'] },
    { name: 'Maria de Fátima da Silva Leal Azevedo', email: 'maria.azevedo@escola.com', materias: [materias.PORTUGUES], turmas: ['1702','1801','1802','1803','1901','1902'] },
    { name: 'José Roberto Santana de Carvalho', email: 'jose.carvalho@escola.com', materias: [materias.PORTUGUES], turmas: ['1701'] },
  ];

  const turmaMaterias = {};

  for (const prof of professores) {
    const professor = await prisma.professor.create({
      data: {
        name: prof.name,
        email: prof.email,
        materias: { connect: prof.materias.map(m => ({ id: m.id })) },
        turmas: { connect: prof.turmas.map(t => ({ id: turmasMap[t] })) },
      },
    });

    for (const turma of prof.turmas) {
      const turmaId = turmasMap[turma];
      if (!turmaMaterias[turmaId]) turmaMaterias[turmaId] = new Set();
      for (const mat of prof.materias) turmaMaterias[turmaId].add(mat.id);
    }
  }

  // Conectar matérias às turmas
  for (const [turmaIdStr, materiaSet] of Object.entries(turmaMaterias)) {
    const turmaId = parseInt(turmaIdStr);
    await prisma.turma.update({
      where: { id: turmaId },
      data: { materias: { connect: Array.from(materiaSet).map(id => ({ id })) } },
    });
  }

  // 5. Criar alunos existentes
  console.info('👧 Criando alunos existentes...');
  const turmasComAlunos = {
 '1601': [
    "ANA LIVIA SANTOS DE AZEVEDO",
    "BÁRBARA GEOVANA DOS SANTOS FERNANDES",
    "DAVI DE SOUZA BENJAMIN",
    "DAVI SOUZA DE OLIVEIRA",
    "GUSTAVO SOUZA DOS SANTOS",
    "HELLENA LAURENTINO DE LIMA",
    "IASMIM COSTA MORAIS",
    "ISABELLE ABREU DE LIMA",
    "JOÃO PEDRO DOS SANTOS DA SILVA",
    "LARISSA CORRÊA DOS SANTOS",
    "LAYNÁ VITÓRIA NASCIMENTO NOGUEIRA",
    "LIZ HELLEN ELONA CUNHA",
    "LUDMYLLA VIEIRA DOS SANTOS ESPÍNDOLA",
    "MARIANA PEREIRA DA SILVA",
    "MICAELLY DA SILVA NUNES DOS SANTOS",
    "MIRELLA PASSOS DO NASCIMENTO",
    "PIETRO LUCAS DA CRUZ VINHAES",
    "RYAN VINICIUS SOUZA DA SILVA",
    "SOPHIA ANDRESSA NUNES DOS SANTOS",
    "SOPHIA SOUSA DIAS",
    "SOPHIE LORRANY DE SOUZA DA MOTTA MACHADO",
    "VALENTINA BAIA CRUZ DA SILVA"
  ],
  '1602': [
    "ALEXSANDRO DA SILVA FÉLIX",
    "ANA JULIA DE OLIVEIRA AIOLFE",
    "ANA LUIZA ROSA TAVARES",
    "ARTHUR FERREIRA SANTOS",
    "CARLOS GUTEMBERG DE CARVALHO",
    "CLARYSSE VITÓRIA PEREIRA DOS SANTOS",
    "DANIEL LUCAS MOLINA DO NASCIMENTO",
    "DAVI MOTA DE SOUZA",
    "ESTER RAQUELY ALVES DA SILVA",
    "IGOR HENRIQUE DE AMORIM ASSIS",
    "ISABELLE QUIRINO DOS SANTOS",
    "KETELLYN VIEIRA DOS SANTOS DA SILVA",
    "LARA BAPTISTA SICA",
    "LÍVIA VITÓRIA MENDES DA SILVA",
    "LUCAS RAMALHO DE OLIVEIRA",
    "LUIZ RICKELME SANTOS OLIVEIRA",
    "MARCELO VITOR XAVIER DE BRITO",
    "MARIA LUIZA CANDIDO CRUZ",
    "MARIA VITÓRIA ALCANTARA TANOS DA CUNHA",
    "MARIANA MOURA VERAS",
    "MATHEUS FIEL DE ARAUJO",
    "MIGUEL DE SALES CORRÊA",
    "MIKAELA ALVES MESQUITA",
    "NATHALY VITORIA DA SILVA GOMES",
    "RAFAEL DA SILVA MARTINS",
    "RAYSSA CRISTINA DA SILVA GONÇALVES",
    "VITORIA DE SALES CORRÊA",
    "YAGO DUARTE DE ALMEIDA"
  ],
  '1701': [
    "ANA BEATRIZ COSTA BRITO",
    "ANA CLARA TORRES ROMERO",
    "ANA FLAVIA DE SOUZA DA SILVA",
    "ANNA CAROLINA ALVES BARBOZA",
    "EDUARDA DA SILVA MATTOS",
    "ENZO MIGUEL DE OLIVEIRA AMARAL",
    "GIOVANNA VICTORIA DE MIRANDA",
    "GUILHERME DE PAULA GARCIA MEDEIROS",
    "ISABELLY DE ALMEIDA OLIVEIRA",
    "ISADORA BRITO FRIAS DE OLIVEIRA",
    "JONATHAN ALVES LOURENÇO",
    "JULIA CLAUDINA DA SILVA",
    "KARIELLY VITORIA DA SILVA BARROS",
    "KAUÊ DOS SANTOS RODRIGUES",
    "LILIAN DE MORAES ALVES",
    "LUANA SILVA DE SOUZA FIDALGO",
    "LUCAS SANTOS DE MELO",
    "LUIZ FERNANDO BENTO",
    "LUYZ ANTONIO DE JESUS DA SILVA",
    "MARCELO VINICIUS FRANZI DOS SANTOS",
    "MARIA EDUARDA DA SILVA SANTOS",
    "MARIA EDUARDA GUIMARÃES DA SILVA MARTINS",
    "MARIA EDUARDA SOARES DOS SANTOS",
    "MARIA PAULA DE LIMA SILVA",
    "MARINA AVELLAR GOMES DA CONCEIÇÃO",
    "MIGUEL ELISIÁRIO COELHO",
    "MIGUEL SILVA DA CRUZ",
    "MIRELLA TEIXEIRA ZUMBA",
    "NATHÁLIA ALBINO DA SILVA",
    "PEDRO HENRIQUE DA SILVA OLIVEIRA",
    "RIANA MAIRA RAMOS DOS SANTOS",
    "SAMUEL LANNA LIMA PINTO",
    "THIEGO FERREIRA DE SOUZA",
    "VICTOR PIRAGIBE DE OLIVEIRA COSTA CAVALCANTE",
    "YANNAYARA SAMYRA ALVES RICARTE"
  ],
  '1702': [
    "ANA JULIA FERREIRA DA COSTA",
    "ASHLEY CRISTINA MAMEDE CORRÊA",
    "CASSIANE NASCIMENTO BARBOSA",
    "DANIEL DA ROCHA DUTRA",
    "DAVI DA SILVA DOS PASSOS",
    "DAVI DE PAULO PEREIRA",
    "ENZO GABRIEL LESSA DE SOUZA DOS REIS",
    "FABIANO ANDRADE DE MÉLO MORAES DA LUZ",
    "GABRIEL FERNANDO DO CARMO DOS SANTOS",
    "GABRIELLE MELLO DOS SANTOS",
    "GIOVANNA FERREIRA RIBEIRO SILVA",
    "JAMILLY ASHLEY RODRIGUES DA SILVA",
    "JOÃO HENRIQUE CANCIO SARAIVA",
    "LUANNA DA SILVA SANTOS",
    "LUIS HENRIQUE SILVA OLIVEIRA",
    "LUIZ CLAUDIO SEIXAS ALVARENGA BERNARDO",
    "MANUELE FIEL DE ARAUJO",
    "MÁRCIO JOSÉ DA SILVA NETO",
    "MIGUEL WENDELL DA SILVA BATISTA",
    "MYKAELLA DE JESUS",
    "NICOLE VERAS DOS SANTOS",
    "PEDRO OGAWA DA CUNHA",
    "PEDRO RICHARD DIONISIO LOURENÇO",
    "RAFAEL DE JESUS CORDEIRO SILVA",
    "RAFAELLA OLIVEIRA DOS ANJOS",
    "REBECA SANT`ANNA RIBAS",
    "SAMUEL RODRIGO DE ANDRADE ALVES",
    "SOFIA MARYNEUSA SILVA DOS SANTOS",
    "SOPHIA PRATES DOS SANTOS NASCIMENTO",
    "SOPHIA VITÓRIA MORAES NASCIMENTO",
    "VALENTINA LOPES GOMES NAVARRO MENDES",
    "VALENTINA MOREIRA DE SOUZA",
    "VICTOR MATHEUS GAMA DA SILVA",
    "YASMIM VITÓRIA FRAGA RÊGO",
    "YASMIN DE SALES CORRÊA"
  ],
  '1801': [
    "ALÍCIA DE FREITAS CALVENTE NILTON",
    "ADRIELLE OLIVEIRA DAS NEVES",
    "ALYSON DE SOUZA BERLINDO",
    "ANA CAROLINA GOMES DA SILVA",
    "ANA CLARA GONÇALVES PIMENTA",
    "CAUÃ MIGUEL DE JESUS DA SILVA",
    "DAVI FERREIRA RIBEIRO JUSTO",
    "EDUARDA CRISTYNE SILVEIRA DE OLIVEIRA",
    "EDUARDA PATROCINIO TORRES",
    "ELIZA VITORIA DE OLIVEIRA",
    "EMILI MOURA DE ARAUJO",
    "GABRIEL SERÊJO DA SILVA",
    "KETHELLEN DA SILVA SOUZA",
    "LARISSA OLIVEIRA DA SILVA",
    "LAYANE MAGALHAES DOS SANTOS",
    "LEONARDO FRANCELINO MARQUES DA SILVA",
    "LISANDRO BRITO DA SILVA",
    "LÍVIA SANTANA NOGUEIRA",
    "LUIZ OCTAVIO MOÇO COSTA",
    "MARCOS PAULO FIGUEIREDO NUNES DA SILVA",
    "MIGUEL ARTUR RIBEIRO CONSTANTE",
    "NATHALLY MAGALHÃES DE OLIVEIRA",
    "NICOLE BEATRIZ DOS SANTOS MARQUES",
    "NICOLE CORRÊA DOS SANTOS",
    "PAULO HENRIQUE DA SILVA FERREIRA",
    "SAMUEL BRAYAN DE OLIVEIRA GOMES",
    "SAMUEL XAVIER SANT'ANA DE MELO",
    "VALENTINA DA SILVA MORAES",
    "VITOR HUGO OLIVEIRA DA SILVA",
    "WALLACE DE JESUS CORDEIRO SILVA",
    "WELLINGTON BRAYAN BRITO DE SOUZA"
  ],
  '1802': [
    "ÁGATHA CRISTINI JESÚS FERREIRA",
    "ÁGATHA LORENA CRISTINA MENDES LEAL",
    "EMANUELE ALVES GOUVEIA",
    "EMILLY VICTÓRIA DA SILVA SANTANA",
    "ENZO NERI PRADO",
    "ERICKE GABRIEL LEMOS DO PRADO",
    "EWERTON FIDELES",
    "FLÁVIO RODRIGUES CORRÊA",
    "GABRIEL KAUE DA CRUZ VINHAES",
    "GABRIEL MENEZES COELHO HONORIO",
    "GUSTAVO CARLOS DOS SANTOS",
    "JEFFERSON MARTINS DE PAULA JUNIOR",
    "JOÃO PEDRO SIQUEIRA CAVALCANTE",
    "JOÃO VITOR DA SILVA LIMA",
    "LARAH SANTOS GONÇALVES",
    "LARISSA LIMA DE OLIVEIRA",
    "MARIA EDUARDA DE OLIVEIRA DA SILVA",
    "MARIA EDUARDA FIGUEIREDO NUNES DOS SANTOS",
    "MIGUEL DOS SANTOS LOPES",
    "MIGUEL RIBEIRO CONCEIÇÃO",
    "MYLENA ROSA DE GONZAGA SILVA",
    "NATASHA CARDOSO DOS SANTOS",
    "NICHOLAS DANIEL SOUZA DA SILVA",
    "PÂMELA KAMYLLY DA SILVA DE ALMEIDA",
    "PEDRO HENRIQUE ROBERTO MAGALHÃES",
    "RAFAELA SOFIE SANTOS DA SILVA",
    "RAQUEL PEREIRA MARTINS",
    "RAYANE SANTOS",
    "REBECCA SALES GUAIANO",
    "TAYNARA LUIZ BRAGA",
    "VICTÓRIA LARA DE ALMEIDA CABRAL COSTA",
    "WALLACE COELHO GOMES",
    "YASMIN VICTÓRIA DA SILVA NEVES"
  ],
  '1803': [
    "ANA CAROLINA SANTOS RIBEIRO DA SILVA",
    "ANA CLARA CHAGUES GONÇALVES",
    "ANA CLARA VILLAS BOAS MANSO",
    "ANA MANUELA VASCONCELOS DA SILVA",
    "ANNY VITÓRIA ANSELMO LOPES",
    "CAIO VINICIUS DA SILVA DOMICIANO",
    "CHARLES GABRIEL PIRASSOLI DE OLIVEIRA",
    "DAVI ANDERSON RODRIGUES DO NASCIMENTO",
    "ELIONAY ALMEIDA BARBOSA",
    "EMILLY SOUSA DIAS",
    "EMILLY VITORIA DA SILVA",
    "ESTHER DA SILVA LÚCIO BASTOS",
    "GABRIEL CALOIERO FERNANDES",
    "GUILHERME MONTEZ COSTA",
    "IRANILDO LUCAS DE SANTANA MARINHO",
    "JÚLIO CESAR CAVALCANTI DA SILVA",
    "KAMILLY VITÓRIA FERREIRA VIANA SIMÕES",
    "KAUÃ JORGE LOPES SANTOS",
    "LUCAS GABRIEL SILVA DE FRANÇA",
    "LUIS FERNANDO MAURICIO DOS SANTOS",
    "LUIZ DAVI GALVÃO FREITAS",
    "MARCELLA PEREIRA DA SILVA",
    "MARIA EDUARDA DA SILVA DE MEDEIROS",
    "MARIA SOFIA MORAES DA SILVA",
    "MAYSA FERREIRA PASSOS DA SILVA",
    "MYCHAEL VICTHOR FRANZI DOS SANTOS",
    "RAFAEL FERNANDO DO CARMO DOS SANTOS",
    "ROSANA VICTÓRIA DA CONCEIÇÃO FARIAS",
    "SAMUEL FARIAS HONORIO",
    "YURI DA SILVA LINS"
  ],
  '1901': [
    "ARTHUR GABRIEL LOPES FERREIRA",
    "BEATRIZ GOES DA CRUZ",
    "BERNARDO DE OLIVEIRA ANDRADE",
    "CAIO JOSÉ NASCIMENTO FERREIRA",
    "DAVI NASCIMENTO SILVA",
    "EDUARDA DE QUEIROZ DA SILVA",
    "EMANUEL MATEUS DA SILVA BORGES",
    "ESTHER CRISTAL DE ABREU MENDES",
    "GABRIEL VITÓRIO QUEIROZ MACEDO",
    "GIOVANNA ROSA FRANCISCO",
    "GUILHERME AMORIM PEREIRA",
    "GUSTAVO DE MORAES ALVES",
    "GUSTAVO HENRY NORONHA DE SIQUEIRA DE ARAUJO",
    "JAMES PEREIRA DE PINHO",
    "JOÃO GABRIEL DOS SANTOS CARDOSO",
    "JONATHAN CHAGUES GONÇALVES",
    "JUAN FELIPE GOMES RODRIGUES",
    "JULIANA CORDEIRO DA SILVA SANTOS",
    "JULYA DE ALMEIDA DE CARVALHO",
    "KAYKE FERREIRA GRIGORIO",
    "LUIZA MEL DOS SANTOS RIBEIRO",
    "MARCOS VINICIUS PEREIRA MACHADO",
    "MATHEUS NASCIMENTO DA SILVA",
    "MATHEUS SOUZA DA SILVA",
    "MAYARA JENIFFER MACEDO DE SOUZA",
    "SAMUEL MAGALHÃES BARBOSA",
    "SARA NAUANNY DA SILVA",
    "SILVIO RODRIGUES SILVA",
    "THAIS SANTOS DA CRUZ",
    "VITÓRIA GOMES DA SILVA",
    "VITTÓRIA LANNA LIMA PINTO",
    "YASMIN MICHELLE SANTOS GUIMARÃES MOURA"
  ],
  '1902': [
    "ANA HELOIZA DE PAULA GONÇALVES DE LIMA",
    "ARTHUR SANTOS DE MELO",
    "BERNARDO PASSOS DO NASCIMENTO ROBERTO",
    "CAIQUE DA CONCEIÇÃO DOS SANTOS TITO",
    "CARLOS EDUARDO SOUZA ANTUNES",
    "DAVI COSTA REZENDE",
    "DIOGO MIGUEL DE OLIVEIRA ROCHA",
    "EDUARDA SILVA DE JESUS",
    "EDUARDO LOPES DE MIRANDA",
    "ELOA JUSTINO VIEIRA DE SANTANA",
    "FERNANDA COSTA MORAIS",
    "FRANCIELA DA SILVA PASSOS",
    "GABRIELA SOUZA VIEIRA",
    "GRASIELI DE LIMA ALVES",
    "HEBERT LUIS GONÇALVES DA SILVA",
    "HELOIZA LOPES DE MIRANDA",
    "IVY LUÍZA ALVES DA SILVA",
    "JHULIA GARCÍA MONTEIRO",
    "JULIANA PEREIRA COSTA",
    "JULIO CESAR DOS SANTOS DA SILVA JUNIOR",
    "KÍRIA DA SILVA VASCONCELOS",
    "LETÍCIA DIAS DA COSTA LIRA",
    "LUAN MOURA DE ARAÚJO",
    "MARCELA VITORIA CLAUDIANO DE OLIVEIRA",
    "MARIA CLARA DO VALE FERREIRA",
    "MYRELLA NASCIMENTO DOS SANTOS",
    "NATÁLIA DE SIQUEIRA BRITO",
    "NICOLLY SANTIAGO DA SILVA",
    "PEDRO HENRIQUE DE PAULA MOREIRA DA SILVA",
    "PIETRA MIRELLA MESQUITA DUARTE",
    "RODRIGO CHAGUES MENEZES DE SOUZA",
    "SAMUEL ELISÁRIO COELHO",
    "SAMUEL LINHARES DA SILVA RAPOSO",
    "VICCENZO ROCCO TAVARES BURGOS",
    "YASMIN VALENTINE PEREIRA DE SOUZA"
  ]

};

  for (const [turmaNome, alunos] of Object.entries(turmasComAlunos)) {
    const turma = await prisma.turma.findUnique({ where: { name: turmaNome } });
    if (!turma) continue;

    await prisma.aluno.createMany({
      data: alunos.map(name => ({
        name,
        turmaId: turma.id,
        matricule: `ALU-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        active: true,
      })),
      skipDuplicates: true,
    });
  }

  console.info('✅ Seed concluído com sucesso!');
}

main()
  .catch(error => {
    console.error('❌ Erro durante o seed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
