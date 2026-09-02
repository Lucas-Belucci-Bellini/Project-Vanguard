import test from 'node:test';
import assert from 'node:assert/strict';
import { RESULTADOS_NAVEGACAO, criarNavegador } from '../src/core/navegacao.js';

function criarContainer() {
  return {
    filhos: [],
    append(...elementos) { this.filhos.push(...elementos); },
  };
}

const esvaziar = (container) => { container.filhos = []; };

/** Página cujo carregamento só termina quando o teste mandar. */
function paginaControlada(nome) {
  let liberar;
  const carregamento = new Promise((resolve) => { liberar = resolve; });
  const registro = { desmontada: 0, criada: 0 };
  const carregar = () => carregamento;
  const fabrica = () => {
    registro.criada += 1;
    return { elemento: { nome }, desmontar: () => { registro.desmontada += 1; } };
  };
  return { carregar, liberar: () => liberar(fabrica), registro, nome };
}

test('uma navegação simples monta a tela no container', async () => {
  const container = criarContainer();
  const navegador = criarNavegador({ container, esvaziar });
  const tela = paginaControlada('inicio');
  const promessa = navegador.navegar({ carregar: tela.carregar });
  tela.liberar();
  assert.equal((await promessa).estado, RESULTADOS_NAVEGACAO.MONTADA);
  assert.deepEqual(container.filhos, [{ nome: 'inicio' }]);
  assert.equal(navegador.temTelaMontada(), true);
});

test('duas navegações em corrida deixam só a última no container', async () => {
  // É o defeito da tela duplicada lado a lado: sem guarda, as duas montavam.
  const container = criarContainer();
  const navegador = criarNavegador({ container, esvaziar });
  const primeira = paginaControlada('bussola');
  const segunda = paginaControlada('inicio');

  const p1 = navegador.navegar({ carregar: primeira.carregar });
  const p2 = navegador.navegar({ carregar: segunda.carregar });
  // A primeira termina de carregar depois da segunda ter começado.
  segunda.liberar();
  primeira.liberar();

  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.estado, RESULTADOS_NAVEGACAO.DESCARTADA);
  assert.equal(r2.estado, RESULTADOS_NAVEGACAO.MONTADA);
  assert.equal(container.filhos.length, 1);
  assert.deepEqual(container.filhos[0], { nome: 'inicio' });
});

test('a navegação descartada nem chega a criar a tela — não há órfã para vazar', async () => {
  // O sintoma invisível: uma tela criada e nunca desmontada mantém GPS,
  // intervalos e listeners vivos até o app fechar.
  const container = criarContainer();
  const navegador = criarNavegador({ container, esvaziar });
  const perdedora = paginaControlada('mapa');
  const vencedora = paginaControlada('inicio');

  const p1 = navegador.navegar({ carregar: perdedora.carregar });
  const p2 = navegador.navegar({ carregar: vencedora.carregar });
  vencedora.liberar();
  perdedora.liberar();
  await Promise.all([p1, p2]);

  assert.equal(perdedora.registro.criada, 0, 'a tela perdedora não deveria ter sido criada');
  assert.equal(perdedora.registro.desmontada, 0);
  assert.equal(vencedora.registro.criada, 1);
});

test('trocar de tela desmonta a anterior antes de montar a nova', async () => {
  const container = criarContainer();
  const navegador = criarNavegador({ container, esvaziar });
  const primeira = paginaControlada('inicio');
  const segunda = paginaControlada('mapa');

  const p1 = navegador.navegar({ carregar: primeira.carregar });
  primeira.liberar();
  await p1;

  const p2 = navegador.navegar({ carregar: segunda.carregar });
  segunda.liberar();
  await p2;

  assert.equal(primeira.registro.desmontada, 1);
  assert.equal(container.filhos.length, 1);
  assert.deepEqual(container.filhos[0], { nome: 'mapa' });
});

test('desmontagem que lança não impede a troca de tela', async () => {
  const container = criarContainer();
  const navegador = criarNavegador({ container, esvaziar });
  const p1 = navegador.navegar({
    carregar: async () => () => ({ elemento: { nome: 'a' }, desmontar: () => { throw new Error('já removida'); } }),
  });
  await p1;
  const resultado = await navegador.navegar({ carregar: async () => () => ({ elemento: { nome: 'b' } }) });
  assert.equal(resultado.estado, RESULTADOS_NAVEGACAO.MONTADA);
  assert.deepEqual(container.filhos, [{ nome: 'b' }]);
});

test('falha ao carregar o módulo é reportada e não monta nada', async () => {
  const container = criarContainer();
  const erros = [];
  const navegador = criarNavegador({ container, esvaziar, aoErro: (erro) => erros.push(erro.message) });
  const resultado = await navegador.navegar({ carregar: async () => { throw new Error('chunk offline'); } });
  assert.equal(resultado.estado, RESULTADOS_NAVEGACAO.FALHOU);
  assert.deepEqual(erros, ['chunk offline']);
  assert.equal(container.filhos.length, 0);
  assert.equal(navegador.temTelaMontada(), false);
});

test('falha de uma navegação já superada não sobrescreve a tela nova', async () => {
  const container = criarContainer();
  const erros = [];
  const navegador = criarNavegador({ container, esvaziar, aoErro: (erro) => erros.push(erro.message) });

  let quebrar;
  const p1 = navegador.navegar({ carregar: () => new Promise((_, reject) => { quebrar = reject; }) });
  const boa = paginaControlada('inicio');
  const p2 = navegador.navegar({ carregar: boa.carregar });
  boa.liberar();
  quebrar(new Error('chunk offline'));

  const [r1, r2] = await Promise.all([p1, p2]);
  assert.equal(r1.estado, RESULTADOS_NAVEGACAO.DESCARTADA);
  assert.equal(r2.estado, RESULTADOS_NAVEGACAO.MONTADA);
  assert.deepEqual(erros, [], 'o erro da navegação superada não deve aparecer na tela nova');
  assert.equal(container.filhos.length, 1);
});

test('desmontar encerra a tela atual e não repete a desmontagem', async () => {
  const container = criarContainer();
  const navegador = criarNavegador({ container, esvaziar });
  const tela = paginaControlada('mapa');
  const promessa = navegador.navegar({ carregar: tela.carregar });
  tela.liberar();
  await promessa;

  navegador.desmontar();
  navegador.desmontar();
  assert.equal(tela.registro.desmontada, 1);
  assert.equal(navegador.temTelaMontada(), false);
});

test('página sem desmontar não quebra a próxima troca', async () => {
  const container = criarContainer();
  const navegador = criarNavegador({ container, esvaziar });
  await navegador.navegar({ carregar: async () => () => ({ elemento: { nome: 'sem-desmontar' } }) });
  assert.equal(navegador.temTelaMontada(), false);
  const resultado = await navegador.navegar({ carregar: async () => () => ({ elemento: { nome: 'b' } }) });
  assert.equal(resultado.estado, RESULTADOS_NAVEGACAO.MONTADA);
});

test('container ou esvaziar ausentes são recusados na criação', () => {
  assert.throws(() => criarNavegador({ esvaziar }), /container/);
  assert.throws(() => criarNavegador({ container: criarContainer() }), /esvazia o container/);
});

test('tela que não devolve `elemento` vira erro visível, não branco silencioso', async () => {
  // O defeito que este teste tranca: `container.append(resultado.elemento)`
  // estava fora do try. Uma página com `return` esquecido, ou um export com
  // nome errado, lançava um TypeError que ninguém pegava — e como `navegar` é
  // chamado sem `await` no `hashchange`, virava rejeição não tratada: tela em
  // branco, SEM o aviso de erro. É o sintoma mais caro de diagnosticar à
  // distância, porque parece "a página não funciona no aplicativo".
  const container = criarContainer();
  const erros = [];
  const navegador = criarNavegador({ container, esvaziar, aoErro: (e) => erros.push(e) });

  const resultado = await navegador.navegar({ carregar: async () => () => undefined });

  assert.equal(resultado.estado, RESULTADOS_NAVEGACAO.FALHOU);
  assert.equal(erros.length, 1, 'a falha precisa chegar ao aoErro');
  assert.match(erros[0].message, /elemento/);
  assert.equal(navegador.temTelaMontada(), false, 'nada pode ficar registrado para desmontagem');
});

test('tela que devolve objeto sem elemento também é recusada', async () => {
  const container = criarContainer();
  const erros = [];
  const navegador = criarNavegador({ container, esvaziar, aoErro: (e) => erros.push(e) });

  const resultado = await navegador.navegar({ carregar: async () => () => ({ desmontar() {} }) });

  assert.equal(resultado.estado, RESULTADOS_NAVEGACAO.FALHOU);
  assert.equal(erros.length, 1);
});

test('falha ao montar não deixa a tela anterior registrada para desmontagem', async () => {
  const container = criarContainer();
  const navegador = criarNavegador({ container, esvaziar, aoErro: () => {} });
  await navegador.navegar({ carregar: async () => () => ({ elemento: { nome: 'boa' }, desmontar() {} }) });
  assert.equal(navegador.temTelaMontada(), true);

  await navegador.navegar({ carregar: async () => () => undefined });
  // A anterior já foi desmontada no início da navegação; a nova falhou. Ficar
  // com o `desmontar` da antiga apontado seria chamá-lo duas vezes.
  assert.equal(navegador.temTelaMontada(), false);
});
