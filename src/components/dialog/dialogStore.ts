import type { IoniconName } from '../../types/icons';

export type DialogTone = 'success' | 'error' | 'warning' | 'danger' | 'info';

export interface DialogButton {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  icon?: IoniconName;
  onPress?: () => void;
}

export interface DialogOptions {
  /** Picks the icon and accent colour. Defaults to `danger` when a button is destructive, else `info`. */
  tone?: DialogTone;
  /** Overrides the icon the tone would pick. */
  icon?: IoniconName;
  /** Tapping outside or the Android back button closes the dialog. Defaults to true only with a cancel button. */
  cancelable?: boolean;
  /** Runs when the dialog is closed without choosing a button. */
  onDismiss?: () => void;
}

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  buttons: DialogButton[];
  tone: DialogTone;
  icon?: IoniconName;
  cancelable: boolean;
  onDismiss?: () => void;
}

// Module-level so plain utilities (pickers, share helpers) can raise a dialog without a hook or context.
let queue: DialogRequest[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(listener => listener());
}

export function enqueueDialog(
  title: string,
  message: string | undefined,
  buttons: DialogButton[] | undefined,
  options: DialogOptions = {},
) {
  const list = buttons?.length ? buttons : [{ text: 'OK' }];
  const hasCancel = list.some(b => b.style === 'cancel');
  const hasDestructive = list.some(b => b.style === 'destructive');
  queue = [
    ...queue,
    {
      id: nextId++,
      title,
      message,
      buttons: list,
      tone: options.tone ?? (hasDestructive ? 'danger' : 'info'),
      icon: options.icon,
      cancelable: options.cancelable ?? hasCancel,
      onDismiss: options.onDismiss,
    },
  ];
  emit();
}

/** Drops the dialog on screen so the next queued one, if any, takes its place. */
export function shiftDialog() {
  queue = queue.slice(1);
  emit();
}

export function getDialogQueue() {
  return queue;
}

export function subscribeDialogs(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function resetDialogsForTests() {
  queue = [];
  nextId = 1;
  listeners.clear();
}
