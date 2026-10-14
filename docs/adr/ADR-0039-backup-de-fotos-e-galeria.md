# ADR-0039 — backup das fotos: galeria do aparelho e pacote de caminhada

- **Status:** Aceita
- **Data:** 2026-08-31
- **Escopo:** onde as fotos de parada ficam e como saem do aparelho

## Contexto

O teste de campo mostrou duas lacunas na foto de parada (ADR-0037). A pessoa
não conseguia **ver** a foto depois de tirar, e a imagem existia só dentro do
aplicativo: desinstalar levava tudo junto. Numa peregrinação isso é perda de
registro que não se repete.

O pedido incluía enviar as fotos para o GitHub. Três fatos pesam contra fazer
isso de dentro do app:

1. Um token dentro do APK é extraível por quem tiver o arquivo.
2. Em repositório público, as fotos e o traçado da caminhada ficam públicos.
3. O ADR-0034 já havia decidido: **GitHub não é banco de dados de trajetos
   pessoais.**

## Decisão

### Ver as fotos no app

Visor que abre sozinho com a foto recém-guardada e também por toque na lista,
com anterior/próxima, MGRS, precisão, horário e remoção confirmada. Carrega uma
imagem por vez e revoga a URL anterior: carregar uma peregrinação inteira de uma
vez encheria a memória do aparelho, e URL de objeto não revogada prende os bytes
até a página morrer.

### Salvar na galeria do celular

Dentro do APK a captura passa pelo `@capacitor/camera` com `saveToGallery`. O
plugin devolve `saved`, dizendo se a gravação aconteceu, e **esse valor é
repassado como veio**: a tela só afirma que salvou na galeria quando o sistema
confirmou.

O caminho nativo nunca é o único. Plugin ausente, plataforma web ou falha na
chamada caem no `<input type="file" capture>` de sempre — perder a foto porque
um plugin faltou seria inaceitável em campo. Cancelar é tratado à parte de
falhar, para o app não reabrir a câmera quando a pessoa desistiu.

As permissões de armazenamento entram com `maxSdkVersion` (32 e 29), porque em
Android novo a gravação na galeria passa pelo MediaStore e não precisa delas.

### Backup: pacote, não upload

Em vez de o app enviar para o GitHub, ele **monta o pacote e entrega ao menu de
compartilhar do sistema**. A pessoa escolhe o destino — nuvem, e-mail, cabo,
GitHub pela web se quiser. O aplicativo não guarda token, não tem conta e não
envia nada sozinho.

| Arquivo | Para quê |
|---|---|
| `fotos/…` | as imagens |
| `paradas.csv` | uma linha por foto: MGRS, lat/lon, precisão, dentro do limite |
| `registro.json` | backup versionado, reimportável no app |
| `trilha.gpx` | a trilha em formato que outros programas abrem |
| `LEIA-ME.txt` | o que é cada arquivo e o que a precisão significa |

O empacotador ZIP (`src/engine/zip.js`) é próprio e sem dependência, com método
`stored`: JPEG já vem comprimido, então comprimir de novo gastaria CPU e bateria
em campo sem ganho. Foto cujos bytes não puderem ser lidos fica de fora
**listada** no LEIA-ME e reportada na tela, nunca sumindo em silêncio.

## Limites

A coordenada continua **fora** do EXIF do JPEG (ADR-0037). Ela vive no
`paradas.csv` e no `registro.json`; separar a foto desses arquivos é separar a
imagem do lugar onde ela foi tirada, e o LEIA-ME diz isso em voz alta.

`saveToGallery` depende do sistema e do fabricante. `saved: false` é um
resultado possível e legítimo — a foto continua no app e o texto na tela diz que
a galeria não recebeu.

O pacote é montado inteiro em memória antes de virar arquivo. Para uma
peregrinação de poucos dias isso cabe; para centenas de fotos grandes vai
apertar, e a saída seria montar em partes — não feito agora.

O ZIP não usa ZIP64: cada arquivo e o pacote precisam caber em 4 GiB. Acima
disso o código recusa em vez de gerar pacote quebrado.

## Evidência

`test/zip.test.js` (10 casos) ancora o CRC-32 em `zlib.crc32` do Node —
implementação independente — e confere assinaturas, deslocamentos do diretório
central, bit de UTF-8, data DOS e recusa de nome com `..`.
`test/pacote-peregrinacao.test.js` (8) cobre o conteúdo do pacote, a coordenada
no CSV e no GPX, a foto ausente reportada e o CSV com vírgula e aspas.
`test/camera.test.js` (8) cobre captura, cancelamento, falha, plugin ausente e
o repasse honesto de `saved`.

Verificação fora dos testes: um pacote real com duas fotos passou no `unzip -t`
com "No errors detected", e os bytes binários saíram idênticos.
