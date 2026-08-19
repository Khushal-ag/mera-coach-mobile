import type { ComponentType } from 'react';

import type { ClientProfile } from './models';
import type { IoniconName } from './icons';

export type { IoniconName };

export type UpdateFn<F> = (key: keyof F, value: F[keyof F]) => void;

export interface StepProps<F> {
  form: F;
  update: UpdateFn<F>;
}

export interface WizardScreen {
  id: string;
  phaseId?: string;
  title: string;
  subtitle?: string;
  icon: IoniconName;
  Component: ComponentType<StepProps<ClientProfile> & Record<string, unknown>>;
  componentProps?: Record<string, unknown>;
}
