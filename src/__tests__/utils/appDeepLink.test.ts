import { urlSignalsPaidReturn } from '../../utils/appDeepLink';

describe('urlSignalsPaidReturn', () => {
  it('detects paid=1 on the premium deep link', () => {
    expect(urlSignalsPaidReturn('meracoach://premium?paid=1')).toBe(true);
  });

  it('ignores other query values and bare scheme opens', () => {
    expect(urlSignalsPaidReturn('meracoach://premium')).toBe(false);
    expect(urlSignalsPaidReturn('meracoach://premium?paid=0')).toBe(false);
    expect(urlSignalsPaidReturn('meracoach://')).toBe(false);
    expect(urlSignalsPaidReturn(null)).toBe(false);
  });
});
