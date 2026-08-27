# Project Vanguard V2 — matriz de funcionalidades

| ID | Funcionalidade | Status | Evidência | Limite/Próximo passo |
|---|---|---|---|---|
| HOME | Início, tutorial e prontidão offline | TESTED | `src/pages/inicio.js` | Validar em aparelhos reais |
| MAP | Mapa MapLibre e camadas | IN_PROGRESS | `src/pages/mapa.js`, build/preview | Testar rede, tiles e lifecycle |
| GPS | GPS/GNSS local | IN_PROGRESS | `src/core/localizacao.js`, Web fallback, `@capacitor/geolocation@8.2.2` foreground e testes | Teste físico de permissões, perda de fixo e lifecycle |
| GNSS | Uso dos sinais do receptor do aparelho | DEVICE DEPENDENT | API de localização | Não transmite dados |
| MGRS | Conversão e exibição MGRS | TESTED | `src/engine/mgrs.js` e testes | Confirmar leitura de campo |
| COMPASS | Sensor e fallback de rumo | IN_PROGRESS | `src/pages/bussola.js` | Validar sensor/precisão por aparelho |
| TRACK | Registro local, pausa e retomada | IN_PROGRESS | `src/pages/mapa.js`, `trilha.js` | Teste de quatro dias |
| WAYPOINTS | Pontos locais e notas | TESTED | Página de mapa e registros | Teste de campo |
| ROUTES | Destino, distância e rumo | TESTED | engine + mapa | Não é roteamento viário completo |
| OFFLINE_MAP | Pré-cache de tiles | IN_PROGRESS | `mapa-offline.js`, `sw.js` | Limite de 256 URLs; cobertura/quota pendentes |
| OFFLINE_DATA | Estado, manual e registros locais | TESTED | `estado.js`, catálogo e testes | Não sincroniza silenciosamente |
| SURVIVAL | Manual offline conservador | TESTED | `src/data/sobrevivencia.js` | Revisão de fontes contínua |
| CONTEXT | Contextos e zonas civis | TESTED | `contexto.js` e testes | Fonte oficial externa não sincronizada |
| EMERGENCY_PREP | Pacote local de Socorro | TESTED | `socorro.js`, simulação | Não envia nem confirma resgate |
| POSITION_SHARING | Compartilhamento manual | IN_PROGRESS | Share/clipboard do sistema | Testar destino controlado |
| IMPORT | Importação validada | TESTED | `registro-offline.js` | Rota importada fica pausada |
| EXPORT | Exportação local | TESTED | JSON/GPX | Conferir diretórios em cada OS |
| GPX | GPX 1.1 | TESTED | Parser/gerador e testes | KML é backlog |
| JSON | Backup versionado | TESTED | Envelope e testes | Backup externo recomendado |
| KML | Interoperabilidade KML | NOT_STARTED | Não presente no escopo atual | V3 backlog |
| PWA | Manifest, shell e service worker | IN_PROGRESS | `public/sw.js`, `index.html` | Testar instalação e reload offline |
| ANDROID | Capacitor + Geolocation foreground + App lifecycle | IN_PROGRESS | APK debug, Gradle, `@capacitor/app@8.1.1` e permissões coarse/fine | Assinatura, permissões e hardware/lifecycle pendentes |
| IOS | Capacitor iOS + Geolocation foreground + App lifecycle | BLOCKED | Plugins sincronizados, `Package.swift` e descrições foreground | Mac/Xcode/Apple, permissões e lifecycle necessários |
| UPDATES | Update confirmado | IN_PROGRESS | `atualizacao.js`, `atualizacao-ui.js`, SW, allowlist HTTPS oficial e teste waiting/confirmado | Testar release posterior real e instalador do sistema |
| DONATIONS | Tela preparada | NOT_CONFIGURED | Sem checkout/credenciais | Não ativar sem integração real |
| DIAGNOSTICS | Diagnóstico local dedicado | IN_PROGRESS | `src/core/diagnostico.js`, `src/core/ciclo-vida.js`, `src/pages/diagnostico.js`, rota `#/diagnostico`, 8 testes | Validar em navegador e aparelhos reais; sem telemetria oculta |
| SETTINGS | Configuração/tema local | IMPLEMENTED | Shell e estado | Expandir somente com necessidade |
| ACCESSIBILITY | Labels, salto de conteúdo, foco e contraste | IN_PROGRESS | Shell com link de salto, `<main>` focável, ARIA explícito, foco pós-rota e preview DOM | TalkBack/VoiceOver, contraste e aparelhos reais pendentes |
| EXTERNAL_HARDWARE | Satélite, beacon, rádio, Geiger, sonar | NOT_CONFIGURED | Contratos/documentação | Não simular hardware |
| LEGACY_BALLISTICS | Módulos antigos | LEGACY-RESTRICTED | Mantidos isolados | Não expandir |
