# ADR-0046 — declinação magnética por modelo: o terceiro caminho, e por que ele se chama PREVISTO

- **Status:** Aceita
- **Data:** 2026-09-03
- **Escopo:** `src/engine/wmm.js`, `src/data/wmm2025.js`, `vendor/wmm/`, `scripts/gerar-wmm.mjs`, `src/core/bussola-leitura.js`, `src/pages/bussola.js`, `src/pages/diagnostico.js`
- **Relacionada:** [ADR-0040](ADR-0040-bussola-tres-nortes-e-sol.md) (os três nortes e a calibração pelo Sol)

## Contexto

O ADR-0040 fechou uma decisão que continua valendo: a leitura crua do
magnetômetro **não é azimute**. A referência dela depende do fabricante — em
alguns aparelhos é norte magnético, em outros o sistema já corrige para
verdadeiro — e o mapa trabalha em norte de grade, que é um terceiro norte.
Por isso a leitura só vira azimute verdadeiro depois de existir uma **correção**,
e sem ela os campos ficam `null` com o motivo dito.

Restaram dois caminhos até essa correção, e os dois têm o mesmo buraco:

1. **Calibrar pelo Sol** exige Sol. À noite, sob nuvem, ou com o Sol a pino, não
   há referência.
2. **Informar a declinação** exige saber a declinação. Quem não sabe deixa o
   campo vazio — e `Number('')` é `0`, que passa em `isFinite`: o campo vazio
   chegou a aplicar "declinação medida de 0°" e a tela exibia CORRIGIDO sem
   ninguém ter medido nada. Isso já foi corrigido, mas o buraco permaneceu:
   sem Sol e sem saber, o operador fica sem azimute verdadeiro.

O roadmap (`docs/MEGA-PLANO.md`, Fase 2 · Sprint 2.1) já previa a saída:
*"Declinação magnética por modelo WMM embarcado (hoje é entrada manual)"*.

## Decisão

Embarcar o **World Magnetic Model 2025** como terceiro caminho, com três regras
que valem mais que o recurso em si.

### 1. Nenhum coeficiente é digitado

São 90 linhas de quatro números. Um dígito trocado não quebra nada visível — só
move o norte magnético alguns graus, no lugar errado do planeta, sem aviso.

- `vendor/wmm/WMM.COF` é **cópia literal** do arquivo oficial, com SHA-256 e
  proveniência em `vendor/wmm/PROVENIENCIA.md`.
- `scripts/gerar-wmm.mjs` é a **única** ponte até `src/data/wmm2025.js`.
- O teste confere o SHA-256 do arquivo, o cabeçalho que o próprio README oficial
  manda verificar, e a tabela gerada contra o arquivo, coeficiente por
  coeficiente — incluindo o zero **negativo**, que `String(-0)` achataria.

### 2. A prova são os valores publicados, lidos do arquivo

`test/wmm.test.js` não tem número de referência escrito dentro dele: lê
`vendor/wmm/WMM2025_TEST_VALUES.txt`, que veio no mesmo pacote dos
coeficientes, e confere **os 12 pontos oficiais nos 19 campos** (X, Y, Z, H, F,
inclinação, declinação, variação de grade e as dez variações anuais).

O arquivo publica nT com uma casa e graus com duas, então a tolerância é meia
unidade da última casa impressa. **Medido:** o pior desvio ficou em **0,050 nT**
e **0,0050°** — dentro do arredondamento em todos os campos.

Copiar 12 linhas de 19 números para dentro do teste seria o jeito de o teste
passar a concordar com o erro em vez de pegá-lo.

### 3. Previsão não se passa por medida

Esta é a parte que não é sobre matemática.

O WMM prevê o campo da **Terra**. Ele não vê o ímã do alto-falante, a lataria do
carro, o erro de fábrica do magnetômetro, nem o fato de alguns aparelhos já
entregarem norte verdadeiro. A correção do Sol mede a declinação do lugar **e**
o erro do próprio aparelho de uma vez; a do modelo mede só a primeira metade,
e supõe a segunda.

Então:

| | correção do Sol / informada | correção do modelo |
|---|---|---|
| referência | `CORRIGIDA` | **`PREVISTA`** |
| na tela | `CORRIGIDO` | **`PREVISTO`** |
| linha de correção | "medida contra o Sol" | "prevista pelo WMM-2025" |
| precedência | **ganha sempre** | só quando não há medida |
| aviso | — | diz a hipótese: *supondo que este aparelho entregue norte magnético* |

E é **opt-in** (`usarModeloMagnetico`): sem pedir, o comportamento do ADR-0040
continua idêntico — os 14 testes que já existiam passaram sem alteração.

O modelo é consultado de qualquer forma quando há posição, e vai no campo
`modeloMagnetico`. Saber a declinação do lugar é informação de campo por si só,
e é ela que permite desconfiar de uma calibração que saiu torta.

### 4. Fora da validade, recusa

O WMM2025 vale de **2025,0 a 2030,0**. Fora da janela o motor devolve
`FORA_DE_VALIDADE` com a explicação — não extrapola. Cinco anos de variação
secular projetados às cegas chegam a graus de erro, e número errado com cara de
certo é pior que número nenhum.

E porque uma recusa futura seria silenciosa, **o Diagnóstico avisa antes**: o
grupo `MODELO MAGNÉTICO` mostra o modelo e a validade, e passa a ATENÇÃO quando
falta menos de um ano.

### 5. A escolha é guardada como escolha, não como número

Ligar o modelo grava `usarModeloMagnetico: true`, não a declinação do momento.
Congelar o valor faria a correção envelhecer em silêncio enquanto o operador
caminha — a mesma armadilha da versão de app escrita à mão.

## Consequências

- A bússola passa a dar azimute verdadeiro e de grade **à noite e sob nuvem**,
  sem rede, sem o operador saber a declinação da região.
- O pacote cresce ~5,9 kB (2,9 kB comprimido) num chunk próprio, carregado só
  por `#/bussola` e `#/diagnostico`.
- Fica uma dívida com data: **em 2030 os coeficientes precisam ser trocados.**
  O passo a passo está em `vendor/wmm/PROVENIENCIA.md` e o Diagnóstico cobra.

## Licença

O WMM é domínio público — a página oficial declara que *"the WMM source code is
in the public domain and not licensed or under copyright"*. O aviso exigido por
17 U.S.C. 403 e as citações do modelo e do relatório técnico acompanham os dados
em `vendor/wmm/PROVENIENCIA.md` e no cabeçalho do arquivo gerado.

## O que este ADR não decide

- **Não** troca a calibração pelo Sol: ela continua sendo a referência boa, e
  ganha do modelo sempre que existir.
- **Não** corrige o erro do magnetômetro deste aparelho. Nenhum modelo global
  consegue; só medida contra referência externa.
- **Não** usa o modelo em nenhuma outra tela. Tiro continua em azimute de grade
  pela convergência de meridianos, como o ADR-0040 e o motor já fazem.
