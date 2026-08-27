# ADR-0015 — Adaptador compartilhado de compartilhamento

- **Status:** Aceita
- **Data:** 2026-08-27
- **Escopo:** Mobile V2 / WebView / PWA

## Contexto

O Socorro compartilhava texto diretamente pela API do navegador, enquanto o Mapa exportava JSON e GPX somente por `<a download>`. Isso duplicava lógica e não oferecia um caminho comum para o Share Sheet de arquivos em ambientes móveis. A presença de `navigator.share` ou de um download também não confirma recebimento por outra pessoa.

## Decisão

Criar `src/platform/compartilhamento.js` com duas operações explícitas:

| Operação | Canal preferencial | Fallback |
|---|---|---|
| Texto/coordenadas | Web Share | clipboard; depois estado indisponível com coordenadas visíveis |
| JSON/GPX | Web Share para arquivos quando `canShare` aceita | download local; depois estado indisponível |

O adaptador retorna estados `COMPARTILHADO`, `COPIADO`, `BAIXADO`, `CANCELADO`, `INDISPONÍVEL` ou `FALHA`. `COMPARTILHADO` significa somente que o sistema operacional aceitou a operação; não significa que o destinatário recebeu, que uma equipe foi avisada ou que um resgate foi acionado.

O Socorro usa o adaptador para texto e mantém o alerta local como compartilhado somente quando a operação foi aceita pelo sistema ou o texto foi copiado. O Mapa usa o adaptador para JSON/GPX e informa se houve Share Sheet, download local, cancelamento ou ausência de canal.

## Limites

O fallback de download não promete a pasta de destino no Android/iOS. Nenhum plugin nativo de compartilhamento ou permissão nova foi adicionado sem necessidade comprovada. A validação do Share Sheet, Files, clipboard e downloads continua dependente de dispositivo e sistema operacional.

## Evidência

`test/compartilhamento.test.js` cobre Web Share, cancelamento, clipboard, compartilhamento de arquivo, download e APIs ausentes. A suíte, build web, sync Android/iOS e APK debug continuam obrigatórios; teste físico permanece pendente em `MOBILE_V2_TEST_MATRIX.md`.
