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

## Controles aplicados nesta baseline

- Autenticacao obrigatoria por padrao para rotas `/api/*`, exceto endpoints publicos estritamente necessarios.
- Autorizacao por perfil em endpoints de alunos, professores, materias, relatorios e exportacao.
- Escopo de professor limitado aos proprios vinculos de turma, materia, aluno e relatorio.
- Criacao de relatorios validando relacoes aluno/professor/materia/turma/bimestre no servidor.
- Bloqueio de contas inativas no login.
- Login de professores com senha obrigatoria, removendo acesso apenas por matricula.
- Rate limit em login e exportacao de PPIs.
- Regras de senha mais fortes para troca de senha.
- Hash com segredo para matriculas e registros de auditoria.
- Redacao de campos sensiveis em auditoria, incluindo senha, token, matricula, conteudo e email.
- Cabecalho `Cache-Control: no-store` em respostas sensiveis de exportacao/autenticacao.
- Limitacao de volume em exportacao de PPIs para reduzir exfiltracao massiva.
- Seeds sem nomes reais e sem senhas versionadas; credenciais devem vir de variaveis de ambiente.

## Obrigacoes operacionais pendentes

- Confirmar a base legal e finalidade para cada tratamento de dados.
- Formalizar controlador, operador, encarregado e canal de atendimento ao titular.
- Definir politica de retencao e descarte para alunos, relatorios, logs e backups.
- Remover planilhas, dumps e arquivos reais do repositorio e purgar o historico Git quando aplicavel.
- Rotacionar qualquer senha, token ou credencial que tenha sido versionada ou compartilhada.
- Revisar contratos, avisos de privacidade e autorizacoes institucionais relacionadas ao uso educacional.
- Executar testes de seguranca apos deploy, incluindo tentativa de acesso a APIs sem sessao e com perfis distintos.

## Checklist de revisao por release

1. Nenhum arquivo real de aluno, professor, banco de dados ou backup deve ser commitado.
2. Toda rota nova em `/api` deve declarar autenticacao e perfis permitidos.
3. Dados de professor devem ser derivados da sessao quando o usuario autenticado for professor.
4. Exportacoes devem consultar dados autorizados no servidor e limitar volume por operacao.
5. Logs devem registrar apenas o minimo necessario e nunca armazenar senha, token ou conteudo pedagogico completo.
6. Seeds devem usar dados ficticios e senhas fornecidas por ambiente.
7. Mudancas em schema, logs ou relatorios devem ser avaliadas sob necessidade, seguranca e responsabilizacao.
