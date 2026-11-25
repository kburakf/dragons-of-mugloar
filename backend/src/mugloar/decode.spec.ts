import { decodeAd, decodeBase64, decodeRot13 } from './decode';
import { RawAd } from './mugloar.schemas';

const plainAd = {
  adId: 'k3PD1l7I',
  message: 'Help Anna to fix their sheep',
  probability: 'Piece of cake',
};

function toBase64(text: string): string {
  return Buffer.from(text, 'utf8').toString('base64');
}

describe('decodeBase64', () => {
  it('decodes base64 text', () => {
    expect(decodeBase64('SGVsbG8=')).toBe('Hello');
  });
});

describe('decodeRot13', () => {
  it('moves letters 13 places and keeps other characters', () => {
    expect(decodeRot13('Uryyb, Jbeyq! 123')).toBe('Hello, World! 123');
  });

  it('gives the original text when used two times', () => {
    expect(decodeRot13(decodeRot13('Piece of cake'))).toBe('Piece of cake');
  });
});

describe('decodeAd', () => {
  it('returns a plain ad without changes', () => {
    const raw: RawAd = { ...plainAd, reward: 10, expiresIn: 7, encrypted: null };

    expect(decodeAd(raw)).toEqual({ ...plainAd, reward: 10, expiresIn: 7 });
  });

  it('decodes an ad with encrypted = 1 (base64)', () => {
    const raw: RawAd = {
      adId: toBase64(plainAd.adId),
      message: toBase64(plainAd.message),
      probability: toBase64(plainAd.probability),
      reward: 10,
      expiresIn: 7,
      encrypted: 1,
    };

    expect(decodeAd(raw)).toEqual({ ...plainAd, reward: 10, expiresIn: 7 });
  });

  it('decodes an ad with encrypted = 2 (ROT13)', () => {
    const raw: RawAd = {
      adId: decodeRot13(plainAd.adId),
      message: decodeRot13(plainAd.message),
      probability: decodeRot13(plainAd.probability),
      reward: 10,
      expiresIn: 7,
      encrypted: 2,
    };

    expect(decodeAd(raw)).toEqual({ ...plainAd, reward: 10, expiresIn: 7 });
  });
});
