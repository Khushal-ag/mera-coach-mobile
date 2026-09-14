import {
  ApiError,
  API_ERROR_NO_RECORDS,
  extractErrorMessage,
  FRIENDLY_NETWORK,
  FRIENDLY_SERVER_UNREACHABLE,
  getErrorMessage,
  isNoRecordsBody,
  isSqlServerInfraMessage,
  mapToUserFacingMessage,
  toUserMessage,
} from '../../api/clientErrors';

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

describe('NoRecords (errorCode 1) empty success', () => {
  const noRecordsBody = {
    errorObj: [
      {
        errorCode: API_ERROR_NO_RECORDS,
        errorMessage: 'No diet plan has been generated for this client yet.',
      },
    ],
    responseObj: null,
  };

  it('recognizes NoRecords envelopes (HTTP 204 shape)', () => {
    expect(isNoRecordsBody(noRecordsBody)).toBe(true);
    expect(isNoRecordsBody({ errorCode: 1, errorMessage: 'No records found.' })).toBe(true);
    expect(isNoRecordsBody({ errorObj: [{ errorCode: 0, errorMessage: 'Success' }] })).toBe(false);
    expect(
      isNoRecordsBody({
        errorObj: [{ errorCode: 9999, errorMessage: 'Boom' }],
      }),
    ).toBe(false);
  });

  it('does not extract a failure message for NoRecords', () => {
    expect(extractErrorMessage(noRecordsBody, 204)).toBeNull();
    expect(
      extractErrorMessage(
        {
          errorObj: [{ errorCode: 1, errorMessage: 'No records found.' }],
          responseObj: null,
        },
        204,
      ),
    ).toBeNull();
  });

  it('still extracts real business errors (non-1 codes)', () => {
    expect(
      extractErrorMessage(
        {
          errorObj: [{ errorCode: 644, errorMessage: 'ClientCode is required.' }],
          responseObj: null,
        },
        400,
      ),
    ).toBe('ClientCode is required.');
    expect(
      extractErrorMessage(
        {
          errorObj: [{ errorCode: 9999, errorMessage: 'Diet plan generation failed' }],
          responseObj: null,
        },
        422,
      ),
    ).toBe('Diet plan generation failed');
  });
});

describe('SQL Server / network sanitization', () => {
  const namedPipesDump =
    'A network-related or instance-specific error occurred while establishing a connection to SQL Server. The server was not found or was not accessible. Named Pipes Provider, error: 40 - Could not open a connection to SQL Server';

  it('detects SQL Server / Named Pipes infra dumps', () => {
    expect(isSqlServerInfraMessage(namedPipesDump)).toBe(true);
    expect(isSqlServerInfraMessage("Login failed for user 'sa'.")).toBe(true);
    expect(isSqlServerInfraMessage('ClientCode is required.')).toBe(false);
    expect(isSqlServerInfraMessage('Invalid User')).toBe(false);
  });

  it('replaces SQL Server connection dumps with a short human message', () => {
    const err = new ApiError(namedPipesDump, 200, {
      errorObj: [{ errorCode: 500, errorMessage: namedPipesDump }],
      responseObj: null,
    });

    expect(toUserMessage(err)).toBe(FRIENDLY_SERVER_UNREACHABLE);
    expect(getErrorMessage(err, 'fallback')).toBe(FRIENDLY_SERVER_UNREACHABLE);
    expect(mapToUserFacingMessage(namedPipesDump)).toBe(FRIENDLY_SERVER_UNREACHABLE);
  });

  it('maps status -1 and bare timeout strings to a clear network message', () => {
    expect(mapToUserFacingMessage('', -1)).toBe(FRIENDLY_NETWORK);
    expect(mapToUserFacingMessage('timeout', -1)).toBe(FRIENDLY_NETWORK);
    expect(mapToUserFacingMessage('Network request failed')).toBe(FRIENDLY_NETWORK);
    expect(toUserMessage(new ApiError('timeout', -1))).toBe(FRIENDLY_NETWORK);
    expect(mapToUserFacingMessage('Request timed out. Please try again.')).toBe(
      'Request timed out. Please try again.',
    );
  });

  it('does not hide real business validation errors', () => {
    expect(
      toUserMessage(
        new ApiError('x', 200, {
          errorObj: [{ errorCode: 644, errorMessage: 'ClientCode is required.' }],
        }),
      ),
    ).toBe('ClientCode is required.');
    expect(
      toUserMessage(
        new ApiError('x', 200, {
          errorObj: [{ errorCode: 401, errorMessage: 'Invalid User' }],
        }),
      ),
    ).toBe(FRIENDLY_LOGIN);
  });
});
