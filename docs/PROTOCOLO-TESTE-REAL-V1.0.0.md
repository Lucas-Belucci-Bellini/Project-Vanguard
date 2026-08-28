# Vanguard Field — Protocolo de teste real da V1.0.0

## Finalidade

Este protocolo transforma a `v1.0.0` em uma baseline de campo observável. A V1 deve ser testada com dados reais antes de a V2 começar a alterar o comportamento do aplicativo.

A V2 será desenvolvida durante a peregrinação para testar atualizações quando uma rota já estiver em andamento.

## Regra de versão

- `package.json`: `1.0.0`.
- `v1.0.0-rc.2`: última release pública conhecida.
- `v1.0.0`: somente após aceite físico.
- Não criar `0.7.0` para substituir a baseline.
- Não criar `v2.0.0` antes do experimento de campo.

## Sessão de baseline

Registrar antes de iniciar:

| Campo | Registro |
|---|---|
| Data/hora | preencher no aparelho |
| Aparelho | modelo |
| Sistema | Android/iOS + versão |
| Versão Vanguard | versão instalada |
| Conectividade | online/offline |
| Bateria inicial | percentual |
| Rota/ensaio | identificador não sensível |

## Ensaio A — persistência da trilha

1. Iniciar uma rota.
2. Obter e gravar pontos GPS reais.
3. Pausar e retomar conforme o fluxo normal.
4. Fechar o aplicativo.
5. Reabrir.
6. Conferir se a rota e os pontos anteriores continuam presentes.
7. Exportar o resultado.

Registrar: quantidade aproximada de pontos antes/depois, horários, falhas observadas e integridade do arquivo exportado.

## Ensaio B — foreground/background

1. Iniciar rota.
2. Registrar o estado indicado pelo diagnóstico.
3. Minimizar o aplicativo com a rota ativa.
4. Observar o comportamento do GPS e da gravação.
5. Retornar ao aplicativo.
6. Registrar qualquer lacuna.

Não interpretar o estado `BACKGROUND` como prova de execução contínua.

## Ensaio C — offline real

1. Preparar previamente os recursos que o aplicativo realmente disponibiliza offline.
2. Ativar Modo Avião e desligar Wi-Fi quando aplicável.
3. Fechar completamente o aplicativo.
4. Reabrir.
5. Verificar shell, dados locais e recursos offline.
6. Registrar qualquer tentativa de rede ou falha.

## Ensaio D — atualização durante rota (preparação para V2)

Este ensaio **não deve ser executado como atualização destrutiva na V1**. Na V1, registrar apenas a capacidade de detectar uma atualização e confirmar o fluxo.

Na fase V2, o experimento será:

```text
V1.0.0
  ↓
iniciar rota real
  ↓
gravação de pontos
  ↓
medir estado N
  ↓
disponibilizar V2
  ↓
confirmar atualização
  ↓
reinício
  ↓
medir estado N+1
```

O sucesso exige preservar a rota iniciada antes da atualização e demonstrar isso por evidência, não por suposição.

## Ensaio E — bateria

Registrar bateria inicial e final, duração aproximada e condições de uso. Repetir em condições comparáveis quando possível.

## Evidências

Para cada ensaio guardar somente dados necessários ao diagnóstico: versão, horários, contagens, estados, logs e arquivos de teste. Não incluir dados pessoais desnecessários.

## Critério de bloqueio

Falha em ciclo de vida, offline real, idade do fix ou atualização confirmada mantém a V1 como RC e impede a tag final `v1.0.0`, conforme o checklist mobile.

## Resultado

O protocolo não substitui o teste em hardware. Antes da execução física, nenhum item deve ser marcado como aprovado apenas por testes automatizados ou emulador.
