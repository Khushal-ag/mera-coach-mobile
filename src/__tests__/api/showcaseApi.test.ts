import { apiFetch, apiGet, apiPost } from '../../api/client';
import { fetchMasterItems } from '../../api/masterApi';
import {
  deletePackage,
  deletePost,
  getMyPackages,
  getMyPosts,
  getPostCategories,
  getProductBrands,
  getProductItems,
  getPublicShowcase,
  savePackage,
  setPackageActive,
} from '../../api/showcaseApi';

jest.mock('../../api/client', () => ({
  apiFetch: jest.fn(),
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}));
jest.mock('../../api/masterApi', () => ({ fetchMasterItems: jest.fn() }));

const mGet = apiGet as jest.Mock;
const mPost = apiPost as jest.Mock;
const mFetch = apiFetch as jest.Mock;
const mMaster = fetchMasterItems as jest.Mock;

beforeEach(() => jest.clearAllMocks());

describe('masters', () => {
  it('reads the rules of a post category from its description', async () => {
    mMaster.mockResolvedValue([
      { itemCode: 'GALLERY', itemName: 'Gallery', description: '' },
      { itemCode: 'SUCCESS', itemName: 'Client Success', description: 'client consent' },
    ]);
    const rules = await getPostCategories();
    expect(mMaster).toHaveBeenCalledWith({ ItemType: 'POSTCATEGORY' });
    expect(rules).toEqual([
      { code: 'GALLERY', label: 'Gallery', requiresClient: false, requiresConsent: false },
      { code: 'SUCCESS', label: 'Client Success', requiresClient: true, requiresConsent: true },
    ]);
  });

  it('maps brands', async () => {
    mMaster.mockResolvedValue([{ itemCode: 'HERBALIFE', itemName: 'Herbalife' }]);
    expect(await getProductBrands()).toEqual([{ code: 'HERBALIFE', label: 'Herbalife' }]);
  });

  it('asks for the products of one brand with price, category and pack size', async () => {
    mGet.mockResolvedValue([
      {
        itemCode: '082K',
        itemName: 'Formula 1 - 500 Gms',
        price: 2179,
        category: 'WEIGHT MANAGEMENT PRODUCTS',
        packSize: '500 Gms',
      },
      { itemCode: 'Y1', itemName: 'Vestige Shake - 500 g', price: 666 },
    ]);
    const items = await getProductItems('HERBALIFE');
    expect(mGet).toHaveBeenCalledWith('/v{version}/Showcase/products', { brandCode: 'HERBALIFE' });
    expect(items).toEqual([
      {
        code: '082K',
        label: 'Formula 1 - 500 Gms',
        price: 2179,
        category: 'WEIGHT MANAGEMENT PRODUCTS',
        packSize: '500 Gms',
      },
      { code: 'Y1', label: 'Vestige Shake - 500 g', price: 666, category: '', packSize: '' },
    ]);
  });

  it('does not call the API without a brand', async () => {
    expect(await getProductItems('')).toEqual([]);
    expect(mGet).not.toHaveBeenCalled();
  });
});

describe('packages', () => {
  const raw = {
    packageId: 7,
    brandCode: 'HERBALIFE',
    brandName: 'Herbalife',
    packageName: 'Starter',
    totalAmount: 2500,
    isActive: false,
    items: [{ itemCode: 'HL_AFRESH', itemName: 'Afresh', amount: 500 }],
  };

  it('maps a package and keeps an inactive one inactive', async () => {
    mGet.mockResolvedValue([raw]);
    const [pkg] = await getMyPackages();
    expect(pkg).toMatchObject({ packageId: 7, totalAmount: 2500, isActive: false });
    expect(pkg!.items[0]).toEqual({ itemCode: 'HL_AFRESH', itemName: 'Afresh', amount: 500 });
  });

  it('treats a package without the flag as active', async () => {
    mGet.mockResolvedValue([{ ...raw, isActive: undefined }]);
    expect((await getMyPackages())[0]!.isActive).toBe(true);
  });

  it('handles an empty list', async () => {
    mGet.mockResolvedValue(null);
    expect(await getMyPackages()).toEqual([]);
  });

  it('saves to the packages endpoint', async () => {
    mPost.mockResolvedValue(raw);
    const input = {
      packageId: 0,
      brandCode: 'HERBALIFE',
      packageName: 'Starter',
      totalAmount: 2500,
      isActive: true,
      items: [{ itemCode: 'HL_AFRESH', itemName: 'Afresh', amount: 500 }],
    };
    await savePackage(input);
    expect(mPost).toHaveBeenCalledWith('/v{version}/Showcase/packages', input);
  });

  it('switches a package on or off', async () => {
    await setPackageActive(7, false);
    expect(mPost).toHaveBeenCalledWith('/v{version}/Showcase/packages/7/active', {
      isActive: false,
    });
  });

  it('deletes with DELETE', async () => {
    await deletePackage(7);
    expect(mFetch).toHaveBeenCalledWith('/v{version}/Showcase/packages/7', { method: 'DELETE' });
  });
});

describe('posts', () => {
  it('maps video and image posts and trims the date', async () => {
    mGet.mockResolvedValue([
      {
        postId: 1,
        categoryCode: 'EVENT',
        title: 'Zumba',
        mediaType: 'video',
        postDate: '2026-10-17T00:00:00',
      },
      { postId: 2, categoryCode: 'GALLERY', title: 'Tag', postDate: '2026-10-15' },
    ]);
    const [video, image] = await getMyPosts();
    expect(video).toMatchObject({ mediaType: 'video', postDate: '2026-10-17' });
    expect(image).toMatchObject({ mediaType: 'image', consentAccepted: false, clientCode: null });
  });

  it('deletes with DELETE', async () => {
    await deletePost(3);
    expect(mFetch).toHaveBeenCalledWith('/v{version}/Showcase/posts/3', { method: 'DELETE' });
  });
});

describe('public showcase', () => {
  it('returns nothing for a missing coach code without calling the API', async () => {
    expect(await getPublicShowcase('')).toEqual({ packages: [], posts: [] });
    expect(mGet).not.toHaveBeenCalled();
  });

  it('maps packages and posts', async () => {
    mGet.mockResolvedValue({
      packages: [{ packageId: 1, packageName: 'P', totalAmount: 10, items: [] }],
      posts: [{ postId: 2, title: 'T', clientName: 'Priya', mediaType: 'image' }],
    });
    const showcase = await getPublicShowcase('rvxdcp');
    expect(mGet).toHaveBeenCalledWith('/v{version}/Showcase/public', { coachCode: 'rvxdcp' });
    expect(showcase.packages[0]).toMatchObject({ packageName: 'P', isActive: true });
    expect(showcase.posts[0]).toMatchObject({ clientName: 'Priya' });
  });

  it('survives an empty body', async () => {
    mGet.mockResolvedValue(null);
    expect(await getPublicShowcase('x')).toEqual({ packages: [], posts: [] });
  });
});
