import {
  firstItemOverMrp,
  itemAmountOverMrp,
  packageTotalOverMrp,
} from '../../utils/packageValidation';

describe('packageValidation', () => {
  it('treats sale price above MRP as invalid', () => {
    expect(itemAmountOverMrp(99, 100)).toBe(false);
    expect(itemAmountOverMrp(100.01, 100)).toBe(true);
    expect(packageTotalOverMrp(301, 300)).toBe(true);
  });

  it('returns the first item that exceeds MRP', () => {
    const mrp = new Map([['X', 50]]);
    expect(firstItemOverMrp([{ itemCode: 'X', itemName: 'Item', amount: 60 }], mrp)).toEqual({
      itemName: 'Item',
      mrp: 50,
    });
  });
});
