import { loadConfig } from './config';

describe('loadConfig', () => {
  it('uses the defaults when no variable is set', () => {
    expect(loadConfig({})).toEqual({
      PORT: 3100,
      MUGLOAR_BASE_URL: 'https://dragonsofmugloar.com/api/v2',
      FRONTEND_ORIGIN: 'http://localhost:5173',
    });
  });

  it('reads the variables', () => {
    expect(loadConfig({ PORT: '8080' }).PORT).toBe(8080);
  });

  it('throws for an invalid value', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow('Invalid environment variables');
    expect(() => loadConfig({ FRONTEND_ORIGIN: 'not a url' })).toThrow();
  });
});
