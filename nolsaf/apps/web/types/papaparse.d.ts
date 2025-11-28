declare module 'papaparse' {
  // Minimal ambient types used by the project. Install @types/papaparse for fuller typings.
  export interface ParseMeta {
    delimiter: string;
    linebreak: string;
    aborted: boolean;
    truncated: boolean;
    cursor: number;
  }

  export interface ParseError {
    type?: string;
    code?: string;
    message?: string;
    row?: number;
  }

  export interface ParseResult<T = any> {
    data: T[];
    errors: ParseError[];
    meta: ParseMeta;
  }

  export interface ParseConfig {
    delimiter?: string;
    newline?: string;
    quoteChar?: string;
    escapeChar?: string;
    header?: boolean;
    dynamicTyping?: boolean | ((field: string) => boolean);
    preview?: number;
    encoding?: string;
    worker?: boolean;
    comments?: boolean | string;
    step?: (results: ParseResult<any>, parser: any) => void;
    complete?: (results: ParseResult<any>) => void;
    error?: (error: ParseError) => void;
    skipEmptyLines?: boolean | 'greedy';
    transform?: (value: string) => any;
  }

  const Papa: {
    parse: (input: File | string | any, config?: ParseConfig) => ParseResult<any> | void;
    unparse: (data: any, config?: any) => string;
  };

  export default Papa;
}
