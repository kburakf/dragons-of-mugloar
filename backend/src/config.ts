import { plainToInstance, Type } from 'class-transformer';
import { IsInt, IsUrl, Max, Min, validateSync } from 'class-validator';
import { listProblems } from './common/validation';

// The settings of the backend. The property names are the environment variable names.
export class AppConfig {
  // An environment variable is a string, so @Type turns it into a number.
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3100;

  @IsUrl({ require_tld: false, require_protocol: true })
  MUGLOAR_BASE_URL: string = 'https://dragonsofmugloar.com/api/v2';

  @IsUrl({ require_tld: false, require_protocol: true })
  FRONTEND_ORIGIN: string = 'http://localhost:5173';
}

// Reads the settings from environment variables. Throws at startup when a value is not valid.
export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  // exposeDefaultValues keeps the default when a variable is not set.
  const config = plainToInstance(AppConfig, env, { exposeDefaultValues: true });
  // whitelist removes every other environment variable from the config.
  const errors = validateSync(config, { whitelist: true });

  if (errors.length > 0) {
    throw new Error(`Invalid environment variables:\n${listProblems(errors).join('\n')}`);
  }

  return config;
}
