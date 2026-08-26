import { ApiError, getErrorMessage, toUserMessage } from '../../api/clientErrors';

const FRIENDLY_LOGIN = 'Invalid email or password. Please try again.';

describe('API business error envelope', () => {
  it('maps Invalid User from errorObj[0] (HTTP 200 body) to friendly login copy', () => {
    const err = new ApiError('Invalid User', 200, {
      errorObj: [{ errorCode: 401, errorMessage: 'Invalid User' }],
      responseObj: null,
    });

    expect(toUserMessage(err)).toBe(FRIENDLY_LOGIN);
    expect(getErrorMessage(err, 'fallback')).toBe(FRIENDLY_LOGIN);
  });

  it('still maps when ApiError.message is a raw JSON dump but body has errorObj', () => {
    const body = {
      errorObj: [{ errorCode: 401, errorMessage: 'Invalid User' }],
      responseObj: null,
    };
    const err = new ApiError(JSON.stringify(body), 200, body);

    expect(toUserMessage(err)).toBe(FRIENDLY_LOGIN);
  });

  it('supports a flat top-level {errorCode, errorMessage}', () => {
    const err = new ApiError('Invalid User', 200, {
      errorCode: 401,
      errorMessage: 'Invalid User',
      responseObj: null,
    });

    expect(toUserMessage(err)).toBe(FRIENDLY_LOGIN);
  });

  it('joins multiple errorObj messages', () => {
    const err = new ApiError('x', 200, {
      errorObj: [
        { errorCode: 400, errorMessage: 'First problem' },
        { errorCode: 400, errorMessage: 'Second problem' },
      ],
      responseObj: null,
    });

    expect(toUserMessage(err)).toBe('First problem. Second problem');
  });

  it('treats a lone errorObj object (non-array) as an error entry', () => {
    const err = new ApiError('x', 200, {
      errorObj: { errorCode: 401, errorMessage: 'Invalid User' } as never,
      responseObj: null,
    });

    expect(toUserMessage(err)).toBe(FRIENDLY_LOGIN);
  });
});
