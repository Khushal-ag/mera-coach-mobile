import { MAX_PACKAGES } from '../api/showcaseApi';

export function shouldShowPackagesSubtitle(hasBrand: boolean, packageCount: number): boolean {
  return hasBrand || packageCount > 0;
}

export type PackagesEmptyStateCopy = {
  title: string;
  message: string;
  actionLabel: string;
};

export function getPackagesEmptyStateCopy(
  hasBrand: boolean,
  brandName: string,
): PackagesEmptyStateCopy {
  if (!hasBrand) {
    return {
      title: 'Add a product brand',
      message:
        'Choose your brand under Professional details in Edit profile. Then you can bundle products into packages for your public page.',
      actionLabel: 'Go to Professional details',
    };
  }
  const brand = brandName.trim() || 'your brand';
  return {
    title: 'No packages yet',
    message: `Bundle ${brand} products into one offer with a single price on your public profile.`,
    actionLabel: 'Create your first package',
  };
}

export function packagesPageSubtitle(maxPackages = MAX_PACKAGES): string {
  return `Up to ${maxPackages} packages on your public profile.`;
}
