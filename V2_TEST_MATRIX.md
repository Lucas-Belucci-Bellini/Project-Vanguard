# Project Vanguard V2 — matriz de testes

| ID | Área | Ambiente | Cenário | Resultado esperado | Evidência atual | Status |
|---|---|---|---|---|---|---|
| T-001 | Core/engine | Node 22 | Entradas válidas, inválidas, limites, NaN e Infinity | Rejeição segura ou resultado determinístico | Suíte Node | TESTED |
| T-002 | MGRS/geodésia | Node 22 | Conversão ida/volta, fusos, antimeridiano e limites | Erro dentro do contrato e sem resultado silencioso errado | Suíte Node | TESTED |
| T-003 | GPS | Node/browser | Posição válida, negada, indisponível, baixa precisão e fixo antigo | Estados claros e idade do fixo visível | Testes locais; dispositivo pendente | IN_PROGRESS |
| T-004 | Tracking | Browser/PWA | Iniciar, pausar, retomar, limpar e importar rota | Dados locais consistentes; rota importada pausada | Testes locais; campo pendente | IN_PROGRESS |
| T-005 | Map | HTTPS | MapLibre, bases, destino, waypoint e câmera | Tela utilizável; nenhum GPS fictício | Preview anterior | IN_PROGRESS |
| T-006 | Offline shell | Chrome/PWA | Primeiro carregamento, reload sem rede e cache hit/miss | Shell e dados locais carregam; cache miss é indicado | CI/sintaxe; aparelho pendente | IN_PROGRESS |
| T-007 | Offline map | Android/iOS | Preparar área, limite, cache parcial, limpeza e troca de base | Status honesto; tiles não preparados não são fingidos | Status local; aparelho pendente | IN_PROGRESS |
| T-008 | Storage | Node/browser | Migração, versão futura, corrupção e limpeza | Fallback seguro sem apagar namespace indevido | Testes de estado | TESTED |
| T-009 | Import/export | Browser/PWA | JSON/GPX válido, inválido, altitude, timestamp e XML escapado | Valida, confirma substituição e deixa rota pausada | Suíte Node | TESTED |
| T-010 | Context/survival | Browser/offline | Busca, filtros, validade e zonas expiradas | Conteúdo local e estado de validade corretos | Suíte/dados | TESTED |
| T-011 | Socorro | Browser/aparelho | Preparar pacote, compartilhar para destino controlado e cancelar | Sem alerta real; entrega permanece desconhecida | Simulação documentada | IN_PROGRESS |
| T-012 | Compass | Android/iOS | Sensor presente, negado, ausente e calibração | Fonte do rumo clara; fallback seguro | Device required | BLOCKED |
| T-013 | Battery | Android/Xiaomi/iOS | Rota ativa, pausa, tela bloqueada, retorno e quatro dias | Consumo medido; sem promessa universal | Plano de campo | BLOCKED |
| T-014 | Lifecycle | Android/Xiaomi/iOS | Background, troca de app, reinício e permissões | Comportamento documentado e sem perda silenciosa | Device required | BLOCKED |
| T-015 | Update | PWA/APK | SW waiting, negar, confirmar, release posterior e offline | Atualização confirmada; APK abre origem oficial | Código + build; posterior pendente | IN_PROGRESS |
| T-016 | Accessibility | Android/iOS | TalkBack, VoiceOver, foco, labels e contraste | Fluxos principais compreensíveis | Device required | BLOCKED |
| T-017 | Diagnostics | Browser/PWA/mobile | Versão, rede, GPS, frescor, cache, bateria disponível e service worker | Estado local honesto e sem telemetria escondida | 5 testes determinísticos; preview com `?fresh=1`; aparelhos pendentes | IN_PROGRESS |
| T-018 | Security | Node/browser | URL abusiva, payload malformado, segredo e XSS | Rejeição/escape e nenhum segredo no bundle | Revisão contínua | IN_PROGRESS |
| T-019 | Release | GitHub/macOS/Android | Tag assinada, hashes, APK/AAB/IPA e notas | Artefatos assinados apontam ao commit aprovado | Candidate `rc.2` | BLOCKED |

## Execução

Testes automatizados devem rodar em cada commit. Testes que exigem GPS, sensor, suspensão de processo, bateria, quota, instalação ou assinatura devem ser marcados como `PHYSICAL VALIDATION REQUIRED` até executados no aparelho e ambiente correspondentes.
