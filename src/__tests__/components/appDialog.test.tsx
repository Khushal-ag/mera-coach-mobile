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
