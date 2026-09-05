# Project Vanguard — GPS V3 Recovery Plan

## Objetivo
Substituir a sensação de GPS demonstrativo por navegação realmente operacional, com rastreamento contínuo, rota precisa e distância contabilizada integralmente.

## Problemas confirmados pelo diagnóstico do produto
1. Extração de dados precisa deixar de ser apenas UI/enfeite e produzir dados verificáveis.
2. Rastreamento em segundo plano precisa sobreviver ao ciclo normal da aplicação e registrar pontos enquanto permitido pelo sistema operacional.
3. Planejamento de rota precisa considerar a rede viária real, não apenas uma linha visual entre origem e destino.
4. Posicionamento deve aplicar filtragem, rejeição de outliers e map matching quando houver rede viária disponível.
5. Metragem deve ser calculada a partir da trilha completa, acumulando segmentos válidos e preservando pausas/reconexões sem zerar o percurso.

## Arquitetura alvo
```text
Location Provider
  -> Background Tracking
  -> Location Validation
  -> Outlier Filter
  -> Map Matching
  -> Track Store
  -> Distance Engine
  -> Route Engine
  -> Guidance UI
  -> Export / Extraction
```

## Critérios de qualidade
- Nunca apresentar distância como medida exata quando a qualidade do sinal não sustenta isso.
- Preservar timestamps e precisão de cada ponto.
- Separar distância bruta, distância filtrada e distância projetada/map-matched.
- Recalcular rota quando o desvio ultrapassar o limiar configurado.
- Persistir a trilha incrementalmente para reduzir perda em encerramento inesperado.
- Testar foreground, background, retomada, perda de sinal, sinal ruim e grandes deslocamentos.

## Meta de melhoria
A V3 deve buscar uma melhoria de ordem de grandeza de experiência, com meta inicial de **3x melhor** em confiabilidade percebida, precisão de rota e completude da metragem. O valor 3x é meta de produto, não garantia matemática: deve ser validado por benchmarks reais.

## Ordem de implementação
1. Instrumentar a trilha atual.
2. Corrigir extração de dados.
3. Criar Track Store persistente.
4. Implementar Distance Engine independente da UI.
5. Corrigir background tracking por plataforma.
6. Implementar filtragem de localização.
7. Implementar map matching.
8. Substituir desenho simplificado pelo Route Engine real.
9. Recalcular rota dinamicamente.
10. Criar testes com trilhas gravadas e cenários degradados.
11. Medir antes/depois.

## Não fazer
- Não mascarar falhas com animações.
- Não somar distância visual da linha desenhada no mapa.
- Não declarar background funcional sem teste com aplicativo minimizado/bloqueado conforme plataforma.
- Não tratar um único ponto GPS como posição confiável.
