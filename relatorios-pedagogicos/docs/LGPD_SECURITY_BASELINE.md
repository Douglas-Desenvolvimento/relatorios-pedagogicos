# Baseline LGPD e seguranca

Data: 2026-05-26
Branch base: `v5_ppi`
Branch de trabalho: `lgpd/compliance-baseline`

Este documento registra a baseline tecnica aplicada para reduzir risco de acesso indevido, vazamento e tratamento excessivo de dados pessoais no projeto Relatorios Pedagogicos. Ele nao substitui validacao juridica, politica institucional de privacidade ou decisao formal do controlador.

## Fontes oficiais

- Lei Geral de Protecao de Dados Pessoais - Lei 13.709/2018: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm
- ANPD - guias e publicacoes oficiais: https://www.gov.br/anpd/pt-br/documentos-e-publicacoes

## Dados tratados

O sistema trata dados pessoais de alunos, professores e usuarios administrativos, incluindo identificadores, matriculas, turmas, relatorios pedagogicos e registros de autenticacao. Em contexto escolar, esses dados devem ser tratados como restritos, com especial cuidado para dados de criancas e adolescentes.

## Escopo desta etapa

Por decisao do mantenedor, esta etapa preserva os dados reais ja versionados e nao altera planilhas, dumps, templates ou seeds que contenham dados reais. Esses itens permanecem mapeados como risco pendente para uma fase especifica de saneamento de dados e historico.

## Controles aplicados nesta baseline

- Autenticacao obrigatoria por padrao para rotas `/api/*`, exceto endpoints publicos estritamente necessarios.
- Autorizacao por perfil em endpoints de alunos, professores, materias, relatorios e exportacao.
- Escopo de professor limitado aos proprios vinculos de turma, materia, aluno e relatorio.
- Criacao de relatorios validando relacoes aluno/professor/materia/turma/bimestre no servidor.
- Bloqueio de contas inativas no login.
- Login de professores sem senha por codigo temporario de uso unico, com expiracao curta, limite de tentativas e armazenamento apenas do hash do codigo.
- Emissao de codigo temporario restrita a administradores e coordenadores autenticados.
- Rate limit em login, emissao de codigos temporarios e exportacao de PPIs.
- Regras de senha mais fortes para troca de senha de usuarios administrativos.
- Hash com segredo para matriculas e registros de auditoria.
- Redacao de campos sensiveis em auditoria, incluindo senha, token, codigo temporario, matricula, conteudo e email.
- Cabecalho `Cache-Control: no-store` em respostas sensiveis de exportacao/autenticacao.
- Limitacao de volume em exportacao de PPIs para reduzir exfiltracao massiva.

## Riscos pendentes por decisao de escopo

- Seeds ainda podem conter nomes, matriculas e credenciais fracas versionadas.
- Planilhas, dumps e arquivos reais devem ser avaliados antes de qualquer remocao.
- Apagar arquivos no branch nao remove historico Git; purge de historico deve ser planejado separadamente.
- Credenciais ja versionadas ou compartilhadas devem ser rotacionadas em ambiente controlado.

## Obrigacoes operacionais pendentes

- Confirmar a base legal e finalidade para cada tratamento de dados.
- Formalizar controlador, operador, encarregado e canal de atendimento ao titular.
- Definir politica de retencao e descarte para alunos, relatorios, logs e backups.
- Planejar saneamento de dados reais no repositorio sem interromper o uso operacional.
- Revisar contratos, avisos de privacidade e autorizacoes institucionais relacionadas ao uso educacional.
- Executar testes de seguranca apos deploy, incluindo tentativa de acesso a APIs sem sessao e com perfis distintos.

## Checklist de revisao por release

1. Toda rota nova em `/api` deve declarar autenticacao e perfis permitidos.
2. Dados de professor devem ser derivados da sessao quando o usuario autenticado for professor.
3. Exportacoes devem consultar dados autorizados no servidor e limitar volume por operacao.
4. Logs devem registrar apenas o minimo necessario e nunca armazenar senha, token ou conteudo pedagogico completo.
5. Mudancas em schema, logs ou relatorios devem ser avaliadas sob necessidade, seguranca e responsabilizacao.
6. Arquivos reais de aluno, professor, banco de dados ou backup devem ser tratados em etapa propria de saneamento.
