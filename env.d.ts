/// <reference types="vite/client" />

// Standard TypeScript-based tools need a fallback because they cannot inspect Vue SFC types.
declare module "*.vue" {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const component: import("vue").DefineComponent<any>;
  export default component;
}
