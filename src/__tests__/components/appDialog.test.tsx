import React from 'react';
import renderer, { act } from 'react-test-renderer';

import AppDialogHost from '../../components/dialog/AppDialogHost';
import { getDialogQueue, resetDialogsForTests } from '../../components/dialog/dialogStore';
import { appAlert, showError, showSuccess } from '../../utils/appDialog';

beforeEach(() => {
  resetDialogsForTests();
});

describe('dialog queue', () => {
  it('shows a lone OK button when none are given', () => {
    appAlert('Heads up', 'Something happened');
    const [dialog] = getDialogQueue();
    expect(dialog.buttons).toEqual([{ text: 'OK' }]);
    expect(dialog.tone).toBe('info');
    expect(dialog.cancelable).toBe(false);
  });

  it('treats a destructive button as danger and a cancel button as dismissible', () => {
    appAlert('Remove post', 'Sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive' },
    ]);
    const [dialog] = getDialogQueue();
    expect(dialog.tone).toBe('danger');
    expect(dialog.cancelable).toBe(true);
  });

  it('keeps a success dialog with an OK action from being dismissed past its action', () => {
    showSuccess('Saved', 'Done', jest.fn());
    const [dialog] = getDialogQueue();
    expect(dialog.tone).toBe('success');
    expect(dialog.cancelable).toBe(false);
  });

  it('queues dialogs in the order they were raised', () => {
    showError('First');
    appAlert('Second');
    expect(getDialogQueue().map(d => d.title)).toEqual(['First', 'Second']);
  });
});

describe('AppDialogHost', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  // Text from the dialog's own Text elements (host components render with the string type 'Text').
  const texts = (root: renderer.ReactTestRenderer) =>
    root.root.findAll(n => (n.type as unknown) === 'Text').map(n => n.children.join(''));

  it('draws the dialog and runs a button action only after it has closed', () => {
    const onOk = jest.fn();
    let root!: renderer.ReactTestRenderer;
    act(() => {
      root = renderer.create(<AppDialogHost />);
    });
    act(() => {
      showSuccess('Profile Updated', 'Your changes have been saved.', onOk);
    });
    expect(texts(root)).toEqual(
      expect.arrayContaining(['Profile Updated', 'Your changes have been saved.', 'OK']),
    );

    const ok = root.root.findAllByProps({ accessibilityLabel: 'OK' })[0];
    act(() => {
      ok.props.onPress();
    });
    expect(onOk).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(getDialogQueue()).toHaveLength(0);
  });
});
