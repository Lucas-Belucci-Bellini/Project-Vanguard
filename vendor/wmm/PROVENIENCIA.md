# WMM2025 — de onde vieram estes arquivos

Os três arquivos ao lado são **cópias literais** do pacote oficial de
coeficientes do World Magnetic Model 2025. Nenhum número foi digitado à mão,
convertido ou "arrumado" — é justamente esse o ponto: coeficiente geomagnético
não se lembra de cabeça.

## Origem

| item | valor |
|---|---|
| pacote | `WMM2025COF.zip` |
| URL | <https://www.ncei.noaa.gov/sites/default/files/2025-01/WMM2025COF.zip> |
| baixado em | 2026-09-03 |
| SHA-256 do zip | `999080a12c95122c2031aeac8be77229d97584530e87e0f1a6df7d946ecf90c5` |

| arquivo | SHA-256 |
|---|---|
| `WMM.COF` | `06791cd95faba7bdf4a709808f2715a53fe689b29c23b9886bc2196fa9b3eb13` |
| `WMM2025_TEST_VALUES.txt` | `ae289c94e2200e4deeae2dfdedf543a8a0e93096512b30d6a754199731f570d0` |
| `README-WMM-COEFS.txt` | `0c965b3a95b3d7324f628ff0a240dc8988ad4bf77ace016f226a760041fc764e` |

O próprio `README-WMM-COEFS.txt` diz como conferir que o arquivo é o certo: a
primeira linha do `WMM.COF` tem de ser exatamente

```
    2025.0            WMM-2025        11/13/2024
```

E é. `test/wmm.test.js` cobra esse cabeçalho a cada execução, para que uma troca
silenciosa de arquivo não passe.

## Licença e redistribuição — confirmadas antes de embarcar

A página oficial do modelo (<https://www.ncei.noaa.gov/products/world-magnetic-model>)
declara, textualmente:

> The WMM source code is in the public domain and not licensed or under
> copyright. The information and software may be used freely by the public.
> As required by 17 U.S.C. 403, third parties producing copyrighted works
> consisting predominantly of the material produced by U.S. government agencies
> must provide notice with such work(s) identifying the U.S. Government material
> incorporated and stating that such material is not subject to copyright
> protection.

**Aviso exigido por 17 U.S.C. 403:** este repositório incorpora o World Magnetic
Model 2025, material produzido por agências do Governo dos Estados Unidos
(NOAA/NCEI) em conjunto com o British Geological Survey. Esse material **não
está sujeito a proteção por direito autoral**.

## Citação

**Valores do modelo:** NOAA NCEI Geomagnetic Modeling Team; British Geological
Survey. 2024: World Magnetic Model 2025. NOAA National Centers for Environmental
Information. <https://doi.org/10.25921/aqfd-sd83>. Acessado em 2026-09-03.

**Relatório técnico:** Chulliat, A., W. Brown, M. Nair, N. Gomez Perez,
L.-Y. Young, C. Watson, N. Boneh, C. Beggan, B. Meyer e M. Paniccia, 2025.
*The US/UK World Magnetic Model for 2025-2030: Technical Report*, National
Centers for Environmental Information, NOAA. <https://doi.org/10.25923/prbc-s316>

## Validade

O WMM2025 vale de **2025,0 a 2030,0**. Fora dessa janela o modelo não é
extrapolado por este repositório — `src/engine/wmm.js` recusa e diz por quê, em
vez de devolver um número que ninguém pode defender.

## Como atualizar (WMM2030, ou uma revisão fora de época)

1. Baixe o pacote novo da página oficial e substitua os três arquivos aqui.
2. Atualize as URLs, as datas e os SHA-256 desta página.
3. Rode `node scripts/gerar-wmm.mjs` para regerar `src/data/wmm2025.js`.
4. Rode `npm test`. Os valores de teste oficiais vêm no mesmo pacote e são a
   prova: se a geração ou o modelo estiverem errados, o teste falha.
