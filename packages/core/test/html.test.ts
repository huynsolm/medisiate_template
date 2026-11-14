import { describe, expect, it } from 'vitest';
import { h, raw, serialize, styleText, text } from '../src/html/h.ts';
import { sanitizeRichText } from '../src/html/rich-text.ts';

describe('h() and serialize()', () => {
  it('escapes text and attribute values', () => {
    expect(serialize(h('p', { title: 'a"<b>&' }, ['<x> & y']))).toBe('<p title="a&quot;&lt;b&gt;&amp;">&lt;x&gt; &amp; y</p>');
  });

  it('keeps attribute order as given', () => {
    expect(serialize(h('img', { decoding: 'async', loading: 'lazy', src: 'a.jpg', alt: '' }))).toBe(
      '<img decoding="async" loading="lazy" src="a.jpg" alt="">',
    );
  });

  it('drops undefined and false attributes, writes true as empty', () => {
    expect(serialize(h('div', { class: undefined, hidden: true, 'data-x': false }))).toBe('<div hidden=""></div>');
  });

  it('serializes style objects in insertion order with a trailing semicolon', () => {
    expect(serialize(h('div', { style: { color: '#fff', '--pc-col': '4', fontSize: '14px' } }))).toBe(
      '<div style="color: #fff; --pc-col: 4; font-size: 14px;"></div>',
    );
    expect(styleText({ a: undefined })).toBe('');
  });

  it('writes non-breaking spaces as &nbsp;', () => {
    expect(serialize(h('div', {}, [' ']))).toBe('<div>&nbsp;</div>');
  });

  it('does not close void elements', () => {
    expect(serialize(h('br', { class: 'br-migration' }))).toBe('<br class="br-migration">');
  });

  it('puts block children on their own lines', () => {
    expect(serialize(h('div', {}, [h('p', {}, ['a']), h('p', {}, ['b'])]))).toBe('<div>\n<p>a</p>\n<p>b</p>\n</div>');
  });

  it('passes raw nodes through untouched', () => {
    expect(serialize(h('p', {}, [raw('a<br>b')]))).toBe('<p>a<br>b</p>');
    expect(serialize(text('x'))).toBe('x');
  });

  it('rejects unsafe attribute names', () => {
    expect(() => serialize(h('div', { 'on"x': 'y' }))).toThrow();
  });
});

describe('sanitizeRichText', () => {
  it('keeps allowed inline tags and br-migration classes', () => {
    expect(sanitizeRichText('a<br class="br-migration is-visible">b <strong>c</strong>')).toBe(
      'a<br class="br-migration is-visible">b <strong>c</strong>',
    );
  });

  it('unwraps disallowed tags but keeps their text', () => {
    expect(sanitizeRichText('<div><a href="x">link</a></div>')).toBe('link');
  });

  it('removes script and style elements completely', () => {
    expect(sanitizeRichText('a<script>alert(1)</script><style>p{}</style>b')).toBe('ab');
  });

  it('drops non-class attributes and event handlers', () => {
    expect(sanitizeRichText('<span class="em" onclick="x" style="color:red;position:fixed">t</span>')).toBe('<span class="em" style="color: red;">t</span>');
  });

  it('drops class tokens with unsafe characters', () => {
    expect(sanitizeRichText('<span class="ok bad&quot;">t</span>')).toBe('<span class="ok">t</span>');
  });

  it('re-escapes text and keeps &nbsp;', () => {
    expect(sanitizeRichText('1 &lt; 2&nbsp;&amp;')).toBe('1 &lt; 2&nbsp;&amp;');
  });
});
