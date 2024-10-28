declare module "anzip" {
  interface Options {
    pattern?: RegExp;
    disableSave?: boolean;
    outputContent?: boolean;
    entryHandler?: Promise<boolean>;
    outputPath?: string;
    flattenPath?: boolean;
    disableOutput?: boolean;
    rules?: Options[];
  }

  interface File {
    name: string;
    directory: string;
    saved: boolean;
    content: Buffer;
    error: Error;
  }

  interface Result {
    duration: number;
    files: File[];
  }

  function anzip(filename: string, opts?: Options): Promise<Result>;

  export = anzip;
}
