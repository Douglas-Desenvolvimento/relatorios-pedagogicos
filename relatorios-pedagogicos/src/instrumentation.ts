/**
 * Next.js instrumentation hook.
 * Roda 1x quando o servidor Node.js sobe.
 * Aqui disparamos a verificação/criação automática do schema do banco.
 *
 * Docs: https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation
 */

export async function register() {
  // Roda apenas no runtime Node.js (evita rodar no Edge runtime).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return

  console.log('[INSTRUMENTATION] 🚀 Inicializando aplicação...')

  try {
    const { ensureDatabaseInitialized } = await import('./lib/db-init')
    await ensureDatabaseInitialized()
    console.log('[INSTRUMENTATION] ✅ Inicialização concluída')
  } catch (err) {
    // Não derruba o servidor: deixa o app subir e logamos o erro.
    // As rotas que dependem do banco vão re-tentar via ensureDatabaseInitialized().
    console.error(
      '[INSTRUMENTATION] ⚠️  Falha na inicialização do banco (app vai subir mesmo assim):',
      err,
    )
  }
}
