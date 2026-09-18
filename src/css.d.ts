declare module "*.css";

declare module "*.json?url" {
  const src: string;
  export default src;
}
