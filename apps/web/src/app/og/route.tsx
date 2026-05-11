import { getPageTitle, renderOgImage } from "./og-image";

export async function GET() {
  const title = (await getPageTitle(""))!;
  return renderOgImage(title);
}
