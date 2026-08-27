import test from 'node:test';
import assert from 'node:assert/strict';
import { h } from '../src/ui/helpers.js';

class FakeElement {
  constructor(tag) {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map();
    this.children = [];
    this.listeners = new Map();
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  addEventListener(name, callback) {
    this.listeners.set(name, callback);
  }

  append(...children) {
    this.children.push(...children);
  }
}

test('helper h serializa os atalhos ARIA para atributos HTML', () => {
  const documentoAnterior = globalThis.document;
  const nodeAnterior = globalThis.Node;
  globalThis.document = {
    createElement: (tag) => new FakeElement(tag),
    createTextNode: (text) => ({ textContent: String(text) }),
  };
  globalThis.Node = FakeElement;

  try {
    const elemento = h('div', {
      ariaLabel: 'Conteúdo principal',
      ariaHidden: 'true',
      ariaCurrent: 'page',
      ariaLive: 'polite',
      ariaBusy: 'false',
    });

    assert.equal(elemento.attributes.get('aria-label'), 'Conteúdo principal');
    assert.equal(elemento.attributes.get('aria-hidden'), 'true');
    assert.equal(elemento.attributes.get('aria-current'), 'page');
    assert.equal(elemento.attributes.get('aria-live'), 'polite');
    assert.equal(elemento.attributes.get('aria-busy'), 'false');
    assert.equal(elemento.attributes.has('ariaLabel'), false);
  } finally {
    if (documentoAnterior === undefined) delete globalThis.document;
    else globalThis.document = documentoAnterior;
    if (nodeAnterior === undefined) delete globalThis.Node;
    else globalThis.Node = nodeAnterior;
  }
});
