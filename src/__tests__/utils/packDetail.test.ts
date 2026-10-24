import { splitPackDetail } from '../../utils/packDetail';

describe('splitPackDetail', () => {
  it.each([
    ['Afresh Energy Drink Mix - Elaichi-50 gms', 'Afresh Energy Drink Mix - Elaichi', '50 gms'],
    ['Personalized Protein Powder - 400 gms', 'Personalized Protein Powder', '400 gms'],
    [
      'Formula 1- Nutritional Shake Mix - Banana Caramel -500 Gms',
      'Formula 1- Nutritional Shake Mix - Banana Caramel',
      '500 Gms',
    ],
    ['Cell-U-Loss (60 caps)', 'Cell-U-Loss', '60 caps'],
    ['Aloe Concentrate 1 ltr', 'Aloe Concentrate', '1 ltr'],
  ])('splits %s', (input, name, pack) => {
    expect(splitPackDetail(input)).toEqual({ name, pack });
  });

  it('leaves a name without a pack size alone', () => {
    expect(splitPackDetail('Formula 1 Shake Mix')).toEqual({
      name: 'Formula 1 Shake Mix',
      pack: '',
    });
  });

  it('never returns an empty name', () => {
    expect(splitPackDetail('500 gms')).toEqual({ name: '500 gms', pack: '' });
  });
});
