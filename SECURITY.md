# Segurança do Project Vanguard

## Escopo

O produto atual é o Vanguard Field civil. O repositório preserva módulos balísticos antigos apenas para compatibilidade histórica e testes; eles são `LEGACY-RESTRICTED` e não devem receber novas capacidades operacionais.

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
