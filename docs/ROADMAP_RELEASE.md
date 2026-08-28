# Roadmap de lançamento

## Estado em 2026-08-28

O Vanguard ainda não deve ser tratado como release pública final. A arquitetura do mapa está em migração para provider/runtime/adapter e o modo offline ainda depende de validações adicionais.

## Critérios para lançamento

1. Core e testes verdes.
2. Integração do Map Engine com a tela real.
3. Provider online funcional e fallback controlado.
4. Dataset offline com fonte/licença, pacote, checksum, armazenamento e recuperação definidos.
5. Testes reais de GPS, offline, bateria e dispositivos.
6. Build de produção reproduzível.
7. APK/AAB assinado e validado; distribuição iOS somente quando o pipeline correspondente estiver pronto.
8. Smoke test pós-build e documentação de instalação/rollback.

## Estratégia

- **Agora:** desenvolvimento V2 e estabilização.
- **Depois:** release candidate após fechar os critérios acima.
- **Produção:** somente após validar os artefatos e os testes em dispositivos reais.

Não existe uma data de lançamento final responsável enquanto esses critérios não estiverem fechados.
