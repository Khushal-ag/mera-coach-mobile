import React from 'react';
import renderer, { act } from 'react-test-renderer';

import { getDialogQueue, resetDialogsForTests } from '../../components/dialog/dialogStore';
import { useUnsavedChangesGuard } from '../../hooks/useUnsavedChangesGuard';

let beforeRemove: (e: unknown) => void = () => undefined;
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    dispatch: jest.fn(),
    addListener: (_: string, cb: (e: unknown) => void) => {
      beforeRemove = cb;
      return () => undefined;
    },
  }),
}));

type LeaveSaved = ReturnType<typeof useUnsavedChangesGuard>;
function Probe({ dirty, onReady }: { dirty: boolean; onReady?: (fn: LeaveSaved) => void }) {
  const leaveSaved = useUnsavedChangesGuard(dirty);
  React.useEffect(() => onReady?.(leaveSaved));
  return null;
}
const leaving = () => ({ preventDefault: jest.fn(), data: { action: { type: 'GO_BACK' } } });

beforeEach(() => resetDialogsForTests());

describe('useUnsavedChangesGuard', () => {
  it('lets a clean screen go', () => {
    act(() => void renderer.create(<Probe dirty={false} />));
    const e = leaving();
    beforeRemove(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
    expect(getDialogQueue()).toHaveLength(0);
  });

  it('stops a dirty screen and asks first', () => {
    act(() => void renderer.create(<Probe dirty />));
    const e = leaving();
    beforeRemove(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(getDialogQueue()[0].title).toBe('Leave without saving?');
  });

  it('does not ask again once the changes are saved', () => {
    let leaveSaved!: LeaveSaved;
    act(() => void renderer.create(<Probe dirty onReady={fn => (leaveSaved = fn)} />));
    const leave = jest.fn();
    leaveSaved(leave)();
    const e = leaving();
    beforeRemove(e);
    expect(leave).toHaveBeenCalled();
    expect(e.preventDefault).not.toHaveBeenCalled();
  });
});
