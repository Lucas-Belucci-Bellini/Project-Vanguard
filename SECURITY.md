# Segurança do Project Vanguard

## Escopo

O produto atual é o Vanguard Field civil, offline-first e voltado a navegação, sobrevivência e proteção civil. O repositório também preserva, em contexto separado, módulos que nasceram como uma wiki de Arma 3 para testes de mecânicas e referência dentro do videogame. Esse material é `LEGACY-RESTRICTED`: não faz parte do produto civil, não deve receber novas capacidades e nunca foi criado para ambientes, equipamentos, treinamento ou operações reais.

## Separação do legado de videogame

A wiki de Arma 3 e seus módulos balísticos foram concebidos separadamente do Vanguard Field para experimentação em ambiente virtual e testes de software relacionados ao jogo. Seus nomes, fórmulas, dados e telas não constituem manual, tabela oficial, solução de tiro ou orientação para armas reais. Não devem ser adaptados, exportados ou interpretados para uso no mundo real.

O Vanguard Field não usa esses módulos no fluxo civil de GPS, MGRS, mapas, trilhas, sobrevivência, diagnóstico ou Socorro. Qualquer solicitação de expansão balística, controle de tiro, armamento ou integração operacional permanece fora do escopo e deve ser recusada como `LEGACY-RESTRICTED`.

## Registro histórico da contingência cartográfica

Quando os mapas/terrenos do jogo ainda não estavam disponíveis, o fluxo de construção do Claude Code colocou provisoriamente uma API de imagens de satélite do mundo real na camada de mapa. Isso fez o simulador mostrar o mundo real como se fosse um mapa comum. Essa foi uma contingência técnica tomada pelo processo de construção, não uma solicitação do usuário e não uma decisão válida para a wiki de Arma 3.

A camada de mapa real pode existir no Vanguard Field civil, quando configurada e atribuída, para navegação no mundo físico. Ela não é mapa, terreno ou cenário do Arma 3. Os terrenos virtuais do jogo devem permanecer no banco e no contexto próprios da wiki de Arma 3; nunca se deve apresentar uma API de satélite real como substituto silencioso desses terrenos. A distinção completa está em [`docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md`](docs/ESCOPO-WIKI-ARMA3-E-MAPAS.md).

## Princípios

A localização e as trilhas permanecem locais por padrão. Compartilhamento exige ação explícita. GPS/GNSS posiciona, mas não transmite. A aplicação não deve afirmar envio, entrega ou resgate sem confirmação de um sistema externo real.

Arquivos JSON e GPX são entrada não confiável: validar tipos, coordenadas, tamanho, XML e versão antes de alterar estado. Nunca executar conteúdo importado. URLs de tiles, releases e integrações devem ser HTTPS e permitidas por origem; não baixar ou instalar APK silenciosamente.

Segredos, keystores, tokens, credenciais de pagamento e chaves privadas não podem entrar no Git, no bundle web, em notas ou em artifacts. Doações, mensageria satelital, rádio, beacon, Geiger, sonar, fontes oficiais sincronizadas e Supabase permanecem não configurados até existir integração real e autorização.

## Verificações antes de publicar

| Verificação | Critério |
|---|---|
| Dependências | Instalar por lockfile e revisar mudanças; não adicionar pacote sem necessidade |
| Código | Executar testes, build, sintaxe do service worker e revisão de diff |
| Dados | Testar JSON/GPX malformado, corrupção, URLs abusivas e XSS |
| PWA | Confirmar cache, origem HTTPS e atualização com consentimento |
| Mobile | Testar permissões, lifecycle, bateria e instalação em aparelhos reais |
| Release | Assinar artefatos fora do repositório, verificar hashes e tag antes de publicar |
| Privacidade | Confirmar ausência de upload oculto, analytics não autorizada ou histórico remoto |

## Reporte

Para um possível problema de segurança, não publique detalhes sensíveis em issue pública. Preserve o mínimo de evidência necessária, remova dados de localização e credenciais, e comunique os responsáveis pelo canal privado definido pelos mantenedores. Não inclua coordenadas reais de pessoas em logs ou exemplos.

## Uso em campo

Nenhum recurso de segurança do software substitui comunicação independente, equipe, orientação local, atendimento médico, Defesa Civil, autoridade marítima ou equipamento certificado. Uma falha de rede, bateria, sensor, mapa ou permissão deve aparecer como indisponibilidade, nunca como sucesso.
