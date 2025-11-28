declare module "papaparse" {
  interface ParseResult<T> {
    data: T[];
    errors: any[];
    meta: any;
  }

  interface ParseConfig {
    header?: boolean;
    skipEmptyLines?: boolean;
    [key: string]: any;
  }

  export function parse<T = any>(input: string, config?: ParseConfig): ParseResult<T>;
}
