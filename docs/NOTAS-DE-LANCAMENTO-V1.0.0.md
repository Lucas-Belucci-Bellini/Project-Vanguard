# Vanguard Field v1.0.0 — Notas de lançamento

> **Status:** notas preparadas para a futura versão `v1.0.0`. A tag e a release final ainda não foram criadas. O estado publicado atualmente continua sendo a pré-release `v1.0.0-rc.2`; estas notas descrevem o código mais recente de `main`, no commit `52f13c2`.

## Resumo

O Vanguard Field é uma aplicação civil, multiuso e offline-first para cidade, caminhadas, trilhas, expedições, mar, sobrevivência e proteção civil. Esta versão consolida a navegação local, a interoperabilidade de registros, os avisos de contexto e os controles de preparação offline sem transformar um celular comum em comunicador de resgate, sensor militar, medidor de radiação ou carta náutica oficial.

## Principais novidades desde a v1.0.0-rc.2

### Navegação local e uso diário

O mapa reúne GPS/GNSS do aparelho, grade MGRS, rumo e distância até um destino, marcação de waypoints e registro local de trilha. Os modos **Cidade / Dia a dia**, **Trilha / Expedição** e **Mar / Referência** adaptam a orientação da interface ao contexto de uso. A precisão permanece aquela informada pelo aparelho; o HUD também mostra a idade do último fixo, atualiza esse dado enquanto a tela está aberta e sinaliza posições antigas como atenção.

A política de bateria mantém o perfil econômico no uso cotidiano. A alta precisão é reservada para gravação ativa de rota ou pedido explícito de posição de emergência, e a opção de manter a tela ativa é voluntária e limitada à rota ativa.

### Offline-first e mapas preparados

A shell da aplicação, os dados locais, o manual e os registros podem ser reabertos sem internet depois do carregamento inicial. A preparação de mapas permite guardar uma área limitada de tiles HTTPS permitidos, com limite de 256 URLs por preparação, tratamento do antimeridiano, consulta do cache, metadados da última tentativa e limpeza confirmada.

O cartão de prontidão offline resume posição, mapa preparado, dados locais, manual e comunicação independente. O total de tiles é agregado no aparelho e pode mostrar base, zoom, área aproximada, relação solicitado/salvo e data da última preparação. Esses dados são transparência operacional; **não provam cobertura completa, não medem a quota real do dispositivo e não substituem um pacote cartográfico oficial**.

### Registros locais e interoperabilidade

A persistência usa envelopes versionados e fallback seguro para dados legados, versões futuras ou corrupção. Rota, waypoints e destino podem ser exportados e importados como JSON versionado. Trilhas também podem ser exportadas e importadas em GPX 1.1 localmente, com validação de coordenadas, altitude e timestamps quando válidos. A importação exige confirmação, substitui os dados somente depois dessa confirmação e deixa a rota pausada.

### Contexto civil, mar e sobrevivência

Os contextos Cidade, Expedição, Mar, Desastre, Contaminada e Conflito podem ser associados a zonas locais com fonte, raio, prioridade e validade opcional. Zonas expiradas são descartadas pelo motor, e os avisos deixam claro que esses dados locais não são alertas oficiais automáticos.

O modo Mar é explicitamente uma referência visual. Satélite e topografia não fornecem profundidade segura nem substituem carta náutica oficial, Avisos aos Navegantes, marés, sonar ou julgamento local. O manual de sobrevivência é um catálogo offline versionado, com fontes, revisão, busca e filtros; mantém orientação conservadora e não ensina identificação de plantas comestíveis, explosivos ou procedimentos de risco.

### Socorro e comunicação responsável

O Modo Socorro prepara localmente um pacote validado com MGRS, latitude/longitude, precisão e horário. O compartilhamento pelo sistema operacional ou pela área de transferência é tratado apenas como uma ação manual do usuário: não há confirmação de entrega, acionamento de equipe ou transmissão automática.

A fila offline bloqueia operações que não podem ser simuladas com segurança, incluindo SOS enviado, emergência, pagamentos, rádio e mensageria via satélite. A aplicação não promete cobertura, resgate, comunicação fora da rede ou funcionamento de hardware que não esteja presente.

### Mobile e processo de entrega

Os projetos Android e iOS via Capacitor estão gerados. O Android debug é compilável no ambiente atual. A compilação e assinatura final do iOS exigem macOS, Xcode e conta Apple. O fluxo móvel mantém separados artifacts técnicos, como APK debug e AAB não assinado, de releases publicadas. Um build aprovado ou um artifact baixável não cria uma release por si só.

## Validação reproduzida

| Verificação | Resultado |
|---|---|
| `npm test` | **107 testes aprovados**, 0 falhas |
| `npm run build` | Aprovado; bundle web gerado |
| `node --check public/sw.js` | Aprovado |
| `npm run mobile:android:debug` | Aprovado; `BUILD SUCCESSFUL` |
| APK debug | `android/app/build/outputs/apk/debug/app-debug.apk`, aproximadamente 4,4 MB; artifact técnico, não release |
| CI de `main` | Execução `33032317555` concluída com sucesso no commit `52f13c2` |

## Limitações e itens fora do escopo da v1.0.0

Não fazem parte de uma promessa desta versão: SOS automático ou via satélite, rádio de longo alcance, envio de e-mail sem configuração, detecção autônoma de drones, tropas ou explosões, Geiger pelo celular, sonar, profundidade segura, carta náutica oficial sincronizada, fontes oficiais em tempo real, detecção de queda, pagamentos reais, checkout Asaas, webhooks, Supabase de produção ou auditoria fiscal automatizada.

A tela de doações permanece preparada, sem cobrança real nem credenciais de pagamento. A posição é tratada localmente por padrão, e qualquer transmissão externa depende de um provedor, hardware, rede e ação explícita que não são fornecidos pela aplicação base.

## Gate para a release final

Antes de criar a tag `v1.0.0`, ainda é necessário validar em aparelhos reais Android/Xiaomi e iPhone: instalação, permissões, perda e retorno da rede, cobertura efetiva de mapas preparados, persistência da trilha, consumo em rota e pausa, compartilhamento manual, acessibilidade e assinatura/distribuição. Até esses gates serem concluídos, este documento deve ser tratado como **resumo de release planejada**, e não como anúncio de uma release final já publicada.

## Referências internas

- [`README.md`](../README.md) — tutorial público, limites e comandos reproduzíveis.
- [`docs/RELEASE-1.0.0.md`](./RELEASE-1.0.0.md) — checklist e gates da release candidate.
- [`docs/BUILD-VS-RELEASE.md`](./BUILD-VS-RELEASE.md) — distinção entre build, artifact e release.
- [`docs/MAPA-DE-FUNCIONALIDADES.md`](./MAPA-DE-FUNCIONALIDADES.md) — inventário de escopo, dependências e limitações.
