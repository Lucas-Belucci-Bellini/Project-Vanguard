# ADR-0014 — Capacidades observáveis do dispositivo

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / diagnóstico local

## Contexto

O prompt Mobile V2 exige que GPS, bússola, armazenamento, rede, bateria e compartilhamento tenham estados explícitos, mas a presença de uma API no WebView não prova hardware, permissão, sinal, quota, calibração ou consumo. O diagnóstico existente tinha itens individuais, porém não oferecia uma matriz comum de estados.

## Decisão

Criar `src/core/capacidades.js` como camada compartilhada, síncrona e sem telemetria. `detectarCapacidades()` recebe as APIs do ambiente e retorna registros para GPS/GNSS, orientação, armazenamento local, rede, bateria e compartilhamento. Os estados permitidos são:

| Estado | Significado |
|---|---|
| `AVAILABLE` | a capacidade/API está observável e disponível no contexto consultado |
| `UNAVAILABLE` | a API existe, mas não está disponível neste momento, como rede offline |
| `DENIED` | há uma indicação explícita de permissão negada |
| `NOT_SUPPORTED` | o ambiente não expõe a API necessária |

O Diagnóstico exibe a matriz em um grupo `CAPACIDADES`. Os detalhes informam limites relevantes, como sensor físico e calibração dependentes do dispositivo, quota não confirmada e ação explícita necessária para compartilhar.

## Consequências

O app passa a comunicar diferenças entre suporte, estado atual e permissão sem esconder falhas em strings genéricas. A camada não promete uma bússola magnética só porque `DeviceOrientationEvent` existe, não transforma `navigator.onLine` em prova de internet funcional e não substitui os testes em Android, Xiaomi/MIUI/HyperOS e iPhone.

A detecção de GPS reconhece o bridge Capacitor foreground ou a API Web; não altera a política de localização, não habilita background GPS e não pede novas permissões. O armazenamento é apenas sondado por leitura; não grava marcador de teste.

## Evidência

`test/capacidades.test.js` cobre os quatro estados, APIs ausentes, GPS negado e bridge que lança erro. A unidade também passou pela suíte completa, build web, sintaxe do Service Worker, auditoria de produção, sync Android/iOS e APK debug. A verificação física continua pendente conforme `MOBILE_V2_TEST_MATRIX.md`.
