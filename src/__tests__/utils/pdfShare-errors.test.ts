import {
  friendlyPdfError,
  isPdfHostUnavailableError,
  PDF_HOST_UNAVAILABLE_MESSAGE,
} from '../../utils/pdfShare';

describe('PDF host errors', () => {
  it('detects API soft-fail message', () => {
    expect(
      isPdfHostUnavailableError(
        'PDF export is not available on this host. Open the HTML report and use Print instead.',
      ),
    ).toBe(true);
  });

  it('maps to coach-friendly info copy', () => {
    expect(
      friendlyPdfError(
        'PDF export is not available on this host. Open the HTML report and use Print instead.',
      ),
    ).toEqual({ tone: 'info', text: PDF_HOST_UNAVAILABLE_MESSAGE });
  });
});
