const routeFile = (pathname: string): string => {
  if (pathname === "/" || pathname === "") return "index.html";
  return (
    pathname.replace(/^\//, "").replace(/\/$/, "") +
    (pathname.endsWith(".html") ? "" : ".html")
  );
};

const dirname = (file: string): string[] => file.split("/").slice(0, -1);

/** Return a file-relative link between pages emitted with Astro's `file` format. */
export const pageHref = (currentPath: string, target: string): string => {
  const from = dirname(routeFile(currentPath));
  const to = routeFile(target).split("/");
  while (from.length && to.length && from[0] === to[0]) {
    from.shift();
    to.shift();
  }
  const result = [...from.map(() => ".."), ...to].join("/");
  return result || to.at(-1) || "index.html";
};

/** Return a file-relative path from a page to an asset at the build root. */
export const rootHref = (currentPath: string, target = ""): string => {
  const prefix =
    dirname(routeFile(currentPath))
      .map(() => "..")
      .join("/") || ".";
  return target ? `${prefix}/${target}` : prefix;
};
