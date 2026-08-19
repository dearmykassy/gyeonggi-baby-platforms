import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { DRAWER_A11Y_CONTRACT } from "@/components/mobile-drawer";

const root = process.cwd();

function filesBelow(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? filesBelow(path) : [path];
  });
}

describe("navigation and accessibility release contract", () => {
  it("uses SiteLink as the sole next/link import boundary", () => {
    const sourceRoot = resolve(root, "src");
    const directImports: string[] = [];
    for (const path of filesBelow(sourceRoot).filter((file) => /\.[cm]?[jt]sx?$/.test(file))) {
      const sourceText = readFileSync(path, "utf8");
      const sourceFile = ts.createSourceFile(path, sourceText, ts.ScriptTarget.Latest, true);
      const walk = (node: ts.Node) => {
        const importOrExport =
          (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
          node.moduleSpecifier &&
          ts.isStringLiteral(node.moduleSpecifier) &&
          node.moduleSpecifier.text === "next/link";
        const requireOrDynamicImport =
          ts.isCallExpression(node) &&
          node.arguments.length === 1 &&
          ts.isStringLiteral(node.arguments[0]) &&
          node.arguments[0].text === "next/link" &&
          ((ts.isIdentifier(node.expression) && node.expression.text === "require") ||
            node.expression.kind === ts.SyntaxKind.ImportKeyword);
        if (importOrExport || requireOrDynamicImport) directImports.push(relative(root, path));
        ts.forEachChild(node, walk);
      };
      walk(sourceFile);
    }
    expect(directImports).toEqual(["src/components/site-link.tsx"]);
    const boundary = readFileSync(resolve(root, "src/components/site-link.tsx"), "utf8");
    expect(boundary).toContain("prefetch={false}");
  });

  it("keeps the drawer modal, trapped, dismissible and restorative", () => {
    expect(DRAWER_A11Y_CONTRACT).toEqual({
      modal: true,
      focusTrap: true,
      escapeClose: true,
      restoreFocus: true,
      bodyLock: true,
      inertBackground: true,
    });
    const source = readFileSync(resolve(root, "src/components/mobile-drawer.tsx"), "utf8");
    expect(source).toContain('aria-modal="true"');
    expect(source).toContain("aria-expanded={open}");
    expect(source).toContain('setAttribute("inert", "")');
    expect(source).toContain('event.key === "Escape"');
    expect(source).toContain('document.body.style.overflow = "hidden"');
    expect(source).toContain("const trigger = openButtonRef.current");
    expect(source).toContain("trigger?.focus()");
  });

  it("includes safe-area, scroll offset and reduced-motion controls", () => {
    const css = readFileSync(resolve(root, "src/app/globals.css"), "utf8");
    expect(css).toContain("scroll-padding-top");
    expect(css).toContain("env(safe-area-inset-bottom)");
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css.match(/width:\s*44px/g)?.length ?? 0).toBeGreaterThanOrEqual(6);
    expect(css.match(/min-height:\s*44px/g)?.length ?? 0).toBeGreaterThanOrEqual(8);
    const carousel = readFileSync(resolve(root, "src/components/hero-carousel.tsx"), "utf8");
    expect(carousel).toContain('matchMedia("(prefers-reduced-motion: reduce)")');
    expect(carousel).toContain("자동 전환 일시정지");
  });
});
