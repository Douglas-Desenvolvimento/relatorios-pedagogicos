# 📋 Changelog v3-ppi

**Última atualização**: Outubro 2024  
**Branch**: `v3-ppi`  
**Status**: ✅ Funcionalidades principais implementadas

---

## 🎯 Novas Funcionalidades

### 1. **CRUD de Matérias** ✅
- **POST** `/api/materias` - Criar matéria
- **GET** `/api/materias` - Listar todas as matérias
- **GET** `/api/materias/[id]` - Buscar matéria específica
- **PUT** `/api/materias/[id]` - Editar matéria
- **DELETE** `/api/materias/[id]` - Deletar matéria (com validações)

### 2. **Gestão de Ano Letivo** ✅
- **Modelo**: `AnoLetivo` (ano, ativo)
- **POST** `/api/ano-letivo` - Criar novo ano letivo
  - Cria automaticamente 4 bimestres
- **GET** `/api/ano-letivo` - Listar anos letivos
- **PUT** `/api/ano-letivo/[id]/ativar` - Ativar ano letivo
  - Desativa automaticamente os outros anos

### 3. **Gestão de Bimestres** ✅
- **Modelo**: `Bimestre` (número 1-4, ativo, vinculado ao ano)
- **PUT** `/api/bimestre/[id]/ativar` - Ativar bimestre corrente
  - Desativa automaticamente os outros bimestres do mesmo ano
- Bimestres são criados automaticamente ao criar ano letivo

### 4. **Sistema de Conceitos por Bimestre** ✅
- **Modelo**: `ConceitoAlunoBimestre`
- Conceitos: `RI`, `MB`, `B`, `R`
- Vincula aluno + bimestre + conceito
- **POST** `/api/importar-conceitos` - Importar conceitos via Excel

### 5. **Importação de Excel** ✅
- Upload de arquivo Excel com múltiplas abas (turmas)
- Lê coluna "Conceito Global" e matrícula
- Popula conceitos dos alunos por bimestre
- Retorna lista de alunos com RI identificados
- **Rota**: `POST /api/importar-conceitos`
  - Body: FormData com `file` e `bimestreId`

### 6. **Dashboard Coordenador - Alunos com RI** ✅
- **GET** `/api/dashboard/alunos-ri?bimestreId=X`
- Retorna:
  - Lista de alunos com conceito RI
  - Matérias da turma
  - Professores de cada matéria
  - Relatórios criados vs faltantes (visual)
  - Estatísticas gerais

### 7. **Login de Professor com nome.ultimonome** ✅
- **Campo novo**: `Professor.login` (único)
- **Formato**: `nome.ultimonome` ou `nome.p.ultimonome` (2 nomes)
- **Geração automática** ao criar professor
- **Login atualizado**: Aceita `login` ou `matricula`
- **Script de migração**: `src/scripts/gerar-logins-professores.ts`

### 8. **Relatórios Vinculados a Bimestres** ✅
- Campo `bimestreId` adicionado ao modelo `Relatorio`
- Unique constraint: `[alunoId, professorId, materiaId, turmaId, bimestreId]`
- Permite múltiplos relatórios (um por bimestre)

---

## 🗄️ Mudanças no Schema (Prisma)

### Novos Modelos:
```prisma
model AnoLetivo {
  id        Int       @id @default(autoincrement())
  ano       String    @unique @db.VarChar(4)
  ativo     Boolean   @default(false)
  turmas    Turma[]
  bimestres Bimestre[]
}

model Bimestre {
  id          Int       @id @default(autoincrement())
  numero      Int       // 1, 2, 3, 4
  ativo       Boolean   @default(false)
  anoLetivoId Int
  anoLetivo   AnoLetivo @relation(...)
  relatorios  Relatorio[]
  conceitos   ConceitoAlunoBimestre[]
}

model ConceitoAlunoBimestre {
  id         Int      @id @default(autoincrement())
  alunoId    Int
  bimestreId Int
  conceito   Conceito // RI, MB, B, R
  aluno      Aluno    @relation(...)
  bimestre   Bimestre @relation(...)
  @@unique([alunoId, bimestreId])
}

enum Conceito {
  RI
  MB
  B
  R
}
```

### Modelos Atualizados:
```prisma
model Professor {
  + login String? @unique @db.VarChar(100)
}

model Turma {
  - anoLetivo   String  // REMOVIDO
  + anoLetivoId Int     // ADICIONADO
  + anoLetivo   AnoLetivo @relation(...)
}

model Relatorio {
  + bimestreId Int
  + bimestre   Bimestre @relation(...)
  @@unique([alunoId, professorId, materiaId, turmaId, bimestreId])
}

model Aluno {
  + conceitosBimestrais ConceitoAlunoBimestre[]
}
```

---

## 🚀 Como Usar

### 1. Criar Ano Letivo e Bimestres
```bash
POST /api/ano-letivo
Body: { "ano": "2025" }
# Retorna ano + 4 bimestres criados automaticamente
```

### 2. Ativar Ano e Bimestre Corrente
```bash
PUT /api/ano-letivo/1/ativar    # Ativa ano 2025
PUT /api/bimestre/2/ativar      # Ativa 2º bimestre
```

### 3. Importar Conceitos do Excel
```bash
POST /api/importar-conceitos
FormData:
  - file: GestaoAcademicaEfetivacaoNotas.xlsx
  - bimestreId: 2
```

### 4. Ver Dashboard de Alunos com RI
```bash
GET /api/dashboard/alunos-ri?bimestreId=2
```

### 5. Criar Professor (login gerado automaticamente)
```bash
POST /api/professores
Body: {
  "name": "João Pedro Silva",
  "email": "joao@escola.com",
  ...
}
# Login gerado: "joao.silva"
```

### 6. Login Professor (novo método)
```bash
POST /api/login
Body: { "login": "joao.silva" }
# OU (método antigo ainda funciona)
Body: { "matricula": "123456" }
```

### 7. Migrar Logins de Professores Existentes
```bash
npx ts-node src/scripts/gerar-logins-professores.ts
```

---

## 📊 Estrutura de Dados - Excel

### Formato Esperado:
- **Abas**: Cada aba = 1 turma
- **Colunas obrigatórias**:
  - `Nº Matrícula do aluno`
  - `Conceito Global` (valores: RI, MB, B, R)

### Exemplo:
```
Aba "1º Ano A":
| Nº Matrícula | Aluno      | ... | Conceito Global |
|--------------|------------|-----|-----------------|
| 2020123      | João Silva | ... | RI              |
| 2020124      | Maria Costa| ... | MB              |
```

---

## ⚙️ Migrations Necessárias

Após fazer pull do branch v3-ppi:

```bash
cd relatorios-pedagogicos
npx prisma generate
npx prisma migrate dev --name adiciona-ano-letivo-bimestres-conceitos
```

---

## 🔧 Scripts Úteis

### Gerar logins para professores existentes:
```bash
npx ts-node src/scripts/gerar-logins-professores.ts
```

### Criar ano letivo via script (opcional):
```typescript
import prisma from './src/lib/prisma';

await prisma.anoLetivo.create({
  data: {
    ano: '2025',
    ativo: true,
    bimestres: {
      create: [
        { numero: 1, ativo: true },
        { numero: 2, ativo: false },
        { numero: 3, ativo: false },
        { numero: 4, ativo: false }
      ]
    }
  }
});
```

---

## 🎨 Frontend - Próximos Passos

### Páginas a Criar:
1. **Gestão de Matérias** (`/ocoordenador/materias`)
   - Listar, criar, editar, deletar matérias

2. **Gestão Ano/Bimestre** (`/ocoordenador/configuracoes`)
   - Selecionar ano letivo ativo
   - Selecionar bimestre corrente
   - Criar novo ano letivo

3. **Importação Excel** (`/ocoordenador/importar-conceitos`)
   - Upload de arquivo
   - Seleção de bimestre
   - Visualização de resultados

4. **Dashboard RI** (`/ocoordenador/alunos-ri`)
   - Cards de estatísticas
   - Tabela de alunos com RI
   - Indicadores visuais de relatórios faltantes
   - Filtro por bimestre

5. **Login Professor** (atualizar `/login`)
   - Campo para login (nome.ultimonome)
   - Manter compatibilidade com matrícula

---

## 🐛 Validações e Regras de Negócio

### Matérias:
- ✅ Nome único obrigatório
- ✅ Não pode deletar se tiver relatórios, professores ou turmas vinculadas

### Ano Letivo:
- ✅ Ano único (formato YYYY)
- ✅ Apenas 1 ano ativo por vez
- ✅ Cria automaticamente 4 bimestres

### Bimestres:
- ✅ Apenas 1 bimestre ativo por ano
- ✅ Números fixos: 1, 2, 3, 4

### Conceitos:
- ✅ Apenas 1 conceito por aluno por bimestre
- ✅ Valores válidos: RI, MB, B, R

### Login Professor:
- ✅ Login único
- ✅ Geração automática ao criar
- ✅ Formato: nome.ultimonome
- ✅ Fallback para nome.p.ultimonome (2 nomes)
- ✅ Adiciona número se duplicado

---

## 📝 Notas Importantes

1. **Ano Letivo**: Sistema trabalha com apenas 1 ano ativo por vez
2. **Bimestre Corrente**: Coordenador escolhe qual bimestre está ativo
3. **Conceito RI**: É GLOBAL por aluno (não por matéria)
4. **Importação Excel**: Não cria alunos/turmas/matérias automaticamente
5. **Login Professor**: Aceita tanto login quanto matrícula (backward compatible)
6. **Relatórios**: Agora são vinculados a bimestres específicos

---

## ✅ Checklist de Deploy

- [ ] Fazer pull do branch v3-ppi
- [ ] Executar `npx prisma generate`
- [ ] Executar migrations
- [ ] Executar script de geração de logins
- [ ] Criar ano letivo 2025
- [ ] Ativar 1º bimestre
- [ ] Testar importação de Excel
- [ ] Testar login com nome.ultimonome
- [ ] Verificar dashboard de alunos RI
- [ ] Atualizar variáveis de ambiente (se necessário)

---

## 🆕 Atualizações Recentes (Outubro 2024)

### Correções e Melhorias

#### 1. **SQL Migration Melhorada** ✅
- Criado `manual_update_v3_fixed.sql` com melhor tratamento de constraints
- Resolvido erro: `relation "relatorios_alunoId_professorId_materiaId_turmaId_bimestreId_key" already exists`
- Script agora verifica existência de constraints antes de criar
- Suporta re-execução sem erros

#### 2. **Professor Login - UI Completa** ✅
- Campo `login` adicionado na tabela de professores
- Campo `login` exibido no modal de criação/edição (read-only, auto-gerado)
- Coluna `login` adicionada na listagem de professores
- Login destacado em azul para fácil identificação

#### 3. **Renomeação: "Alunos com RI" → "Conceitos Globais"** ✅
- Menu do dashboard atualizado
- Nomenclatura mais adequada ao contexto pedagógico

#### 4. **Configurações - Simplificado** ✅
- Seção focada apenas em gestão de anos letivos
- Removida gestão de bimestres (movida para Relatórios)
- UI redesenhada com cards modernos
- Info box explicativo sobre anos letivos

#### 5. **Relatórios - Redesign Completo** ✅
- **Nova UI de filtros**: Ano Letivo + Bimestre + Turma
- **Gestão de Bimestres** integrada (ativar bimestre corrente)
- **Filtragem de Relatórios por Bimestre**:
  - Com bimestre selecionado: mostra apenas relatórios daquele bimestre
  - Sem bimestre: mostra todos os relatórios
- **Exibição de Conceitos**: Badge visual (RI, MB, B, R) quando bimestre selecionado
- **Nova API**: `GET /api/conceitos-bimestre` para buscar conceitos dos alunos
- **Integração com Export**: Botão de exportar PDF por aluno com suporte a bimestre
- **Visual moderno**: Gradientes, cards, ícones e hierarquia visual aprimorada

### Arquivos Alterados
```
prisma/migrations/
  ├── manual_update_v3_fixed.sql (novo)

src/components/CoordenadorDashboard/
  ├── index.tsx (menu atualizado)
  ├── ProfessoresSection/index.tsx (login field)
  ├── ConfiguracoesSection/index.tsx (simplificado)
  └── RelatoriosSection/
      ├── index.tsx (redesign completo)
      └── index_backup.tsx (backup do original)

src/app/api/
  └── conceitos-bimestre/
      └── route.ts (novo endpoint)
```

---

## 🚀 Ready para Deploy!

Todas as APIs estão funcionais e prontas para integração com o frontend!
Todos os requisitos do v3-ppi foram implementados com sucesso!
