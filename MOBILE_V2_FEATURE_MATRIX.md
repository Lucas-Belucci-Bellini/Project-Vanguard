# Vanguard Field — Mobile V2 Feature Matrix

> Inventário funcional da execução Omega, atualizado em 2026-08-27. A coluna de evidência não transforma implementação em capacidade física verificada.

| Área | Feature | Estado do código | Cobertura atual | Limite/evidência pendente |
|---|---|---|---|---|
| Navegação | GPS/GNSS local, MGRS, rumo, distância e fixo manual sob ação explícita | Implementado | testes do motor, localização, frescor e política `manual` | sinal, precisão, ambiente interno/externo e aparelho real |
| Tracking | Start, Pause, Resume, Stop, Save, Restore, Export | Implementado | máquina `trilha-sessao`, registro JSON/GPX/KML | lifecycle, tela bloqueada e bateria |
| Pontos | Waypoints e destino | Implementado | validação, estado e serialização | uso touch em dispositivo |
| Mapas | MapLibre, quatro bases, nomes/limites, centralização, grade e tiles preparados | Implementado | contratos das camadas, build, planner e política do SW; OSM/ArcGIS sem CARTO/API key | provedor, cobertura, quota e modo avião; cidades de referência não são uma rota oficial |
| Rotas | Catálogo de referências de peregrinação, fontes e estados de evidência | Implementado | testes do catálogo e imutabilidade; seletor no Mapa | GPX/KML oficial/autorizado, traçado, atualização e validação física |
| Import/export | JSON, GPX 1.1 e subconjunto KML 2.2 | Implementado | parsers, limites/XML seguro e classificador de extensão/MIME | MIME pode ser omitido; conteúdo ainda requer parser e Files/Share Sheet físico |
| Compartilhamento | texto, coordenadas, JSON, GPX e KML | Implementado | Web Share, clipboard e download fallback | Share Sheet/Files físico |
| Socorro | preparação manual de posição/pacote | Implementado | contrato local | não envia SOS nem confirma entrega/resgate |
| Bússola | UI e fallback de rumo GPS | Parcial | APIs observáveis | sensor magnético/calibração reais |
| Diagnóstico | GPS, permissão, lifecycle, capacidades, storage e performance local | Implementado | testes determinísticos | leituras físicas e profiling |
| PWA | manifest, service worker, waiting update | Implementado | build e testes do SW | instalação, update e modo avião reais |
| Android | Capacitor, permissões foreground, debug APK | Implementado | sync, Gradle e CI | aparelho Android, Xiaomi e assinatura |
| iOS | Capacitor, bundle, descrição foreground, sync | Implementado | sync no Linux | macOS/Xcode, assinatura, iPhone/iPad |
| Release | workflow artifact-only | Implementado | run `33121937373` | signing, instalação, tag e distribuição |
| Pagamentos | Asaas/Supabase/e-mail fiscal | Não configurado | nenhuma integração | credenciais, autorização e escopo fiscal |
| Capacidades militares | radar, detecção ofensiva, rádio, satélite, Geiger/sonar | Não implementado | não aplicável | não inventar hardware ou integração |

## Política

A aplicação é civil, local-first e sem telemetria automática. Recursos externos, sensores e distribuição somente podem ser declarados disponíveis após integração real e validação correspondente.
