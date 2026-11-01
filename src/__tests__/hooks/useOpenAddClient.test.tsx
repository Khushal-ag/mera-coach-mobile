import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { getClientList } from '../../api/clientApi';
import { getCoachPremiumOffer } from '../../api/coachApi';
import { getDialogQueue, resetDialogsForTests } from '../../components/dialog/dialogStore';
import { FREE_CLIENT_LIMIT } from '../../config/appConfig';
import { useOpenAddClient } from '../../hooks/useOpenAddClient';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));
jest.mock('../../api/clientApi', () => ({ getClientList: jest.fn() }));
jest.mock('../../api/coachApi', () => ({ getCoachPremiumOffer: jest.fn() }));
jest.mock('../../auth/session', () => ({ getCurrentCoachCode: () => 'COACH1' }));

const clients = (n: number) => Array.from({ length: n }, (_, i) => ({ clientCode: `C${i}` }));

type Open = ReturnType<typeof useOpenAddClient>['openAddClient'];

function renderOpener() {
  const ref: { open?: Open } = {};
  function Probe() {
    const { openAddClient } = useOpenAddClient();
    React.useEffect(() => {
      ref.open = openAddClient;
    });
    return null;
  }
  act(() => {
    renderer.create(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { gcTime: 0 } } })}>
        <Probe />
      </QueryClientProvider>,
    );
  });
  return ref;
}

beforeEach(() => {
  jest.clearAllMocks();
  mockNavigate.mockClear();
  resetDialogsForTests();
  delete process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED;
});

describe('Add Client with subscriptions off', () => {
  it('opens the wizard below the client limit', async () => {
    (getClientList as jest.Mock).mockResolvedValue(clients(FREE_CLIENT_LIMIT - 1));
    const ref = renderOpener();
    await act(async () => ref.open?.());
    expect(mockNavigate).toHaveBeenCalledWith('AddClient', undefined);
    expect(getDialogQueue()).toHaveLength(0);
  });

  it('stops at the client limit and says why', async () => {
    (getClientList as jest.Mock).mockResolvedValue(clients(FREE_CLIENT_LIMIT));
    const ref = renderOpener();
    await act(async () => ref.open?.());
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(getDialogQueue()[0].title).toBe('Client limit reached');
  });
});

describe('Add Client with subscriptions on', () => {
  beforeEach(() => {
    process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED = 'true';
  });

  it('opens the wizard for a paid coach, however many clients they have', async () => {
    (getCoachPremiumOffer as jest.Mock).mockResolvedValue({ isPaid: true });
    (getClientList as jest.Mock).mockResolvedValue(clients(FREE_CLIENT_LIMIT + 5));
    const ref = renderOpener();
    await act(async () => ref.open?.());
    expect(mockNavigate).toHaveBeenCalledWith('AddClient', undefined);
    expect(getClientList).not.toHaveBeenCalled();
  });

  it('sends an unpaid coach to the paywall', async () => {
    (getCoachPremiumOffer as jest.Mock).mockResolvedValue({ isPaid: false });
    const ref = renderOpener();
    await act(async () => ref.open?.());
    expect(mockNavigate).toHaveBeenCalledWith('Premium', undefined);
  });
});
