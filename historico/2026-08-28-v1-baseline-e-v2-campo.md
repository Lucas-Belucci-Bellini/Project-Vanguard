# 2026-08-28 — V1 como baseline real e V2 como experimento de campo

## Decisão

A estratégia do projeto foi ajustada: a V1.0.0 será a baseline para testes com dados reais. A V2 será construída posteriormente durante a fase de campo/peregrinação para avaliar o comportamento de atualizações quando uma rota já tiver sido iniciada.

## Não fazer

- não criar `0.7.0` apenas para testes;
- não chamar a V2 de release final antes dos testes;
- não sobrescrever uma tag existente;
- não considerar atualização bem-sucedida sem verificar os dados da rota antes e depois;
- não apagar dados do usuário durante instalação/atualização.

## Próxima fase

1. fechar os critérios técnicos restantes da V1;
2. preparar build instalável da V1;
3. instalar a mesma baseline no aparelho de campo;
4. coletar dados reais de GPS/trilhas;
5. registrar evidências e problemas;
6. iniciar o desenvolvimento da V2;
7. executar atualizações controladas durante uma rota já iniciada;
8. comparar persistência e continuidade antes/depois da atualização.

## Observação

A tag `v1.0.0` continua condicionada ao checklist de validação mobile. O número de versão do package.json já é `1.0.0`, mas isso não é, sozinho, evidência de que a release física esteja aprovada.
