import { Ad, RawAd } from './mugloar.schemas';

export function decodeBase64(text: string): string {
  return Buffer.from(text, 'base64').toString('utf8');
}

// ROT13 moves each letter 13 places in the alphabet. Other characters stay the same.
export function decodeRot13(text: string): string {
  return text.replace(/[a-z]/gi, (letter) => {
    const start = letter <= 'Z' ? 65 : 97;

    return String.fromCharCode(((letter.charCodeAt(0) - start + 13) % 26) + start);
  });
}

export function decodeAd(raw: RawAd): Ad {
  const decode =
    raw.encrypted === 1 ? decodeBase64 : raw.encrypted === 2 ? decodeRot13 : (text: string) => text;

  return {
    adId: decode(raw.adId),
    message: decode(raw.message),
    reward: raw.reward,
    expiresIn: raw.expiresIn,
    probability: decode(raw.probability),
  };
}
