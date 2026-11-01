import React from 'react';
import renderer from 'react-test-renderer';

import { MAX_FONT_SCALE } from '../../utils/capFontScale';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Text, TextInput } = require('react-native');

// The wrapper passes the cap to the native component, so read it from the innermost element.
function innermostMultiplier(element: React.ReactElement) {
  let root!: renderer.ReactTestRenderer;
  renderer.act(() => {
    root = renderer.create(element);
  });
  const found = root.root.findAll(node => node.props.maxFontSizeMultiplier !== undefined);
  return found[found.length - 1]?.props.maxFontSizeMultiplier;
}

describe('capFontScale', () => {
  it('caps Text growth by default', () => {
    expect(innermostMultiplier(<Text>hello</Text>)).toBe(MAX_FONT_SCALE);
  });

  it('caps TextInput growth by default', () => {
    expect(innermostMultiplier(<TextInput />)).toBe(MAX_FONT_SCALE);
  });

  it('lets a screen choose its own cap', () => {
    expect(innermostMultiplier(<Text maxFontSizeMultiplier={1}>fixed</Text>)).toBe(1);
  });
});
