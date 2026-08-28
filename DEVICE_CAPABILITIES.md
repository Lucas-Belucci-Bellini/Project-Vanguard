# Vanguard Field — matriz de capacidades por plataforma

> Atualizada em 2026-08-27 a partir do código e dos gates disponíveis. `SYNC`, build, CI e APK debug não provam instalação, sensor, GPS, bateria ou comportamento offline em um dispositivo real.

Esta matriz descreve o contrato honesto do Vanguard Field civil. **Browser Dependent** significa que o navegador/WebView decide disponibilidade e comportamento. **Device Dependent** significa que o hardware, sistema operacional ou fabricante precisa ser testado. **Environment Blocked** significa que o ambiente atual não permite provar a capacidade. `Fallback` descreve o comportamento seguro quando a capacidade não está disponível; não representa uma simulação equivalente.

| Feature | Web | Android | iOS | Required Hardware | Permission | Fallback |
|---|---|---|---|---|---|---|
| GPS/GNSS foreground | BROWSER DEPENDENT; Geolocation API | IMPLEMENTED no contrato Capacitor, somente foreground | ENVIRONMENT BLOCKED para build/instalação física; contrato sincronizado | receptor GNSS ou provedor de localização do sistema | navegador; `ACCESS_COARSE_LOCATION`/`ACCESS_FINE_LOCATION` foreground no Android; localização ao usar no iOS | posição manual/destino informado pela pessoa; mostrar `INDISPONÍVEL` quando não houver leitura |
| Fixo manual de maior precisão | BROWSER DEPENDENT; solicita `enableHighAccuracy` e `maximumAge: 0` | IMPLEMENTED no contrato foreground; depende do aparelho | ENVIRONMENT BLOCKED | GNSS/provedor atual e condições de recepção | mesma permissão de localização | manter último estado com idade/precisão visíveis; não aplicar snap-to-road |
| Rastreamento de trilha | BROWSER DEPENDENT em foreground | IMPLEMENTED em foreground | ENVIRONMENT BLOCKED para validação física | localização disponível durante a tela ativa | localização foreground | pausar, preservar pontos locais e mostrar estado |
| Localização em background | NÃO IMPLEMENTADO | NÃO IMPLEMENTADO | NÃO IMPLEMENTADO | serviço nativo e política específica, ainda fora do escopo | não solicitar permissões extras | pausar ao ocultar o app; não prometer rastreamento contínuo |
| MGRS/UTM, rumo e distância | IMPLEMENTED em lógica compartilhada | IMPLEMENTED em lógica compartilhada | IMPLEMENTED em lógica compartilhada, sem validação física | nenhum sensor adicional para cálculo a partir de lat/lon | nenhuma | exibir latitude/longitude; indicar indisponibilidade quando a posição for inválida |
| MapLibre e bases cartográficas | IMPLEMENTED no build; provedor depende de rede/cobertura | pacote WebView sincronizado; aparelho ainda não validado | pacote WebView sincronizado; aparelho ainda não validado | tela e rede para online | nenhuma específica | base e rótulos preparados no Cache Storage; se ausentes, manter estado de mapa não pronto |
| Tiles e rótulos offline | IMPLEMENTED no contrato de preparação; quota e cobertura pendentes | DEVICE DEPENDENT | DEVICE DEPENDENT | armazenamento suficiente e área previamente preparada | nenhuma específica | informar que a área precisa ser preparada; não declarar mapa offline pronto sem confirmação |
| Estado local e trilhas | IMPLEMENTED com `localStorage`/Cache Storage | DEVICE DEPENDENT para quota, reinstalação e limpeza do SO | DEVICE DEPENDENT para quota, reinstalação e limpeza do SO | armazenamento persistente | nenhuma específica | `PERSISTIDO`/`FALHA`; manter erro observável e não afirmar recuperação automática |
| Bússola | BROWSER DEPENDENT | DEVICE DEPENDENT | DEVICE DEPENDENT | magnetômetro/sensor de orientação | pode exigir permissão de orientação | rumo GPS quando válido; caso contrário `INDISPONÍVEL`; nunca inventar heading |
| Tela ativa / Wake Lock | BROWSER DEPENDENT | BROWSER/WEBVIEW DEPENDENT | BROWSER/WEBVIEW DEPENDENT | suporte a Wake Lock e política do SO | nenhuma ou conforme navegador | tela pode dormir; tracking não vira background |
| Compartilhamento | BROWSER DEPENDENT; Web Share quando disponível | DEVICE DEPENDENT via WebView/OS | DEVICE DEPENDENT via WebView/OS | Share Sheet/handler do sistema | nenhuma específica | clipboard e download; compartilhar/copiar não confirma entrega |
| Importação de arquivos | BROWSER DEPENDENT; input de arquivo | DEVICE DEPENDENT; Files/WebView | DEVICE DEPENDENT; Files/WebView | acesso a arquivo escolhido pela pessoa | ação explícita do usuário | JSON/GPX/KML local validado; rejeitar formato, schema ou geometria inválidos |
| Exportação de arquivos | BROWSER DEPENDENT; download/Web Share | DEVICE DEPENDENT | DEVICE DEPENDENT | armazenamento/Share Sheet | ação explícita do usuário | download local; nunca sincronizar automaticamente |
| Manual de sobrevivência | IMPLEMENTED localmente | IMPLEMENTED no pacote WebView, instalação física pendente | IMPLEMENTED no pacote WebView, instalação física pendente | armazenamento local | nenhuma | conteúdo continua disponível enquanto o shell local estiver acessível |
| Diagnóstico | IMPLEMENTED com estados observáveis | DEVICE DEPENDENT para valores físicos | ENVIRONMENT BLOCKED para valores físicos | APIs de sistema quando existentes | conforme cada capacidade | rótulos `INDISPONÍVEL`, `BROWSER DEPENDENT` ou `DEVICE DEPENDENT` |
| Atualização PWA | IMPLEMENTED com confirmação de SW waiting | pelo WebView/PWA, DEVICE DEPENDENT | pelo WebView/PWA, DEVICE DEPENDENT | service worker/controlador | ação explícita do usuário | continuar versão atual se estiver offline; não instalar silenciosamente |
| Atualização do APK | NÃO APLICÁVEL ao navegador | PREPARADO: abre origem oficial após confirmação; instalação é do SO | NÃO APLICÁVEL ao APK Android | navegador/instalador Android e release posterior real | ação explícita do usuário | manter versão atual; não baixar/executar APK silenciosamente |
| Atualização iOS | NÃO APLICÁVEL ao navegador | NÃO APLICÁVEL | ENVIRONMENT BLOCKED; requer macOS/Xcode/signing | ambiente Apple e distribuição | ação explícita do usuário | manter versão instalada |
| Bateria | API e navegador dependentes; sem medição universal | DEVICE DEPENDENT | DEVICE DEPENDENT | medição real do aparelho | nenhuma específica | mostrar indisponível; usar política econômica sem prometer quatro dias |
| Ciclo de vida | IMPLEMENTED em observação PWA | DEVICE DEPENDENT para suspensão/retomada do SO | DEVICE DEPENDENT para suspensão/retomada do SO | sistema operacional e processo WebView | nenhuma específica | pausar watcher ao ocultar; informar estado |
| Rotas de peregrinação | catálogo local compartilhado | mesma lógica no WebView | mesma lógica no WebView | nenhum hardware para o catálogo | nenhuma | referências e fontes; sem traçado até GPX/KML oficial/autorizado |

## Regras de interpretação

A tabela não declara que Web, Android ou iOS estão prontos para distribuição. O projeto possui lógica compartilhada, sync e APK debug reproduzível, mas a matriz física continua pendente para Android comum, Xiaomi/MIUI/HyperOS, iPhone e iPad. A ausência de uma permissão ou hardware não deve ser substituída por uma leitura falsa.

A posição exibida deve conservar latitude/longitude, precisão e idade do fixo. Alta precisão é reservada à trilha ativa, ao socorro manual e ao botão **Centrar**; o watcher de cidade permanece econômico. Em edifícios, um novo fixo de alta precisão ainda pode ter erro grande por obstrução, reflexão, Wi-Fi ou provedor do sistema.

A API de satélite real usada historicamente como contingência de construção permanece separada da wiki virtual de Arma 3. O Vanguard Field civil usa mapas do mundo real; a wiki Arma 3 e seus módulos balísticos permanecem isolados e restritos ao videogame.

## Evidência atual

| Evidência | O que prova | O que não prova |
|---|---|---|
| `npm test`, build e CI | contratos compartilhados, sintaxe e integração de build | sensor, precisão física, bateria, instalação ou modo avião |
| `npx cap sync android/ios` | cópia do build e sincronização do projeto | build assinado, instalação ou funcionamento no aparelho |
| `npm run mobile:android:debug` | compilação de um artifact debug | release, signing, loja ou validação de campo |
| preview Web | carregamento visual e interações básicas observadas | cobertura cartográfica universal ou cache offline real |

## Documentos relacionados

- `MOBILE_V2_DEVICE_MATRIX.md`: modelos e cenários de validação física.
- `MOBILE_V2_TEST_MATRIX.md`: casos T-001 a T-020 e o caso T-005A do fixo manual.
- `MOBILE_V2_RELEASE_STATUS.md`: separação de debug, artifact, signing, instalação e distribuição.
- `docs/adr/ADR-0027-fixo-manual-alta-precisao.md`: decisão da solicitação manual de maior precisão.
- `docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md`: separação entre Vanguard Field civil, mundo real e wiki virtual de Arma 3.
