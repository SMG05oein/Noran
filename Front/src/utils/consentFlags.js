/** /me 의 *ConsentAgreed: 0=재동의 필요, 1=유효 */
export const needsReconsent = (agreed) => agreed === 0 || agreed === '0';

export const mapConsentFlags = (data = {}) => ({
  privacyConsentAgreed: data.privacyConsentAgreed,
  collectionConsentAgreed: data.collectionConsentAgreed,
  termsConsentAgreed: data.termsConsentAgreed,
});

/** 방금 동의한 타입을 스토어에 반영할 때 사용 */
export const agreedFieldForModalType = (type) => {
  if (type === 'privacy') return 'privacyConsentAgreed';
  if (type === 'consent') return 'collectionConsentAgreed';
  if (type === 'terms') return 'termsConsentAgreed';
  return null;
};
