export function ConvertObjectInterface<T, U>(
  source: T,
  mapping: { [K in keyof T]?: keyof U }
): U {
  let result = {} as U;

  for (const KEY in mapping) {
    const TARGET_KEY = mapping[KEY];
    if (TARGET_KEY) {
      (result as any)[TARGET_KEY] = (source as any)[KEY];
    }
  }

  return result;
}

export interface FunctionResponse<T> {
  err?: string | Error;
  code?: number;
  message?: string;
  data?: T;
  affected_records_count?: number;
}
