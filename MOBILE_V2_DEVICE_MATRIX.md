# Vanguard Field — Mobile V2 Device Matrix

> Matriz de dispositivos atualizada em 2026-08-27. `VERIFIED` só será usado após execução observável no dispositivo ou simulador correspondente. A matriz de capacidades por feature, plataforma, hardware, permissão e fallback está em `DEVICE_CAPABILITIES.md`.

| Device/platform | Build/sync | Install | Required checks | Current status | Evidence needed |
|---|---|---|---|---|---|
| Web Chromium/desktop | Web build aprovado | não aplicável | shell, PWA, GPS fallback, import/export, update | TESTED | execução manual registrada |
| Android comum — versão mínima suportada | Android sync/debug aprovado | não executada nesta rodada | permissão, GPS, tracking, lifecycle, modo avião, KML/JSON/GPX, share, battery | BLOCKED | aparelho, versão, logs e resultado |
| Android recente | Android sync/debug aprovado | não executada nesta rodada | mesmos casos, atualização e reinstalação | BLOCKED | aparelho, versão, logs e hashes |
| Xiaomi MIUI/HyperOS | Android sync aprovado | não executada | suspensão, economia, permissões, tela bloqueada e retomada | BLOCKED | aparelho Xiaomi e logs de energia |
| iPhone | iOS sync aprovado no Linux | não executada | foreground GPS, lifecycle, compass, Files/Share, offline, battery | BLOCKED | macOS/Xcode, assinatura, aparelho e logs |
| iPad quando suportado | iOS sync aprovado no Linux | não executada | layout, safe areas, orientação e navegação | BLOCKED | macOS/Xcode, dispositivo e captura |

## Ordem de execução física

1. Registrar modelo, versão do sistema, build instalado, data/hora, bateria inicial e rede.
2. Testar permissão GPS concedida/negada, GPS desligado/ligado e posição fresca/antiga.
3. Testar Start/Pause/Resume/Stop, ocultação, retorno, tela bloqueada e retomada; não inferir background contínuo.
4. Preparar uma área online, confirmar o status, ativar modo avião, reabrir e verificar mapa/dados locais.
5. Importar e exportar JSON, GPX e KML; conferir Files/Share Sheet/download e hashes quando aplicável.
6. Testar bússola somente se o aparelho oferecer sensor; manter `DEVICE DEPENDENT` quando não houver.
7. Registrar bateria ao final e anexar logs/capturas. Repetir no Xiaomi e iPhone sem generalizar o resultado entre plataformas.
