# Resposta a incidentes de segurança

Este procedimento cobre o Vanguard Field web/PWA, o container Capacitor, o repositório e a documentação. Ele não autoriza coleta de localização, acesso a contas ou execução de ações externas sem consentimento.

## 1. Triagem

Classificar o relato como código, dependência, segredo exposto, importação malformada, atualização, privacidade, service worker, mobile ou legado restrito. Remover coordenadas, tokens, e-mails pessoais e dados de dispositivo dos exemplos antes de compartilhar. Confirmar se o problema é reproduzível sem usar uma emergência real ou hardware de terceiros.

## 2. Prioridade

| Nível | Exemplo | Ação |
|---|---|---|
| Crítico | Segredo exposto, upload silencioso de localização, update não autorizado | Conter imediatamente, suspender distribuição afetada e corrigir antes de qualquer release |
| Alto | Corrupção de trilha, XSS, URL de download falsa, falsa confirmação de Socorro | Criar teste de regressão e bloquear publicação |
| Médio | Status confuso, falha de cache, erro de sensor ou acessibilidade | Corrigir com teste e registrar no risco |
| Baixo | Texto, layout ou documentação inconsistente | Corrigir no ciclo normal |

## 3. Fluxo

Preservar o estado mínimo e seguro, abrir uma correção em branch própria, adicionar teste de regressão, revisar o diff, executar os gates e publicar em `main` sem force push. Se houver segredo no histórico, revogar/rotacionar a credencial no provedor; apagar o arquivo atual não é suficiente para remover a exposição histórica.

Uma correção de release deve registrar commit, versão, hashes, impacto, teste físico quando necessário, comunicação ao usuário e decisão de publicação. A tag `v1.0.0` não deve ser criada enquanto incidente crítico ou alto estiver aberto.

## 4. Encerramento

O incidente só pode ser encerrado quando o teste de regressão passar, a documentação de limitação estiver atualizada, o risco tiver responsável e status, e o CI estiver verde. A comunicação pública deve dizer o que foi corrigido sem revelar coordenadas, credenciais ou detalhes que facilitem abuso.
