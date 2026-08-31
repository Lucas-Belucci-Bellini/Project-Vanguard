# Release 1.3.0 — Vanguard Field

## Estado

A identidade pública do projeto foi alinhada para `1.3.0` em `package.json`, configuração do aplicativo, Android, iOS e workflow mobile. As tags anteriores permanecem intactas.

## O que mudou nesta etapa

- O catálogo público de bases cartográficas não expõe mais a base CARTO opcional quando não há credencial configurada; o provider continua disponível no runtime para compatibilidade.
- A suíte de testes passou a executar testes base com Node e testes do Map Engine com Vitest, conforme os imports existentes.
- Android usa `versionName 1.3.0` e `versionCode 130`.
- iOS usa `MARKETING_VERSION 1.3.0` e `CURRENT_PROJECT_VERSION 130`.
- O workflow mobile usa `1.3.0` como versão padrão solicitada.

## Testado

- `npm ci` concluído no ambiente local.
- `npm run build` concluído antes desta etapa.
- A suíte foi reexecutada após a correção do runner; a validação final completa será registrada após todos os ajustes da release.

## Não testado

Não foram executados aparelho Android/iOS real, sensores físicos, background geolocation, assinatura de produção, publicação de artefatos, serviços externos ou cobertura cartográfica offline regional/mundial.

## Limitações e bloqueios conhecidos

A disponibilidade de tiles depende das fontes externas e da rede. Não existe dataset regional/mundial redistribuível aprovado. Artefatos unsigned/debug não são produção e não constituem assinatura real. GPS, bússola, bateria, safe areas, rotação e leitores de tela ainda exigem validação física.

## Artefatos

A build web gera `dist/`. Os artefatos mobile somente devem ser chamados de debug, unsigned, signed ou production-ready conforme a evidência real de cada pipeline.
