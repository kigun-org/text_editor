export {};

declare global {
  // eslint-disable-next-line no-var
  var up:
    | {
        Response: new (status: number, text: string) => Error & {
          status: number;
          text: string;
        };
        request: (
          url: string,
          options?: { method?: string; params?: Record<string, string> },
        ) => Promise<void>;
      }
    | undefined;
}
