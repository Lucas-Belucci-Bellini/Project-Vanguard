# Validação do lifecycle no preview — 2026-08-27

## Tentativa registrada

Foi aberta a rota `http://localhost:5174/?fresh=20260827-lifecycle#/diagnostico` após o build web. A estrutura visual carregou corretamente (título **Estado observável**, botão de atualização e texto de limites), mas a captura permaneceu em `LENDO ESTADOS LOCAIS…` durante a checagem. Portanto, esta tentativa não é evidência de que os dados do diagnóstico tenham sido renderizados.

O navegador Sandbox mostrou a página em execução local, sem comprovar o comportamento de Android, Xiaomi/MIUI/HyperOS ou iPhone. Não usar esse preview para afirmar GPS em background, lifecycle nativo, cobertura offline ou resgate.

## Repetição após correção

Após trocar `navigator.serviceWorker.ready` por `navigator.serviceWorker.getRegistration()`, a rota foi reaberta em `http://localhost:5174/?fresh=20260827-lifecycle-fix#/diagnostico`. O painel saiu de `LENDO ESTADOS LOCAIS…` e mostrou **Ciclo do app — `FOREGROUND · VISIBILITY API`**, além de `GPS em background — DEVICE DEPENDENT · sem garantia contínua`. A captura também mostrou `Service worker — INDISPONÍVEL` e `Tiles em cache — INDISPONÍVEL`, estados coerentes com o ambiente do preview.

A primeira tentativa foi preservada como evidência do bug corrigido; não houve remoção de timeout nem fabricação de capacidade. O navegador Sandbox não comprova o comportamento de Android, Xiaomi/MIUI/HyperOS ou iPhone. A validação física de `@capacitor/app` permanece obrigatória.
